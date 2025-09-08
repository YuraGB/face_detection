import socketio
import eventlet
import base64
import cv2
import numpy as np
import time
import signal
import sys

# --- Socket.IO server ---
sio = socketio.Server(cors_allowed_origins="*")
app = socketio.WSGIApp(sio)

# --- OpenCV DNN ---
PROTOTXT_PATH = "deploy.prototxt.txt"
MODEL_PATH = "res10_300x300_ssd_iter_140000.caffemodel"
net = cv2.dnn.readNetFromCaffe(PROTOTXT_PATH, MODEL_PATH)

CONFIDENCE_THRESHOLD = 0.8
MIN_FACE_SIZE = 30
FPS = 20
PROCESS_WIDTH = 320   # ширина для обробки
PROCESS_HEIGHT = 240  # висота для обробки

last_sent = {}

@sio.event
def connect(sid, environ):
    print("✅ Client connected:", sid)

@sio.on("frame")
def handle_frame(sid, data):
    now = time.time() * 1000
    if sid in last_sent and now - last_sent[sid] < 1000 / FPS:
        return
    last_sent[sid] = now

    try:
        # Decode base64
        if "," in data:
            img_data = base64.b64decode(data.split(",")[1])
        else:
            img_data = base64.b64decode(data)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return

        # Resize once for processing
        small_frame = cv2.resize(frame, (PROCESS_WIDTH, PROCESS_HEIGHT))

        # CLAHE only на маленькому кадрі
        gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced_gray = clahe.apply(gray)
        processed_frame = cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2BGR)

        # DNN detection
        blob = cv2.dnn.blobFromImage(processed_frame, 1.0, (300, 300), (104.0, 177.0, 123.0))
        net.setInput(blob)
        detections = net.forward()

        faces = []
        h, w = processed_frame.shape[:2]
        for i in range(detections.shape[2]):
            confidence = float(detections[0, 0, i, 2])
            if confidence < CONFIDENCE_THRESHOLD:
                continue

            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            x1, y1, x2, y2 = box.astype(int)
            if (x2 - x1) < MIN_FACE_SIZE or (y2 - y1) < MIN_FACE_SIZE:
                continue

            # Scale to original frame
            scale_x = frame.shape[1] / w
            scale_y = frame.shape[0] / h
            x1 = int(x1 * scale_x)
            y1 = int(y1 * scale_y)
            x2 = int(x2 * scale_x)
            y2 = int(y2 * scale_y)

            faces.append([x1, y1, x2, y2, 0])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 1)

        # Emit original frame with rectangles
        _, buffer = cv2.imencode(".jpg", frame)
        frame_base64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")
        sio.emit("camera-frame", frame_base64, to=sid)
        sio.emit("faces", faces, to=sid)

    except Exception as e:
        print("❌ Error processing frame:", e)

@sio.event
def disconnect(sid):
    print("❌ Client disconnected:", sid)

def shutdown(*args):
    print("🛑 Shutting down server...")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("🚀 Python DNN face server running on port 5000...")
    eventlet.wsgi.server(eventlet.listen(('', 5000)), app)

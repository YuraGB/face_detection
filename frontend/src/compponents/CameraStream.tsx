import { useCameraStream } from "./CameraComponent/useCameraStream";

export default function CameraStream() {
  const {cameraOn, stopCamera, startCamera, canvasRef} = useCameraStream();

  return (
    <div style={{ textAlign: "center", margin: "40px" }}>
      <h2>📷 Камера</h2>
      <div>
      <button onClick={cameraOn ? stopCamera : startCamera}>
        {cameraOn ? "Вимкнути камеру" : "Увімкнути камеру"}
      </button>
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ border: "1px solid #333", marginTop: "10px" }}
      />
    </div>
  );
}

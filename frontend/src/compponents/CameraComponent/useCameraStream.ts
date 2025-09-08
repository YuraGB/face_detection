import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const useCameraStream = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopId = useRef<number | null>(null);
  const facesRef = useRef<number[][]>([]);

  const [cameraOn, setCameraOn] = useState(false);

  // --- Socket.IO ---
  useEffect(() => {
    socket = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnectionAttempts: 3,
    });

    socket.on("camera-frame", (frameBase64: string) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        facesRef.current.forEach(([x1, y1, x2, y2, recognized]) => {
          ctx.strokeStyle = recognized ? "lime" : "transparent";
          ctx.lineWidth = 2;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        });
      };
      img.src = frameBase64;
    });

    socket.on("faces", (faces: number[][]) => {
      facesRef.current = faces;
    });

    socket.on("connect", () => console.log("✅ Connected to server"));
    socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
      stopCamera();
      setCameraOn(false);
    });
    socket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message);
      stopCamera();
      setCameraOn(false);
    });

    return () => {
      socket?.disconnect();
      stopCamera();
    };
  }, []);

  // --- Відправка кадрів ---
  const startCamera = async () => {
    if (cameraOn) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      const video = document.createElement("video");
      videoRef.current = video;
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");

      const fps = 20; // обмеження в частоті
      let lastSent = 0;

      const loop = (time: number) => {
        if (!videoRef.current || !streamRef.current || !socket) return;

        if (time - lastSent > 1000 / fps) {
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL("image/jpeg", 0.5);
            socket.emit("frame", base64);
          }
          lastSent = time;
        }
        loopId.current = requestAnimationFrame(loop);
      };
      loopId.current = requestAnimationFrame(loop);

      setCameraOn(true);
      console.log("📷 Camera started:", stream.getTracks());
    } catch (err) {
      console.error("❌ Failed to start camera:", err);
    }
  };

  const stopCamera = () => {
    console.log("🛑 Stopping camera...");
    if (loopId.current) {
      cancelAnimationFrame(loopId.current);
      loopId.current = null;
    }
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((track) => {
          console.log("🎬 Track stopped:", track.label);
          track.stop();
        });
      }
      videoRef.current.srcObject = null;
      videoRef.current = null;
      streamRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setCameraOn(false);
    navigator.mediaDevices.enumerateDevices().then((devs) =>
      console.log("📋 Devices after stop:", devs)
    );
  };

  return {
    cameraOn, stopCamera, startCamera, canvasRef
  }
}

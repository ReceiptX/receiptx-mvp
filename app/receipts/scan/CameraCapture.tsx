"use client";
import { useState, useRef } from "react";

export default function CameraCapture({ onPhotoUpload }: { onPhotoUpload?: (data: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Open camera
  const openCamera = async () => {
    setIsCameraOpen(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  };

  // Capture image
  const takePhoto = () => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/png");
    setPhoto(dataURL);
  };

  // Upload photo to API endpoint
  const uploadPhoto = async () => {
    if (!photo) return;
    setUploading(true);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({ image: photo }),
      headers: { "Content-Type": "application/json" },
    });
    setUploading(false);
    const data = await res.json();
    if (onPhotoUpload) onPhotoUpload(photo);
    alert("Uploaded!");
    console.log(data);
  };

  return (
    <div className="text-white">
      {!isCameraOpen && (
        <button onClick={openCamera} className="btn">
          Open Camera
        </button>
      )}
      {isCameraOpen && !photo && (
        <>
          <video ref={videoRef} className="w-full rounded-xl" />
          <button onClick={takePhoto} className="btn mt-2">
            Take Picture
          </button>
        </>
      )}
      {photo && (
        <>
          <img src={photo} alt="Receipt photo preview" className="w-full rounded-xl mt-5" />
          <button onClick={uploadPhoto} className="btn mt-2" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Receipt"}
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
    </div>
  );
}

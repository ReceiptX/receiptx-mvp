"use client";
import { useState, useRef, useEffect } from "react";

export default function CameraCapture({ onPhotoUpload }: { onPhotoUpload?: (data: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
    }
  }, []);

  // Open camera
  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          // ignore play errors
        }
      }
    } catch (err) {
      console.error("openCamera error:", err);
      setIsCameraOpen(false);
      alert("Unable to open camera. Please use Upload if this persists.");
    }
  };

  // Capture image
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      console.warn("Camera refs not ready when attempting to capture photo");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("2d context unavailable for receipt capture canvas");
      return;
    }

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
        <button
          onClick={openCamera}
          className="w-full flex items-center justify-between bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-semibold rounded-2xl px-6 py-5 shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all"
        >
          <div className="flex flex-col text-left">
            <span className="text-lg font-bold">Open Camera</span>
            <span className="text-sm opacity-80 -mt-1">Take a photo of your receipt</span>
          </div>

          <div className="bg-white/20 p-3 rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-7 h-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 9.75h1.5m-1.5 4.5h1.5m-6-12h9l1.286 2.572A0.75.75 0 0117.25 6h1a3.75 3.75 0 013.75 3.75v7.5A3.75 3.75 0 0118.25 21H5.75A3.75 3.75 0 012 17.25v-7.5A3.75 3.75 0 015.75 6h1a0.75.75 0 01.664-.428L8.7 3.75z"
              />
            </svg>
          </div>
        </button>
      )}
      {/* Fallback file input for environments that block camera (in-app browsers) */}
      <label className="mt-2 inline-block">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              setPhoto(result);
              if (onPhotoUpload) onPhotoUpload(result);
            };
            reader.readAsDataURL(f);
          }}
        />
        <span className="btn ml-2">Upload Photo</span>
      </label>
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
        </>
      )}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}

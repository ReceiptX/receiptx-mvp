import React, { useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, disabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Unable to access camera.");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setShowCamera(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
          stopCamera();
        }
      }, "image/jpeg", 0.95);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {!showCamera && (
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 text-white font-bold shadow hover:scale-105 transition"
          onClick={startCamera}
          disabled={disabled}
        >
          Take Photo
        </button>
      )}
      {showCamera && (
        <div className="flex flex-col items-center gap-2 w-full">
          <video ref={videoRef} autoPlay playsInline className="rounded-lg w-full max-w-xs border border-cyan-700/30" />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-bold shadow hover:scale-105 transition"
              onClick={handleCapture}
            >
              Capture
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-500 text-white font-bold shadow hover:scale-105 transition"
              onClick={stopCamera}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default CameraCapture;

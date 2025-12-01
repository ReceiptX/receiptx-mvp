import React, { useRef, useState } from "react";

interface CameraCaptureProps {
  onCapture?: (file: File) => void;
  // legacy handler used by some pages that expect a base64 data URL
  onPhotoUpload?: (dataUrl: string) => void;
  disabled?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onPhotoUpload, disabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera not supported in this browser. Use the Upload option instead.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Some browsers require an explicit play() call
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await videoRef.current.play();
        } catch (playErr) {
          // Non-fatal: video may auto-play after permission; ignore play errors
        }
      }
    } catch (err) {
      // Provide more helpful diagnostics
      const message = (err as any)?.name || (err as any)?.message || String(err);
      setError("Unable to access camera. " + message + " — try using the Upload option if this persists.");
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
      // Create both a File and a data URL so callers can use either
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
          // Call file-based handler if provided
          if (onCapture) onCapture(file);
          // Also call legacy data-URL handler if provided
          if (onPhotoUpload) {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = String(reader.result || "");
              onPhotoUpload(dataUrl);
            };
            reader.readAsDataURL(blob);
          }
          stopCamera();
        }
      }, "image/jpeg", 0.95);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {!showCamera && (
        <>
          {/* Primary Camera Button */}
          <button
            type="button"
            className="telegram-scan-button px-8 py-4 rounded-xl text-white font-bold shadow hover:scale-105 transition w-full max-w-xs"
            onClick={startCamera}
            disabled={disabled}
          >
            📸 Take Photo
          </button>
          
          {/* Fallback Upload Button for Telegram/in-app browsers */}
          <label className="w-full max-w-xs text-center">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) {
                  if (onCapture) onCapture(f);
                  if (onPhotoUpload) {
                    const reader = new FileReader();
                    reader.onload = () => onPhotoUpload(String(reader.result || ""));
                    reader.readAsDataURL(f);
                  }
                }
              }}
            />
            <span className="inline-block px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm cursor-pointer w-full transition">
              📁 Or Upload Photo
            </span>
          </label>
        </>
      )}
      
      {showCamera && (
        <div className="flex flex-col items-center gap-3 w-full">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="rounded-lg w-full max-w-md border-2 border-cyan-400/50 shadow-lg" 
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          
          {/* Camera Control Buttons */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold shadow-lg hover:scale-105 transition flex items-center gap-2"
              onClick={handleCapture}
            >
              📷 Capture
            </button>
            <button
              type="button"
              className="px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-bold shadow-lg hover:scale-105 transition"
              onClick={stopCamera}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mt-2 w-full max-w-xs">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;

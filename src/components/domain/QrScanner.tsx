import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Badge } from "../ui/Badge";

type CameraState = "off" | "starting" | "on" | "error";

/**
 * Camera viewfinder that reads the gym QR code with jsQR.
 * Cameras only work on https or localhost; if the browser blocks it, members type the code instead.
 */
export function QrScanner({ onCode, busy }: { onCode: (code: string) => void; busy?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const lastCode = useRef<{ code: string; at: number } | null>(null);
  const [state, setState] = useState<CameraState>("off");
  const [error, setError] = useState<string | null>(null);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("off");
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("This browser can't open the camera here. Type the code instead.");
      return;
    }
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("on");
    } catch (err) {
      setState("error");
      const name = (err as DOMException).name;
      setError(
        name === "NotAllowedError"
          ? "Camera permission was blocked. Allow it in your browser settings, or type the code instead."
          : name === "NotFoundError"
            ? "No camera found on this device. Type the code instead."
            : "Couldn't start the camera. Type the code instead.",
      );
    }
  }

  // Read a frame about four times a second while the camera is on
  useEffect(() => {
    if (state !== "on") return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || busyRef.current) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      const scale = Math.min(1, 640 / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
      const code = result?.data?.trim();
      if (!code) return;
      // Ignore the same code for a few seconds so one scan isn't sent twice
      const now = Date.now();
      if (lastCode.current && lastCode.current.code === code && now - lastCode.current.at < 5000) return;
      lastCode.current = { code, at: now };
      onCodeRef.current(code);
    }, 250);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-navy sm:aspect-[16/10]">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Camera viewfinder"
          className={state === "on" ? "absolute inset-0 h-full w-full object-cover" : "hidden"}
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {/* Corner brackets + scan line */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-[14%] rounded-[18px]">
          {["top-0 left-0 border-t-4 border-l-4 rounded-tl-[18px]", "top-0 right-0 border-t-4 border-r-4 rounded-tr-[18px]", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[18px]", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-[18px]"].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-orange ${c}`} />
          ))}
          {state === "on" && (
            <span className="animate-scan-line absolute inset-x-3 h-0.5 rounded-full bg-orange shadow-[0_0_12px_var(--color-orange)]" />
          )}
        </div>

        {state !== "on" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="m-0 max-w-[260px] text-[14px] text-on-navy">Point your camera at the QR code by the gym door.</p>
            <Button pulse icon="camera" onClick={start} loading={state === "starting"}>
              {state === "error" ? "Try the camera again" : "Start camera"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-7 flex-wrap items-center justify-between gap-3">
        {state === "on" ? (
          <>
            <Badge tone="success" live>
              Camera on
            </Badge>
            <Button variant="ghost" size="sm" icon="close" onClick={stop}>
              Stop camera
            </Button>
          </>
        ) : error ? (
          <p role="alert" className="m-0 flex items-start gap-2 text-[13px] font-semibold text-danger-text">
            <Icon name="alert" size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : (
          <p className="m-0 text-[13px] text-muted">Your browser will ask to use the camera.</p>
        )}
      </div>
    </div>
  );
}

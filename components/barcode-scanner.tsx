"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Clock,
  Flashlight,
  FlashlightOff,
  Volume2,
  VolumeX,
  X,
  Zap,
  ScanLine,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────
export type BarcodeScanResult = {
  text: string;
  format: string;
  rawText: string;
};

type BarcodeScannerProps = {
  /** Called when a barcode is successfully decoded */
  onScan: (result: BarcodeScanResult) => void;
  /** Whether to keep scanning after a successful decode (for rapid billing) */
  continuousMode?: boolean;
  /** Auto-close scanner after this many seconds (0 = no timeout) */
  timeoutSeconds?: number;
  /** Called when the scanner is closed/stopped */
  onClose?: () => void;
  /** Whether to render as fullscreen overlay on mobile */
  fullscreenMobile?: boolean;
  /** Extra CSS class on the root container */
  className?: string;
};

// ─── Barcode normalization helpers ───────────────────────────
function normalizeBarcode(raw: string): string {
  // Trim whitespace, remove non-printable chars
  let code = raw.trim().replace(/[^\x20-\x7E]/g, "");
  // Remove GS1 FNC1/group separator chars
  code = code.replace(/[\x1d\x1e]/g, "");
  return code;
}

// ─── Audio beep via Web Audio API ────────────────────────────
let audioCtx: AudioContext | null = null;
function playBeep() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 1800;
    osc.type = "square";
    gain.gain.value = 0.08;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    /* audio not available */
  }
}

// ─── ZXing reader factory — fresh instance each time ─────────
async function createReader() {
  const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
    await Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]);

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.ITF,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  return { reader: new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 }), BarcodeFormat };
}

// ─── Camera constraint builder with fallback chain ───────────
function buildConstraints(attempt: number): MediaStreamConstraints {
  switch (attempt) {
    case 0:
      // Best: high-res, rear camera, continuous autofocus
      return {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          // @ts-expect-error — focusMode is valid but not in TS types
          focusMode: { ideal: "continuous" },
        },
        audio: false,
      };
    case 1:
      // Fallback: medium res rear camera
      return {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
    case 2:
      // Last resort: any camera
      return { video: true, audio: false };
    default:
      return { video: true, audio: false };
  }
}

// ─── Component ───────────────────────────────────────────────
export function BarcodeScanner({
  onScan,
  continuousMode = false,
  timeoutSeconds = 60,
  onClose,
  fullscreenMobile = true,
  className = "",
}: BarcodeScannerProps) {
  const [status, setStatus] = useState("Initializing camera...");
  const [countdown, setCountdown] = useState(timeoutSeconds);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [lastCode, setLastCode] = useState("");
  const [paused, setPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const brightnessRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScanTimeRef = useRef(0);
  const mountedRef = useRef(true);
  const pausedRef = useRef(false);

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // ─── Cleanup everything ────────────────────────────────────
  const cleanup = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch { /* ignore */ }
      controlsRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (brightnessRef.current) {
      clearInterval(brightnessRef.current);
      brightnessRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // ─── Torch toggle ─────────────────────────────────────────
  const toggleTorch = useCallback(
    async (forceState?: boolean) => {
      try {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        const next = forceState ?? !torchEnabled;
        await track.applyConstraints({ advanced: [{ torch: next } as any] });
        setTorchEnabled(next);
      } catch {
        /* not supported */
      }
    },
    [torchEnabled]
  );

  // ─── Brightness auto-torch ─────────────────────────────────
  const startBrightnessDetection = useCallback(() => {
    if (brightnessRef.current) clearInterval(brightnessRef.current);
    brightnessRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0) return;
      const canvas = canvasRef.current;
      const w = 64,
        h = 48;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let luminance = 0;
      for (let i = 0; i < data.length; i += 4) {
        luminance += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }
      const avg = luminance / (w * h);
      if (avg < 45 && torchSupported) {
        toggleTorch(true);
        toast.info("🔦 Low light — flash enabled", { duration: 2000, id: "torch-auto" });
      }
    }, 3000);
  }, [torchSupported, toggleTorch]);

  // ─── Handle decoded barcode ────────────────────────────────
  const handleDecode = useCallback(
    (rawText: string, format: string) => {
      // Prevent duplicate scans within 1.5s
      const now = Date.now();
      if (now - lastScanTimeRef.current < 1500) return;
      if (pausedRef.current) return;

      const text = normalizeBarcode(rawText);
      if (!text || text.length < 3) return;

      lastScanTimeRef.current = now;
      setLastCode(text);
      setScanCount((c) => c + 1);

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      // Audio feedback
      if (soundEnabled) playBeep();

      onScan({ text, format, rawText });

      if (!continuousMode) {
        // Single scan mode — close scanner after decode
        cleanup();
        onClose?.();
      } else {
        // Continuous mode — brief pause then resume
        setPaused(true);
        setStatus(`✅ Scanned: ${text}`);
        setTimeout(() => {
          if (mountedRef.current) {
            setPaused(false);
            setStatus("📷 Ready — point at next barcode...");
          }
        }, 1200);
      }
    },
    [onScan, continuousMode, soundEnabled, cleanup, onClose]
  );

  // ─── Start scanner ─────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function init() {
      setStatus("Starting camera...");

      // 1. Acquire camera stream with fallback chain
      let stream: MediaStream | null = null;
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(
            buildConstraints(attempt)
          );
          break;
        } catch (err) {
          if (attempt === 2) {
            const msg =
              (err as Error)?.message?.toLowerCase() ?? "";
            if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
              toast.error("Camera permission denied. Allow camera access in browser settings.");
            } else if (msg.includes("notfound") || msg.includes("no video")) {
              toast.error("No camera found on this device.");
            } else {
              toast.error("Camera error. Try manual barcode entry.");
            }
            onClose?.();
            return;
          }
        }
      }

      if (cancelled || !stream || !mountedRef.current) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      // 2. Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* autoplay may fail silently */
        }
      }

      // 3. Check torch capability
      try {
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as any;
        if (caps?.torch) {
          setTorchSupported(true);
          startBrightnessDetection();
        }
      } catch {
        /* ignore */
      }

      // 4. Create ZXing reader and start decoding
      try {
        const { reader, BarcodeFormat } = await createReader();
        if (cancelled || !mountedRef.current) return;

        setStatus("📷 Point camera at barcode...");

        const controls = await reader.decodeFromVideoElement(
          videoRef.current!,
          (result: any, error: any) => {
            if (result) {
              const code = result.getText();
              const fmt = result.getBarcodeFormat?.()?.toString() ?? "UNKNOWN";
              if (code) handleDecode(code, fmt);
            }
            // ZXing fires errors for every frame without a barcode — ignore them
          }
        );

        if (cancelled || !mountedRef.current) {
          try { controls.stop(); } catch { /* ignore */ }
          return;
        }
        controlsRef.current = controls;
      } catch (err) {
        console.error("ZXing init failed:", err);
        toast.error("Barcode reader failed to initialize. Try manual entry.");
        cleanup();
        onClose?.();
        return;
      }

      // 5. Start countdown timer
      if (timeoutSeconds > 0) {
        setCountdown(timeoutSeconds);
        countdownRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              cleanup();
              toast.info("⏱️ Scanner timed out. Try manual barcode entry.", {
                duration: 4000,
              });
              onClose?.();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    init();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Close handler ─────────────────────────────────────────
  function handleClose() {
    cleanup();
    onClose?.();
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <div
      className={`barcode-scanner-root ${
        fullscreenMobile ? "barcode-scanner-fullscreen-mobile" : ""
      } ${className}`}
    >
      <div className="relative overflow-hidden rounded-xl bg-slate-900 shadow-2xl">
        {/* Video feed */}
        <video
          ref={videoRef}
          className="barcode-scanner-video"
          muted
          autoPlay
          playsInline
        />

        {/* Scanning overlay with animated viewfinder */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dark overlay outside viewfinder */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Viewfinder cutout */}
          <div className="barcode-viewfinder relative z-10">
            {/* Corner marks */}
            <div className="absolute left-0 top-0 h-7 w-7 border-l-3 border-t-3 border-green-400 rounded-tl-lg" />
            <div className="absolute right-0 top-0 h-7 w-7 border-r-3 border-t-3 border-green-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 h-7 w-7 border-b-3 border-l-3 border-green-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 h-7 w-7 border-b-3 border-r-3 border-green-400 rounded-br-lg" />

            {/* Animated scan line */}
            <div className="barcode-scan-line" />

            {/* Paused overlay */}
            {paused && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg backdrop-blur-[1px]">
                <span className="rounded-full bg-green-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg animate-pulse">
                  ✅ Scanned!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top bar — scan count + close */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            {scanCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-500/90 px-2.5 py-0.5 text-xs font-bold text-white shadow">
                <Zap className="h-3 w-3" />
                {scanCount} scanned
              </span>
            )}
            {continuousMode && (
              <span className="rounded-full bg-blue-500/80 px-2 py-0.5 text-[10px] font-bold text-white">
                CONTINUOUS
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25 active:scale-95 transition-all"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bottom bar — status + controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {/* Status text */}
          <div className="mb-2.5">
            <p className="text-sm font-semibold text-white truncate">{status}</p>
            {lastCode && (
              <p className="text-xs text-white/60 font-mono truncate mt-0.5">
                Last: {lastCode}
              </p>
            )}
            <p className="text-[10px] text-white/40 mt-0.5">
              Hold steady • Good lighting helps • Works with EAN-13, QR, Code-128
            </p>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Torch toggle */}
              {torchSupported && (
                <button
                  onClick={() => toggleTorch()}
                  className={`rounded-full p-2.5 transition-all active:scale-95 ${
                    torchEnabled
                      ? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                  aria-label={torchEnabled ? "Turn off flash" : "Turn on flash"}
                >
                  {torchEnabled ? (
                    <FlashlightOff className="h-4 w-4" />
                  ) : (
                    <Flashlight className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Sound toggle */}
              <button
                onClick={() => setSoundEnabled((s) => !s)}
                className={`rounded-full p-2.5 transition-all active:scale-95 ${
                  soundEnabled
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-red-500/30 text-red-300"
                }`}
                aria-label={soundEnabled ? "Mute scan sound" : "Enable scan sound"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Countdown + Stop */}
            <div className="flex items-center gap-2">
              {timeoutSeconds > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-mono text-white backdrop-blur-sm">
                  <Clock className="h-3 w-3" />
                  {countdown}s
                </span>
              )}
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 rounded-full bg-red-500/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-red-600 active:scale-95 transition-all"
              >
                <CameraOff className="h-3.5 w-3.5" />
                {continuousMode ? "Done" : "Stop"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden canvas for brightness detection */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

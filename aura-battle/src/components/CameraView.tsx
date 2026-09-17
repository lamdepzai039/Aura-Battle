import { forwardRef, useEffect, useState } from 'react';
import type { CameraStatus } from '../game/useAuraMatch';

interface CameraViewProps {
  status: CameraStatus;
  onEnable: () => void;
  onVideoReady?: (video: HTMLVideoElement) => void;
  splitView?: boolean;
  children?: React.ReactNode;
}

const STATUS_MESSAGES: Record<CameraStatus, { title: string; body: string; cta: string } | null> = {
  idle: null,
  requesting: null,
  granted: null,
  denied: {
    title: 'Camera permission is required for Aura Battle.',
    body: "You'll need to allow camera access in your browser to battle.",
    cta: 'TRY AGAIN',
  },
  unavailable: {
    title: 'No camera found.',
    body: 'We couldn\u2019t detect a camera on this device or browser.',
    cta: 'TRY AGAIN',
  },
  occupied: {
    title: 'Camera is already in use.',
    body: 'Close any other app or tab using your camera, then try again.',
    cta: 'TRY AGAIN',
  },
};

export const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(function CameraView(
  { status, onEnable, onVideoReady, splitView, children },
  ref,
) {
  const errorInfo = STATUS_MESSAGES[status];
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    const video = (ref as React.RefObject<HTMLVideoElement>).current;
    if (!video) return;
    onVideoReady?.(video);
    const onPlay = () => setHasFrame(true);
    const onFrame = () => setHasFrame(true);
    video.addEventListener('playing', onPlay);
    video.addEventListener('loadeddata', onFrame);
    video.addEventListener('canplay', onFrame);
    if (video.readyState >= 2) setHasFrame(true);
    return () => {
      video.removeEventListener('playing', onPlay);
      video.removeEventListener('loadeddata', onFrame);
      video.removeEventListener('canplay', onFrame);
    };
  }, [onVideoReady, ref, status]);

  return (
    <div className="relative w-full aspect-video max-h-[70vh] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-[0_0_60px_-15px_rgba(77,250,255,0.35)]">
      <video
        ref={ref}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />
      {status === 'granted' && !hasFrame && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b1118]/88 text-center px-6">
          <p className="font-display text-sm text-white">WAITING FOR CAMERA FRAME</p>
          <p className="text-xs text-white/55 max-w-sm">Camera permission is granted, but the browser has not delivered a video frame yet.</p>
          <button onClick={onEnable} className="px-5 py-2 rounded-full bg-white text-black font-display text-xs tracking-wide">RETRY CAMERA</button>
        </div>
      )}
      {splitView && status === 'granted' && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-cyan-300/60 to-transparent" />
      )}
      {children}

      {(status === 'idle' || status === 'requesting') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 text-center px-6">
          <p className="font-display text-xl text-white">CAMERA REQUIRED</p>
          <p className="text-sm text-white/60 max-w-sm">
            Your camera is processed locally whenever possible.
          </p>
          <button
            onClick={onEnable}
            disabled={status === 'requesting'}
            className="mt-2 px-6 py-3 rounded-full bg-cyan-400 text-black font-display text-sm tracking-wide hover:bg-cyan-300 transition disabled:opacity-60"
          >
            {status === 'requesting' ? 'REQUESTING…' : 'ENABLE CAMERA'}
          </button>
        </div>
      )}

      {errorInfo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 text-center px-6">
          <p className="font-display text-lg text-pink-300">{errorInfo.title}</p>
          <p className="text-sm text-white/60 max-w-sm">{errorInfo.body}</p>
          <button
            onClick={onEnable}
            className="mt-2 px-6 py-3 rounded-full bg-white text-black font-display text-sm tracking-wide hover:bg-white/90 transition"
          >
            {errorInfo.cta}
          </button>
        </div>
      )}
    </div>
  );
});

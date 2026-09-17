import type { PlayerId } from '../game/types';
import type { TrackerLoadProgress } from '../vision/tracker';

export function DebugPanel({
  fps,
  trackerStatus,
  roundIndex,
  totalRounds,
  challengeId,
  onForceWin,
  onSkipRound,
  onClose,
}: {
  fps: number;
  trackerStatus: TrackerLoadProgress;
  roundIndex: number;
  totalRounds: number;
  challengeId: string;
  onForceWin: (p: PlayerId) => void;
  onSkipRound: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-3 right-3 z-50 w-64 rounded-xl border border-white/15 bg-black/85 backdrop-blur p-3 text-[11px] font-mono text-white/80 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-cyan-300">DEBUG</span>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          ✕
        </button>
      </div>
      <div>FPS: {fps}</div>
      <div>
        Pose: {trackerStatus.pose} · Hand: {trackerStatus.hand} · Face: {trackerStatus.face}
      </div>
      <div>
        Round: {roundIndex + 1}/{totalRounds} ({challengeId})
      </div>
      <div className="flex gap-1 pt-1">
        <button onClick={() => onForceWin('p1')} className="flex-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20">
          FORCE WIN P1
        </button>
        <button onClick={() => onForceWin('p2')} className="flex-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20">
          FORCE WIN P2
        </button>
      </div>
      <button onClick={onSkipRound} className="w-full rounded bg-white/10 px-2 py-1 hover:bg-white/20">
        SKIP TO NEXT ROUND
      </button>
    </div>
  );
}

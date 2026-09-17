import type { GameMode } from '../game/types';

export function ModeSelect({ onSelect, onBack }: { onSelect: (mode: GameMode) => void; onBack: () => void }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center gap-4">
      <p className="font-display text-xs tracking-[0.3em] text-white/50 mb-2">SELECT MODE</p>

      <ModeCard
        title="LOCAL BATTLE"
        desc="Two players, one camera. Stand side by side and battle."
        onClick={() => onSelect('local')}
      />
      <ModeCard title="AI BATTLE" desc="One player vs an AI-generated opponent score." onClick={() => onSelect('ai')} />
      <ModeCard
        title="ONLINE BATTLE"
        desc="Room-code multiplayer — architecture ready, matchmaking server not connected in this build."
        onClick={() => onSelect('online')}
        disabled
      />

      <button onClick={onBack} className="mt-4 text-xs text-white/40 hover:text-white/70 font-display tracking-widest">
        ← BACK
      </button>
    </div>
  );
}

function ModeCard({ title, desc, onClick, disabled }: { title: string; desc: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full max-w-sm text-left px-5 py-4 rounded-2xl border transition ${
        disabled
          ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-300/40'
      }`}
    >
      <div className="font-display text-base tracking-wide">{title}</div>
      <div className="text-xs text-white/50 mt-1">{desc}</div>
    </button>
  );
}

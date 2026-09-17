import { readLeaderboard } from '../utils/leaderboard';

export function Leaderboard({ onBack }: { onBack: () => void }) {
  const entries = readLeaderboard();

  return (
    <div className="fixed inset-0 flex flex-col items-center px-6 py-10 overflow-y-auto">
      <p className="font-display text-xs tracking-[0.3em] text-white/50 mb-1">THIS DEVICE</p>
      <h2 className="font-display text-3xl mb-6" style={{ color: 'var(--aura-gold)' }}>
        LEADERBOARD
      </h2>

      <div className="w-full max-w-md space-y-2">
        {entries.length === 0 && <p className="text-white/40 text-sm text-center mt-8">No battles recorded yet. Go win one.</p>}
        {entries.map((e, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="font-display text-white/40 w-5 text-right">{i + 1}</span>
              <span className="font-display text-sm">{e.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] tracking-wide text-cyan-300">{e.rank}</span>
              <span className="font-display" style={{ color: 'var(--aura-gold)' }}>
                {e.aura}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onBack} className="mt-8 px-6 py-3 rounded-full font-display text-xs tracking-wide bg-white/10 hover:bg-white/20 transition">
        ← BACK
      </button>
    </div>
  );
}

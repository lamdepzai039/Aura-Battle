import { motion } from 'framer-motion';
import type { MatchState } from '../game/types';

export function FinalResult({
  match,
  winner,
  onRematch,
  onNewBattle,
  onShare,
}: {
  match: MatchState;
  winner: 'p1' | 'p2' | 'tie';
  onRematch: () => void;
  onNewBattle: () => void;
  onShare: () => void;
}) {
  const { p1, p2 } = match.players;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--bg-void)]">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 text-center">
        <p className="font-display text-xs tracking-[0.35em] text-white/50">AURA BATTLE</p>

        <div className="flex items-center gap-10 md:gap-20 mt-6 mb-6">
          <div className={winner === 'p2' ? 'opacity-60' : ''}>
            <div className="font-display text-sm text-white/60">{p1.name}</div>
            <div className="font-display text-6xl mt-1" style={{ color: 'var(--aura-cyan)' }}>
              {p1.aura}
            </div>
          </div>
          <div className="font-display text-3xl text-white/30">VS</div>
          <div className={winner === 'p1' ? 'opacity-60' : ''}>
            <div className="font-display text-sm text-white/60">{p2.name}</div>
            <div className="font-display text-6xl mt-1" style={{ color: 'var(--aura-magenta)' }}>
              {p2.aura}
            </div>
          </div>
        </div>

        <motion.p
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 10 }}
          className="font-display text-3xl md:text-4xl mb-10"
          style={{ color: 'var(--aura-gold)' }}
        >
          {winner === 'tie' ? "IT'S A TIE" : `🏆 ${winner === 'p1' ? p1.name : p2.name} WINS`}
        </motion.p>

        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-4 mb-10">
          <p className="font-display text-xs tracking-widest text-white/50 mb-3">ROUND RESULTS</p>
          <div className="space-y-2">
            {match.history.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{r.challengeId.replace(/_/g, ' ').toUpperCase()}</span>
                <span className="font-display" style={{ color: 'var(--aura-gold)' }}>
                  {r.winner === 'tie' ? 'TIE' : r.winner === 'p1' ? p1.name : p2.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={onRematch} className="px-6 py-3 rounded-full font-display text-sm bg-cyan-400 text-black hover:bg-cyan-300 transition">
            REMATCH
          </button>
          <button onClick={onNewBattle} className="px-6 py-3 rounded-full font-display text-sm bg-white/10 text-white hover:bg-white/20 transition">
            NEW BATTLE
          </button>
          <button onClick={onShare} className="px-6 py-3 rounded-full font-display text-sm bg-pink-400/90 text-black hover:bg-pink-300 transition">
            SHARE
          </button>
        </div>
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import type { RoundRecord } from '../game/types';

export function RoundResult({
  record,
  playerNames,
  onContinue,
  isFinal,
}: {
  record: RoundRecord;
  playerNames: { p1: string; p2: string };
  onContinue: () => void;
  isFinal: boolean;
}) {
  const { p1, p2 } = record.scores;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[var(--bg-void)] px-6 text-center">
      <p className="font-display text-xs tracking-[0.3em] text-white/50 mb-2">ROUND RESULT</p>
      <div className="flex items-center gap-10 md:gap-16 mb-6">
        <PlayerScoreCol name={playerNames.p1} score={p1} highlight={record.winner === 'p1'} />
        <span className="font-display text-2xl text-white/30">VS</span>
        <PlayerScoreCol name={playerNames.p2} score={p2} highlight={record.winner === 'p2'} />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-3xl mb-8"
        style={{ color: 'var(--aura-gold)' }}
      >
        {record.winner === 'tie' ? 'TIE ROUND' : `${record.winner === 'p1' ? playerNames.p1 : playerNames.p2} WINS THE ROUND`}
      </motion.p>
      <button
        onClick={onContinue}
        className="px-8 py-3 rounded-full font-display text-sm tracking-wide bg-cyan-400 text-black hover:bg-cyan-300 transition"
      >
        {isFinal ? 'SEE FINAL RESULT' : 'NEXT ROUND'}
      </button>
    </div>
  );
}

function PlayerScoreCol({ name, score, highlight }: { name: string; score: RoundRecord['scores']['p1']; highlight: boolean }) {
  return (
    <div className={`flex flex-col items-center ${highlight ? '' : 'opacity-70'}`}>
      <span className="font-display text-xs tracking-widest text-white/60">{name}</span>
      <span className="font-display text-5xl mt-1" style={{ color: highlight ? 'var(--aura-cyan)' : '#fff' }}>
        {Math.round(score.total)}
      </span>
      <div className="mt-2 text-[10px] text-white/40 space-y-0.5">
        <div>OBJ {Math.round(score.objective.score)}</div>
        {score.subjective && <div>SUBJ {Math.round(score.subjective.score)}</div>}
        {score.hits > 0 && <div>HITS {score.hits}</div>}
      </div>
    </div>
  );
}

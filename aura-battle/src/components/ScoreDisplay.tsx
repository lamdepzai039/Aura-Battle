import { AnimatePresence, motion } from 'framer-motion';
import type { LivePlayerFeedback } from '../game/useAuraMatch';

export function ScoreDisplay({
  playerName,
  aura,
  feedback,
  align,
  label,
}: {
  playerName: string;
  aura: number;
  feedback: LivePlayerFeedback;
  align: 'left' | 'right';
  label?: string;
}) {
  return (
    <div className={`absolute top-3 ${align === 'left' ? 'left-3' : 'right-3'} z-20 flex flex-col ${align === 'left' ? 'items-start' : 'items-end'}`}>
      <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10">
        <span className="mr-2 font-display text-[10px] tracking-[0.2em] text-cyan-200/80 uppercase">{label ?? (align === 'left' ? 'P1' : 'P2')}</span>
        <span className="font-display text-xs tracking-wider text-white/80">{playerName}</span>
        <span className="ml-2 font-display text-sm" style={{ color: 'var(--aura-gold)' }}>
          {aura}
        </span>
      </div>
      {feedback.label && feedback.value !== undefined && (
        <div className="mt-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 text-[11px] font-display text-cyan-200 tabular-nums">
          {feedback.label} {Math.round(feedback.value)}
          {feedback.label.includes('LOCK') || feedback.label.includes('MATCH') || feedback.label.includes('LOCKED') ? '%' : ''}
        </div>
      )}
      <AnimatePresence>
        {feedback.pulse && (
          <motion.div
            key={feedback.pulse.timestamp}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -16, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-1 font-display text-lg"
            style={{ color: 'var(--aura-gold)' }}
          >
            {feedback.pulse.label} {feedback.pulse.value > 0 ? `+${feedback.pulse.value}` : ''}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

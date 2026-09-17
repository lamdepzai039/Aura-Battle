import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerId } from '../game/types';

export function AuraBreak({ playerId, playerName }: { playerId: PlayerId | null; playerName?: string }) {
  return (
    <AnimatePresence>
      {playerId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-screenshake"
          style={{
            background: 'radial-gradient(circle at center, rgba(255,210,61,0.35), rgba(5,5,10,0.85) 70%)',
          }}
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -4 }}
            animate={{ scale: 1.05, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            className="text-center"
          >
            <p className="font-display text-6xl md:text-7xl" style={{ color: 'var(--aura-gold)' }}>
              ⚡ AURA BREAK ⚡
            </p>
            {playerName && <p className="font-display text-xl text-white/80 mt-2">{playerName}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

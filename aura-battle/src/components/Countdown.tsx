import { AnimatePresence, motion } from 'framer-motion';

export function Countdown({ value }: { value: number | 'GO' | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
      <AnimatePresence mode="wait">
        {value !== null && (
          <motion.div
            key={String(value)}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={`font-display text-8xl md:text-[10rem] drop-shadow-[0_0_30px_rgba(77,250,255,0.8)] ${
              value === 'GO' ? 'text-magenta-300' : 'text-cyan-300'
            }`}
            style={{ color: value === 'GO' ? 'var(--aura-magenta)' : 'var(--aura-cyan)' }}
          >
            {value}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { motion } from 'framer-motion';
import type { Challenge } from '../game/types';

export function RoundIntro({ challenge, roundNumber, totalRounds }: { challenge: Challenge; roundNumber: number; totalRounds: number }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[var(--bg-void)] px-6 text-center">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[140%] aspect-square rounded-full animate-glowpulse"
          style={{ background: 'radial-gradient(circle, var(--aura-purple) 0%, transparent 65%)' }}
        />
      </div>
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative font-display text-sm tracking-[0.3em] text-cyan-300/80"
      >
        ROUND {roundNumber} / {totalRounds}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 140, damping: 12 }}
        className="relative font-display text-5xl md:text-7xl mt-3 mb-4"
        style={{
          background: 'linear-gradient(90deg, var(--aura-cyan), var(--aura-magenta))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {challenge.name}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="relative text-white/70 max-w-md text-sm md:text-base"
      >
        {challenge.description}
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="relative mt-6 text-xs tracking-widest text-white/40 font-display"
      >
        {challenge.duration}s &middot; DIFFICULTY {'★'.repeat(challenge.difficulty)}
        {'☆'.repeat(5 - challenge.difficulty)}
      </motion.div>
    </div>
  );
}

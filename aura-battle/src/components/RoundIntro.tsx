import { motion } from 'framer-motion';
import type { Challenge, MutationLoadout } from '../game/types';

export function RoundIntro({ challenge, roundNumber, totalRounds, mutation }: { challenge: Challenge; roundNumber: number; totalRounds: number; mutation?: MutationLoadout }) {
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
      {mutation && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="relative mt-5 w-full max-w-md rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left">
        <div className="flex items-center justify-between gap-3"><span className="text-[10px] tracking-[0.18em] text-cyan-200">TREND PACK · {mutation.trendPack.title}</span><span className="text-[10px] text-yellow-200">{mutation.mutationId.toUpperCase()}</span></div>
        <p className="mt-2 text-xs text-white/70">{mutation.trendPack.theme} · {mutation.trendPack.rewardType}</p>
        <ul className="mt-2 space-y-1 text-[11px] text-white/55">{mutation.trendPack.rules.map((rule) => <li key={rule}>• {rule}</li>)}</ul>
      </motion.div>}
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

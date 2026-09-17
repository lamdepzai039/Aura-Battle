import { useState } from 'react';
import type { GameMode } from '../game/types';

export function PlayerSetup({
  mode,
  onStart,
  onBack,
}: {
  mode: GameMode;
  onStart: (p1: string, p2: string, customPrompt: string) => void;
  onBack: () => void;
}) {
  const [p1, setP1] = useState('PLAYER 1');
  const [p2, setP2] = useState(mode === 'ai' ? 'AI BOT' : mode === 'mutation' ? 'MUTANT OPPONENT' : 'PLAYER 2');
  const [prompt, setPrompt] = useState('');

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center gap-4">
      <p className="font-display text-xs tracking-[0.3em] text-white/50 mb-2">PLAYER SETUP</p>

      <div className="w-full max-w-sm space-y-3">
        <Field label="PLAYER 1 NAME" value={p1} onChange={setP1} />
        {mode !== 'ai' && <Field label="PLAYER 2 NAME" value={p2} onChange={setP2} />}
        <div className="text-left">
          <label className="block text-[11px] text-white/50 font-display tracking-wide mb-1">
            FINAL ROUND — YOUR OWN CHALLENGE (optional)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Do the funniest NPC walk"
            rows={2}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-300/50"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="px-5 py-3 rounded-full font-display text-xs tracking-wide bg-white/10 hover:bg-white/20 transition">
          BACK
        </button>
        <button
          onClick={() => onStart(p1 || 'PLAYER 1', p2 || 'PLAYER 2', prompt)}
          className="px-8 py-3 rounded-full font-display text-sm tracking-wide bg-cyan-400 text-black hover:bg-cyan-300 transition"
        >
          START BATTLE
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="text-left">
      <label className="block text-[11px] text-white/50 font-display tracking-wide mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={16}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-300/50"
      />
    </div>
  );
}

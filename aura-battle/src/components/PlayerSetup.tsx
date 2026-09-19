import { useState } from 'react';
import { DEFAULT_MUTATION_ARCHETYPE, DEFAULT_MUTATION_ID, DEFAULT_TREND_PACK, mutationsForArchetype, TREND_PACKS } from '../game/mutationData';
import type { GameMode, MutationArchetype, MutationLoadout } from '../game/types';

export function PlayerSetup({
  mode,
  onStart,
  onBack,
}: {
  mode: GameMode;
  onStart: (p1: string, p2: string, customPrompt: string, mutation?: MutationLoadout) => void;
  onBack: () => void;
}) {
  const [p1, setP1] = useState('PLAYER 1');
  const [p2, setP2] = useState(
    mode === 'ai' ? 'AI BOT' :
    mode === 'mutation' ? 'MUTANT OPPONENT' :
    mode === 'duo' ? 'TEAM B' :
    mode === 'crew' ? 'CREW B' :
    mode === 'ranked' ? 'RIVAL RANKED' :
    'PLAYER 2',
  );
  const [prompt, setPrompt] = useState('');
  const [archetype, setArchetype] = useState<MutationArchetype>(DEFAULT_MUTATION_ARCHETYPE);
  const [mutationId, setMutationId] = useState(DEFAULT_MUTATION_ID);
  const [trendId, setTrendId] = useState(DEFAULT_TREND_PACK.id);
  const availableMutations = mutationsForArchetype(archetype);
  const selectedMutation = availableMutations.find((mutation) => mutation.id === mutationId) ?? availableMutations[0];
  const selectedTrend = TREND_PACKS.find((trend) => trend.id === trendId) ?? DEFAULT_TREND_PACK;

  function chooseArchetype(next: MutationArchetype) {
    setArchetype(next);
    setMutationId(mutationsForArchetype(next)[0].id);
  }

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
        {mode === 'mutation' && selectedMutation && (
          <section className="mutation-setup-panel" aria-labelledby="mutation-setup-title">
            <span className="eyebrow">AURA MUTATION LOADOUT</span>
            <h2 id="mutation-setup-title">Choose your direction</h2>
            <div className="mutation-archetypes">
              {(['mobility', 'stability', 'volatility'] as MutationArchetype[]).map((item) => (
                <button type="button" key={item} className={archetype === item ? 'active' : ''} onClick={() => chooseArchetype(item)}>{item}</button>
              ))}
            </div>
            <div className="mutation-options">
              {availableMutations.map((mutation) => (
                <button type="button" key={mutation.id} className={mutation.id === selectedMutation.id ? 'active' : ''} onClick={() => setMutationId(mutation.id)}>
                  <strong>{mutation.name}</strong><small>{mutation.description}</small>
                </button>
              ))}
            </div>
            <label className="trend-select-label">TREND PACK
              <select value={trendId} onChange={(event) => setTrendId(event.target.value)}>
                {TREND_PACKS.map((trend) => <option key={trend.id} value={trend.id}>{trend.title} · {trend.theme}</option>)}
              </select>
            </label>
            <div className="mutation-rule-preview"><strong>{selectedTrend.title}</strong>{selectedTrend.rules.map((rule) => <span key={rule}>• {rule}</span>)}</div>
          </section>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onBack} className="px-5 py-3 rounded-full font-display text-xs tracking-wide bg-white/10 hover:bg-white/20 transition">
          BACK
        </button>
        <button
          onClick={() => onStart(p1 || 'PLAYER 1', p2 || 'PLAYER 2', prompt, mode === 'mutation' && selectedMutation ? { archetype, mutationId: selectedMutation.id, trendPack: selectedTrend } : undefined)}
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

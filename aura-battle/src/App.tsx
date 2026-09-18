import { useEffect, useRef, useState } from 'react';
import { Home } from './components/Home';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { Shop } from './components/Shop';
import { Guild } from './components/Guild';
import { PlayMode } from './components/PlayMode';
import { PlayerSetup } from './components/PlayerSetup';
import { MutationMap } from './components/MutationMap';
import { Leaderboard } from './components/Leaderboard';
import { CameraView } from './components/CameraView';
import { Countdown } from './components/Countdown';
import { ScoreDisplay } from './components/ScoreDisplay';
import { RoundIntro } from './components/RoundIntro';
import { RoundResult } from './components/RoundResult';
import { FinalResult } from './components/FinalResult';
import { AuraBreak } from './components/AuraBreak';
import { DebugPanel } from './components/DebugPanel';
import { useAuraMatch } from './game/useAuraMatch';
import { currentChallenge } from './game/gameState';
import { recordResult } from './utils/leaderboard';
import { getSession, getSessionEmail } from './utils/auth';
import { isAdminAccount } from './utils/playerProfile';
import type { GameMode, MatchState, MutationLoadout, PlayerId } from './game/types';

type AppPhase = 'login' | 'home' | 'shop' | 'guild' | 'settings' | 'mode_select' | 'camera_check' | 'player_setup' | 'mutation_map' | 'battle' | 'leaderboard';
const DEV = import.meta.env.DEV;

export default function App() {
  const [phase, setPhase] = useState<AppPhase>(() => getSession() ? 'home' : 'login');
  const [username, setUsername] = useState(() => getSession() || 'LAM');
  const [sessionEmail, setSessionEmail] = useState(() => getSessionEmail());
  const [pendingMode, setPendingMode] = useState<GameMode>('local');
  const [mutationSession, setMutationSession] = useState<{ playerName: string; rivalName: string; loadout: MutationLoadout } | null>(null);
  const recordedRef = useRef(false);
  const { match, videoRef, cameraStatus, enableCamera, attachStreamToVideo, trackerStatus, fps, countdownValue, liveFeedback, lastRecord, auraBreak, debugOpen, setDebugOpen, startMatch, goHome, rematch, continueToNextRound, winner, setPlayerName, debugForceWin, debugSkipRound } = useAuraMatch();
  const challenge = currentChallenge(match);

  useEffect(() => {
    if (match.screen === 'final_result' && !recordedRef.current) {
      recordedRef.current = true;
      recordResult(match.players.p1.name, match.players.p1.aura);
      if (match.mode === 'local') recordResult(match.players.p2.name, match.players.p2.aura);
    }
    if (match.screen === 'round_intro' && match.roundIndex === 0 && match.history.length === 0) recordedRef.current = false;
  }, [match.screen, match.roundIndex, match.history.length, match.mode, match.players]);

  if (phase === 'login') return <Login onAuthenticated={(nextUsername) => { setUsername(nextUsername || 'LAM'); setSessionEmail(getSessionEmail()); setPhase('home'); }} />;
  if (phase === 'home') return <Home username={username} onPlay={() => setPhase('mode_select')} onPractice={() => { setPendingMode('local'); setPhase('camera_check'); }} onLeaderboard={() => setPhase('leaderboard')} onShop={() => setPhase('shop')} onGuild={() => setPhase('guild')} onSettings={() => setPhase('settings')} />;
  if (phase === 'shop') return <Shop isAdmin={isAdminAccount(username, sessionEmail)} onHome={() => setPhase('home')} onLeaderboard={() => setPhase('leaderboard')} onGuild={() => setPhase('guild')} onSettings={() => setPhase('settings')} />;
  if (phase === 'guild') return <Guild username={username} onHome={() => setPhase('home')} onShop={() => setPhase('shop')} onSettings={() => setPhase('settings')} />;
  if (phase === 'settings') return <Settings onBack={() => setPhase('home')} onLogout={() => setPhase('login')} onShop={() => setPhase('shop')} onGuild={() => setPhase('guild')} />;
  if (phase === 'leaderboard') return <Leaderboard onBack={() => setPhase('home')} />;
  if (phase === 'mode_select') return <PlayMode username={username} onSelect={(mode) => { setPendingMode(mode); setPhase(mode === 'mutation' ? 'player_setup' : 'camera_check'); }} onBack={() => setPhase('home')} />;

  if (phase === 'camera_check') return <div className="fixed inset-0 flex flex-col items-center justify-center px-6 gap-6"><p className="font-display text-xs tracking-[0.3em] text-white/50">CAMERA CHECK</p><div className="w-full max-w-2xl"><CameraView ref={videoRef} status={cameraStatus} onEnable={enableCamera} onVideoReady={attachStreamToVideo} /></div>{cameraStatus === 'granted' && <button onClick={() => setPhase('player_setup')} className="px-8 py-3 rounded-full font-display text-sm tracking-wide bg-cyan-400 text-black hover:bg-cyan-300 transition">CONTINUE</button>}<button onClick={() => setPhase('home')} className="text-xs text-white/40 hover:text-white/70 font-display tracking-widest">← BACK</button></div>;

  if (phase === 'player_setup') return <PlayerSetup mode={pendingMode} onBack={() => setPhase('mode_select')} onStart={(p1, p2, prompt, mutation: MutationLoadout | undefined) => {
    if (pendingMode === 'mutation' && mutation) {
      setMutationSession({ playerName: p1, rivalName: p2, loadout: mutation });
      setPhase('mutation_map');
      return;
    }
    startMatch(pendingMode, prompt, mutation);
    setPlayerName('p1', p1);
    setPlayerName('p2', p2);
    setPhase('battle');
  }} />;

  if (phase === 'mutation_map' && mutationSession) return <MutationMap playerName={mutationSession.playerName} rivalName={mutationSession.rivalName} loadout={mutationSession.loadout} onHome={() => { setMutationSession(null); setPhase('home'); }} />;

  const totalRounds = match.challengeQueue.length;
  return <div className="fixed inset-0 flex flex-col items-center justify-center px-3 md:px-6">
    {match.screen === 'round_intro' && challenge && <RoundIntro challenge={challenge} roundNumber={match.roundIndex + 1} totalRounds={totalRounds} mutation={match.mutation} />}
    {match.screen === 'round_result' && lastRecord && <RoundResult record={lastRecord} playerNames={{ p1: match.players.p1.name, p2: match.players.p2.name }} onContinue={continueToNextRound} isFinal={match.roundIndex + 1 >= totalRounds} />}
    {match.screen === 'final_result' && <FinalResult match={match} winner={winner} onRematch={rematch} onNewBattle={() => setPhase('home')} onShare={() => shareResult(match, winner)} />}
    {(match.screen === 'challenge' || match.screen === 'countdown') && <div className="relative w-full max-w-4xl"><div className="flex items-center justify-between mb-2 px-1"><span className="font-display text-xs text-white/50 tracking-widest">ROUND {match.roundIndex + 1}/{totalRounds}</span>{challenge && <span className="font-display text-xs text-white/50 tracking-widest">{challenge.shortLabel}</span>}</div><CameraView ref={videoRef} status={cameraStatus} onEnable={enableCamera} onVideoReady={attachStreamToVideo} splitView={match.mode === 'local'}><ScoreDisplay playerName={match.players.p1.name} aura={match.players.p1.aura} feedback={liveFeedback.p1} align="left" /><ScoreDisplay playerName={match.players.p2.name} aura={match.players.p2.aura} feedback={liveFeedback.p2} align="right" /><Countdown value={countdownValue} /></CameraView></div>}
    <AuraBreak playerId={auraBreak} playerName={auraBreak ? match.players[auraBreak].name : undefined} />
    {DEV && debugOpen && challenge && <DebugPanel fps={fps} trackerStatus={trackerStatus} roundIndex={match.roundIndex} totalRounds={totalRounds} challengeId={challenge.id} onForceWin={debugForceWin} onSkipRound={debugSkipRound} onClose={() => setDebugOpen(false)} />}
    {DEV && !debugOpen && <button onClick={() => setDebugOpen(true)} className="fixed bottom-3 right-3 z-50 text-[10px] px-2 py-1 rounded bg-white/10 text-white/50 hover:text-white font-mono">debug</button>}
    <button onClick={() => { goHome(); setPhase('home'); }} className="fixed top-3 left-3 z-50 text-[10px] px-2 py-1 rounded bg-white/10 text-white/50 hover:text-white font-display tracking-widest">← HOME</button>
  </div>;
}

async function shareResult(match: MatchState, winner: PlayerId | 'tie') {
  const text = `AURA BATTLE\n${match.players.p1.name}: ${match.players.p1.aura}\n${match.players.p2.name}: ${match.players.p2.aura}\nWinner: ${winner === 'tie' ? 'Tie' : match.players[winner].name}`;
  const nav = navigator as Navigator & { share?: (data: { title: string; text: string }) => Promise<void> };
  if (nav.share) { try { await nav.share({ title: 'Aura Battle Result', text }); return; } catch { /* cancelled */ } }
  try { await navigator.clipboard.writeText(text); alert('Result copied to clipboard!'); } catch { /* unavailable */ }
}

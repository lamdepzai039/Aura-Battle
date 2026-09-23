import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Home } from './components/Home';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { Shop } from './components/Shop';
import { Guild } from './components/Guild';
import { PlayerSetup } from './components/PlayerSetup';
import { Leaderboard } from './components/Leaderboard';
import { Countdown } from './components/Countdown';
import { ScoreDisplay } from './components/ScoreDisplay';
import { RoundIntro } from './components/RoundIntro';
import { RoundResult } from './components/RoundResult';
import { FinalResult } from './components/FinalResult';
import { AuraBreak } from './components/AuraBreak';
import { DebugPanel } from './components/DebugPanel';
const PlayMode = lazy(async () => {
  const module = await import('./components/PlayMode');
  return { default: module.PlayMode };
});
const CameraView = lazy(async () => {
  const module = await import('./components/CameraView');
  return { default: module.CameraView };
});
import { useAuraMatch } from './game/useAuraMatch';
import { currentChallenge } from './game/gameState';
import { resolveBattleSeatNames } from './game/battleSeats';
import { recordResult } from './utils/leaderboard';
import { getSession, getSessionEmail } from './utils/auth';
import { isAdminAccount } from './utils/playerProfile';
import { addEventProgress } from './utils/eventStore';
import { resolveLobbyUrl, type OnlineRoomState, type RoomFormat, type RoomPlayer } from './utils/onlineRoom';
import { applyMatchResult, syncRankResult, syncTeamRankResult } from './utils/rankStore';
import { awardMatchOutcome } from './utils/shopEconomy';
import type { GameMode, MatchState, PlayerId } from './game/types';

type AppPhase = 'login' | 'home' | 'shop' | 'guild' | 'settings' | 'mode_select' | 'camera_check' | 'player_setup' | 'transition' | 'online_waiting' | 'battle' | 'leaderboard';
const DEV = import.meta.env.DEV;

type OnlineLobbySession = {
  roomCode: string;
  host: string;
  guest: string | null;
  isHost: boolean;
  phase: 'waiting' | 'ready' | 'playing';
  format: RoomFormat;
  maxPlayers: number;
  players: RoomPlayer[];
};

export default function App() {
  const [phase, setPhase] = useState<AppPhase>(() => getSession() ? 'home' : 'login');
  const [username, setUsername] = useState(() => getSession() || 'LAM');
  const [sessionEmail, setSessionEmail] = useState(() => getSessionEmail());
  const [pendingMode, setPendingMode] = useState<GameMode>('local');
  const [transitionTarget, setTransitionTarget] = useState<'battle' | null>(null);
  const [onlineLobby, setOnlineLobby] = useState<OnlineLobbySession | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerConnected, setPeerConnected] = useState<Record<string, boolean>>({});
  const [screenSharing, setScreenSharing] = useState(false);
  const onlineSocketRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recordedRef = useRef(false);
  const { match, videoRef, cameraStatus, enableCamera, attachStreamToVideo, trackerStatus, fps, countdownValue, liveFeedback, lastRecord, auraBreak, debugOpen, setDebugOpen, startMatch, goHome, rematch, continueToNextRound, winner, setPlayerName, debugForceWin, debugSkipRound } = useAuraMatch();
  const challenge = currentChallenge(match);
  const onlineRoomCode = onlineLobby?.roomCode;

  const localPeerId = onlineLobby?.players.find((player) => player.name === username)?.id ?? (onlineLobby?.isHost ? 'p1' : 'p2');

  const sendPeerSignal = useCallback((signal: unknown, target: string) => {
    if (!onlineRoomCode) return;
    const socket = onlineSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const payload = { type: 'webrtc_signal', roomCode: onlineRoomCode, target, signal };
    console.info('[AuraBattle][Peer] send signal', { target, signalType: (signal as { type?: string })?.type, roomCode: onlineRoomCode });
    socket.send(JSON.stringify(payload));
  }, [onlineRoomCode]);

  const ensurePeerConnection = useCallback(async (peerId: string) => {
    if (!onlineLobby?.roomCode || !videoRef.current) return null;
    const existingConnection = peerConnectionsRef.current.get(peerId);
    if (existingConnection) return existingConnection;

    console.info('[AuraBattle][Peer] create RTCPeerConnection', { roomCode: onlineLobby.roomCode, isHost: onlineLobby.isHost });
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const localStream = videoRef.current.srcObject as MediaStream | null;
    if (localStream) {
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    }
    screenStreamRef.current?.getTracks().forEach((track) => peerConnection.addTrack(track, screenStreamRef.current as MediaStream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.toJSON();
        console.info('[AuraBattle][Peer] local ICE candidate generated', {
          candidatePrefix: candidate.candidate?.slice(0, 32),
          sdpMid: candidate.sdpMid,
          roomCode: onlineLobby.roomCode,
        });
        sendPeerSignal({ type: 'ice-candidate', candidate }, peerId);
      }
    };

    peerConnection.ontrack = (event) => {
      const nextStream = event.streams[0];
      if (nextStream) {
        console.info('[AuraBattle][Peer] remote track received', { streamId: nextStream.id, tracks: nextStream.getTracks().map((track) => track.kind) });
        setRemoteStreams((current) => ({ ...current, [peerId]: nextStream }));
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.info('[AuraBattle][Peer] connection state changed', { state: peerConnection.connectionState, roomCode: onlineLobby.roomCode });
      setPeerConnected((current) => ({ ...current, [peerId]: ['connected', 'completed'].includes(peerConnection.connectionState) }));
    };

    peerConnectionsRef.current.set(peerId, peerConnection);
    return peerConnection;
  }, [onlineLobby, sendPeerSignal, videoRef]);

  useEffect(() => {
    if (!onlineLobby?.roomCode || !videoRef.current || match.mode !== 'online') return;
    const startPeerLink = async () => {
      if (!onlineLobby.isHost) return;
      const peers = onlineLobby.players.filter((player) => player.id !== localPeerId && player.connected);
      for (const player of peers) {
        const peerConnection = await ensurePeerConnection(player.id);
        if (!peerConnection) continue;
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendPeerSignal({ type: 'offer', sdp: offer.sdp }, player.id);
      }
    };

    void startPeerLink();
  }, [cameraStatus, ensurePeerConnection, localPeerId, match.mode, onlineLobby, sendPeerSignal, videoRef]);

  useEffect(() => {
    if (!onlineSocketRef.current || !onlineLobby?.roomCode) return;

    const handleSocketMessage = async (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          from?: string;
          to?: string;
          target?: string;
          signal?: { type?: string; sdp?: string; candidate?: RTCIceCandidateInit };
        };

        if (payload.type === 'webrtc_signal') {
          console.info('[AuraBattle][Socket] incoming signal', { from: payload.from, to: payload.to, signalType: payload.signal?.type, roomCode: onlineLobby.roomCode });
        }

        if (payload.type !== 'webrtc_signal' || !payload.signal) return;
        if (payload.to && payload.to !== localPeerId) return;
        if (!payload.from) return;
        const peerConnection = await ensurePeerConnection(payload.from);
        if (!peerConnection) return;

        const signalType = payload.signal.type;
        if (signalType === 'offer') {
          console.info('[AuraBattle][Peer] received offer', { from: payload.from, roomCode: onlineLobby.roomCode });
          await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: payload.signal.sdp ?? '' }));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          const answerTarget = payload.from;
          console.info('[AuraBattle][Peer] sending answer', { to: answerTarget, roomCode: onlineLobby.roomCode });
          sendPeerSignal({ type: 'answer', sdp: answer.sdp }, answerTarget);
          return;
        }

        if (signalType === 'answer') {
          console.info('[AuraBattle][Peer] received answer', { from: payload.from, roomCode: onlineLobby.roomCode });
          await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: payload.signal.sdp ?? '' }));
          return;
        }

        if (signalType === 'ice-candidate' && payload.signal.candidate) {
          console.info('[AuraBattle][Peer] received ICE candidate', {
            from: payload.from,
            candidatePrefix: payload.signal.candidate.candidate?.slice(0, 32),
            roomCode: onlineLobby.roomCode,
          });
          await peerConnection.addIceCandidate(new RTCIceCandidate(payload.signal.candidate));
        }
      } catch (error) {
        console.error('[AuraBattle][Peer] signaling error', error);
      }
    };

    onlineSocketRef.current.addEventListener('message', handleSocketMessage);
    return () => onlineSocketRef.current?.removeEventListener('message', handleSocketMessage);
  }, [ensurePeerConnection, localPeerId, onlineLobby, sendPeerSignal]);

  const shareScreen = useCallback(async () => {
    if (!onlineLobby?.roomCode || !navigator.mediaDevices?.getDisplayMedia) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = displayStream;
      setScreenSharing(true);
      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        screenStreamRef.current = null;
        setScreenSharing(false);
      });

      for (const player of onlineLobby.players) {
        if (player.id === localPeerId || !player.connected) continue;
        const peerConnection = await ensurePeerConnection(player.id);
        if (!peerConnection) continue;
        displayStream.getTracks().forEach((track) => peerConnection.addTrack(track, displayStream));
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendPeerSignal({ type: 'offer', sdp: offer.sdp }, player.id);
      }
    } catch (error) {
      console.info('[AuraBattle][Peer] screen sharing cancelled or unavailable', error);
    }
  }, [ensurePeerConnection, localPeerId, onlineLobby, sendPeerSignal]);

  useEffect(() => {
    if (match.screen === 'final_result' && !recordedRef.current) {
      recordedRef.current = true;
      const playerOneWon = match.players.p1.aura >= match.players.p2.aura;
      const playerTwoWon = match.players.p2.aura >= match.players.p1.aura;
      const syncFinishedRank = (outcome: 'win' | 'loss' | 'tie') => {
        const isTeamRoom = match.mode === 'online' && onlineLobby?.format !== '1v1';
        if (isTeamRoom && onlineLobby) {
          void syncTeamRankResult(
            onlineLobby.players.filter((player) => player.team === 'A').map((player) => player.name),
            onlineLobby.players.filter((player) => player.team === 'B').map((player) => player.name),
            outcome,
          );
          return;
        }
        void syncRankResult(match.players.p1.name, match.players.p2.name, outcome);
      };

      recordResult(match.players.p1.name, match.players.p1.aura);
      if (match.mode === 'local') recordResult(match.players.p2.name, match.players.p2.aura);

      if (winner === 'tie') {
        applyMatchResult(match.players.p1.name, match.players.p2.name, 'tie', match.mode);
        syncFinishedRank('tie');
        awardMatchOutcome('tie', match.mode);
      } else if (winner === 'p1') {
        applyMatchResult(match.players.p1.name, match.players.p2.name, 'win', match.mode);
        syncFinishedRank('win');
        awardMatchOutcome('win', match.mode);
      } else if (winner === 'p2') {
        applyMatchResult(match.players.p1.name, match.players.p2.name, 'loss', match.mode);
        syncFinishedRank('loss');
        awardMatchOutcome('loss', match.mode);
      }

      addEventProgress(match.players.p1.name, {
        wins: playerOneWon ? 1 : 0,
        rounds: match.history.length,
        aura: match.players.p1.aura,
        auraBreaks: match.history.filter((record) => record.scores.p1.total >= 80).length,
        localMatches: match.mode === 'local' ? 1 : 0,
        challengeRounds: match.history.length,
        perfectCounters: Math.max(0, Math.round((match.players.p1.aura || 0) / 120)),
        mode: match.mode,
      });

      if (match.mode === 'local') {
        addEventProgress(match.players.p2.name, {
          wins: playerTwoWon ? 1 : 0,
          rounds: match.history.length,
          aura: match.players.p2.aura,
          auraBreaks: match.history.filter((record) => record.scores.p2.total >= 80).length,
          localMatches: 1,
          challengeRounds: match.history.length,
          perfectCounters: Math.max(0, Math.round((match.players.p2.aura || 0) / 120)),
          mode: match.mode,
        });
      }
    }
    if (match.screen === 'round_intro' && match.roundIndex === 0 && match.history.length === 0) recordedRef.current = false;
  }, [match.screen, match.roundIndex, match.history, match.mode, match.players, onlineLobby, winner]);

  useEffect(() => {
    if (phase !== 'transition' || !transitionTarget) return;

    const timeout = window.setTimeout(() => {
      if (transitionTarget === 'battle') {
        setPhase('battle');
      } else {
        setPhase('home');
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [phase, transitionTarget]);

  useEffect(() => {
    if (!onlineLobby?.roomCode) {
      onlineSocketRef.current?.close();
      onlineSocketRef.current = null;
      return;
    }

    const socket = new WebSocket(resolveLobbyUrl(window.location.href));
    onlineSocketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'rejoin_room', code: onlineLobby.roomCode, username: username || 'LAM' }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          room?: OnlineRoomState;
          message?: string;
          you?: 'host' | 'guest';
          seed?: number | null;
          startedAt?: string | null;
        };

        if (payload.type === 'room_state' && payload.room) {
          const nextRoom = payload.room;
          setOnlineLobby((current) => current ? {
            ...current,
            roomCode: nextRoom.code,
            host: nextRoom.host,
            guest: nextRoom.guest,
            isHost: payload.you === 'host' || current.isHost,
            phase: nextRoom.phase,
          } : current);
        }

        if (payload.type === 'match_start' && payload.room) {
          const nextRoom = payload.room;
          const seatNames = resolveBattleSeatNames({
            currentPlayer: username || 'PLAYER',
            host: nextRoom.host,
            guest: nextRoom.guest,
            isHost: payload.you === 'host' || nextRoom.host === username,
          });

          setOnlineLobby((current) => current ? {
            ...current,
            roomCode: nextRoom.code,
            host: nextRoom.host,
            guest: nextRoom.guest,
            phase: nextRoom.phase,
            isHost: current?.isHost ?? nextRoom.host === username,
          } : current);
          setPendingMode('online');
          setPhase('battle');
          startMatch('online', undefined, undefined, Number(payload.seed ?? Date.now()));
          setPlayerName('p1', seatNames.p1);
          setPlayerName('p2', seatNames.p2);
        }

        if (payload.type === 'error' && payload.message) {
          setPhase('mode_select');
        }
      } catch {
        // ignore malformed lobby messages
      }
    };

    return () => {
      socket.close();
      onlineSocketRef.current = null;
    };
  }, [onlineLobby?.roomCode, username, startMatch, setPlayerName]);

  if (phase === 'login') return <Login onAuthenticated={(nextUsername) => { setUsername(nextUsername || 'LAM'); setSessionEmail(getSessionEmail()); setPhase('home'); }} />;
  if (phase === 'home') return <Home username={username} onPlay={() => setPhase('mode_select')} onPractice={() => { setPendingMode('local'); setPhase('camera_check'); }} onLeaderboard={() => setPhase('leaderboard')} onShop={() => setPhase('shop')} onGuild={() => setPhase('guild')} onSettings={() => setPhase('settings')} />;
  if (phase === 'shop') return <Shop isAdmin={isAdminAccount(username, sessionEmail)} onHome={() => setPhase('home')} onLeaderboard={() => setPhase('leaderboard')} onGuild={() => setPhase('guild')} onSettings={() => setPhase('settings')} />;
  if (phase === 'guild') return <Guild username={username} onHome={() => setPhase('home')} onShop={() => setPhase('shop')} onSettings={() => setPhase('settings')} />;
  if (phase === 'settings') return <Settings onBack={() => setPhase('home')} onLogout={() => setPhase('login')} onShop={() => setPhase('shop')} onGuild={() => setPhase('guild')} />;
  if (phase === 'leaderboard') return <Leaderboard onBack={() => setPhase('home')} />;
  if (phase === 'mode_select') return <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-[#050816] text-xs font-display tracking-[0.3em] text-cyan-300">LOADING MODE…</div>}><PlayMode username={username} onSelect={(mode, onlineContext) => {
    if (mode === 'online') {
      setPendingMode('online');
      setOnlineLobby(onlineContext ?? null);
      setPhase('online_waiting');
      return;
    }
    setPendingMode(mode);
    setPhase('camera_check');
  }} onBack={() => setPhase('home')} /></Suspense>;

  if (phase === 'camera_check') return <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-[#050816] text-xs font-display tracking-[0.3em] text-cyan-300">LOADING CAMERA…</div>}><div className="fixed inset-0 flex flex-col items-center justify-center px-6 gap-6"><p className="font-display text-xs tracking-[0.3em] text-white/50">CAMERA CHECK</p><div className="w-full max-w-2xl"><CameraView ref={videoRef} status={cameraStatus} onEnable={enableCamera} onVideoReady={attachStreamToVideo} /></div>{cameraStatus === 'granted' && <button onClick={() => setPhase('player_setup')} className="px-8 py-3 rounded-full font-display text-sm tracking-wide bg-cyan-400 text-black hover:bg-cyan-300 transition">CONTINUE</button>}<button onClick={() => setPhase('home')} className="text-xs text-white/40 hover:text-white/70 font-display tracking-widest">← BACK</button></div></Suspense>;

  if (phase === 'player_setup') return <PlayerSetup mode={pendingMode} onBack={() => setPhase('mode_select')} onStart={(p1, p2, prompt) => {
    startMatch(pendingMode, prompt);
    setPlayerName('p1', p1);
    setPlayerName('p2', p2);
    setTransitionTarget('battle');
    setPhase('transition');
  }} />;

  if (phase === 'transition') return (
    <div className="scene-transition-screen" role="status" aria-live="polite">
      <div className="transition-glow" />
      <div className="transition-rings" />
      <div className="transition-core">
        <span className="transition-label">AURA SHIFT</span>
        <strong>STARTING BATTLE</strong>
      </div>
    </div>
  );

  const liveSeatNames = resolveBattleSeatNames({
    currentPlayer: username || 'PLAYER',
    host: onlineLobby?.host ?? username ?? 'PLAYER',
    guest: onlineLobby?.guest ?? 'RIVAL',
    isHost: onlineLobby?.isHost ?? true,
  });

  if (phase === 'online_waiting') return <div className="fixed inset-0 flex flex-col items-center justify-center px-6 gap-6 bg-[#050816]">
    <div className="text-center space-y-4">
      <p className="font-display text-[10px] tracking-[0.32em] text-cyan-300/80">{onlineLobby?.phase === 'playing' ? 'MATCH FOUND' : 'ONLINE ROOM STATUS'}</p>
      <h1 className="font-display text-4xl tracking-[0.18em] text-white">{onlineLobby?.phase === 'playing' ? 'MATCH FOUND' : `ROOM ${onlineLobby?.roomCode ?? '---'}`}</h1>
      <p className="text-sm text-white/70">{onlineLobby?.phase === 'playing' ? `${onlineLobby.format.toUpperCase()} · ${onlineLobby.players.length}/${onlineLobby.maxPlayers} PLAYERS READY` : onlineLobby?.guest ? `${onlineLobby.host} vs ${onlineLobby.guest}` : `Host: ${onlineLobby?.host ?? username} · Waiting for challenger`}</p>
      <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.25em] text-white/60">
        <span className={`rounded-full border px-3 py-1 ${onlineLobby?.phase === 'playing' ? 'border-emerald-400 text-emerald-300' : onlineLobby?.guest ? 'border-cyan-400 text-cyan-300' : 'border-yellow-400 text-yellow-300'}`}>
          {onlineLobby?.phase === 'playing' ? 'LIVE' : onlineLobby?.guest ? 'READY' : 'WAITING'}
        </span>
      </div>
    </div>

    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_40px_rgba(52,211,153,0.08)]">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/60">
        <span>HOST</span>
        <span>{onlineLobby?.host ?? username}</span>
      </div>
      <div className="my-4 h-px bg-white/10" />
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/60">
        <span>RIVAL</span>
        <span>{onlineLobby?.phase === 'playing' ? onlineLobby.players.map((player) => player.name).join(' · ') : onlineLobby?.guest ?? 'WAITING...'}</span>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-center gap-3">
      <button onClick={() => {
        const battleNames = resolveBattleSeatNames({
          currentPlayer: username || 'PLAYER',
          host: onlineLobby?.host ?? username ?? 'PLAYER',
          guest: onlineLobby?.guest ?? 'RIVAL',
          isHost: onlineLobby?.isHost ?? true,
        });
        startMatch('online', undefined, undefined, Date.now());
        setPlayerName('p1', battleNames.p1);
        setPlayerName('p2', battleNames.p2);
        setPhase(onlineLobby?.phase === 'playing' ? 'camera_check' : 'battle');
      }} className="rounded-full bg-cyan-400 px-7 py-3 font-display text-sm tracking-[0.2em] text-black hover:bg-cyan-300 transition disabled:opacity-50" disabled={false}>
        {onlineLobby?.phase === 'playing' ? 'ENTER ONLINE MATCH' : onlineLobby?.isHost ? 'START BATTLE' : 'ENTER MATCH'}
      </button>
      <button onClick={() => setPhase('mode_select')} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-display text-[10px] tracking-[0.24em] text-white/80 hover:bg-white/10 transition">BACK TO LOBBY</button>
    </div>
  </div>;

  const totalRounds = match.challengeQueue.length;
  return <div className="fixed inset-0 flex flex-col items-center justify-center px-3 md:px-6">
    {match.screen === 'round_intro' && challenge && <RoundIntro challenge={challenge} roundNumber={match.roundIndex + 1} totalRounds={totalRounds} mutation={match.mutation} />}
    {match.screen === 'round_result' && lastRecord && <RoundResult record={lastRecord} playerNames={{ p1: match.players.p1.name, p2: match.players.p2.name }} onContinue={continueToNextRound} isFinal={match.roundIndex + 1 >= totalRounds} />}
    {match.screen === 'final_result' && <FinalResult match={match} winner={winner} onRematch={rematch} onNewBattle={() => setPhase('home')} onShare={() => shareResult(match, winner)} />}
    {(match.screen === 'challenge' || match.screen === 'countdown') && <div className="relative w-full max-w-5xl"><div className="flex items-center justify-between mb-2 px-1"><span className="font-display text-xs text-white/50 tracking-widest">ROUND {match.roundIndex + 1}/{totalRounds}</span>{challenge && <span className="font-display text-xs text-white/50 tracking-widest">{challenge.shortLabel}</span>}</div><div className="relative"><CameraView ref={videoRef} status={cameraStatus} onEnable={enableCamera} onVideoReady={attachStreamToVideo} splitView={match.mode === 'local'}><ScoreDisplay playerName={match.players.p1.name || liveSeatNames.p1} aura={match.players.p1.aura} feedback={liveFeedback.p1} align="left" label="P1" /><ScoreDisplay playerName={match.players.p2.name || liveSeatNames.p2} aura={match.players.p2.aura} feedback={liveFeedback.p2} align="right" label="P2" /><Countdown value={countdownValue} /></CameraView>{match.mode === 'online' && <div className="absolute bottom-4 right-4 z-10 grid max-h-64 max-w-[calc(100%-1rem)] grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">{Object.entries(remoteStreams).map(([peerId, stream]) => <RemoteFeed key={peerId} peerId={peerId} stream={stream} connected={Boolean(peerConnected[peerId])} />)}</div>}</div></div>}
    {match.mode === 'online' && <button type="button" onClick={() => void shareScreen()} className="fixed bottom-3 left-3 z-50 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-display tracking-widest text-white/70 hover:bg-white/20">{screenSharing ? 'SCREEN LIVE' : 'SHARE SCREEN'}</button>}
    <AuraBreak playerId={auraBreak} playerName={auraBreak ? match.players[auraBreak].name : undefined} />
    {DEV && debugOpen && challenge && <DebugPanel fps={fps} trackerStatus={trackerStatus} roundIndex={match.roundIndex} totalRounds={totalRounds} challengeId={challenge.id} onForceWin={debugForceWin} onSkipRound={debugSkipRound} onClose={() => setDebugOpen(false)} />}
    {DEV && !debugOpen && <button onClick={() => setDebugOpen(true)} className="fixed bottom-3 right-3 z-50 text-[10px] px-2 py-1 rounded bg-white/10 text-white/50 hover:text-white font-mono">debug</button>}
    <button onClick={() => { goHome(); setPhase('home'); }} className="fixed top-3 left-3 z-50 text-[10px] px-2 py-1 rounded bg-white/10 text-white/50 hover:text-white font-display tracking-widest">← HOME</button>
  </div>;
}

function RemoteFeed({ peerId, stream, connected }: { peerId: string; stream: MediaStream; connected: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return <div className="w-[180px] overflow-hidden rounded-2xl border border-cyan-300/70 bg-slate-950/80 shadow-[0_0_35px_rgba(34,211,238,0.22)] backdrop-blur-sm"><div className="flex items-center justify-between bg-slate-950/85 px-2.5 py-1.5 text-[10px] font-display tracking-[0.24em] text-cyan-200"><span>{peerId.toUpperCase()}</span><span className={connected ? 'text-emerald-300' : 'text-amber-300'}>{connected ? 'LIVE' : 'CONNECTING'}</span></div><div className="relative h-28 w-full overflow-hidden"><video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" /></div></div>;
}

async function shareResult(match: MatchState, winner: PlayerId | 'tie') {
  const text = `AURA BATTLE\n${match.players.p1.name}: ${match.players.p1.aura}\n${match.players.p2.name}: ${match.players.p2.aura}\nWinner: ${winner === 'tie' ? 'Tie' : match.players[winner].name}`;
  const nav = navigator as Navigator & { share?: (data: { title: string; text: string }) => Promise<void> };
  if (nav.share) { try { await nav.share({ title: 'Aura Battle Result', text }); return; } catch { /* cancelled */ } }
  try { await navigator.clipboard.writeText(text); alert('Result copied to clipboard!'); } catch { /* unavailable */ }
}

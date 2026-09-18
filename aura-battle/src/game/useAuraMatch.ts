import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Challenge, GameMode, MutationLoadout, PlayerId, RoundRecord, ScoreEvent, TrackingFrame } from './types';
import { scoreLandmarkFrame } from '../scoring/landmarkAI';
import { Tracker, type TrackerLoadProgress } from '../vision/tracker';
import { createInitialMatch, currentChallenge, matchReducer, overallWinner } from './gameState';
import { finalizeRound, generateBotRoundCapture, type PlayerRoundCapture } from './roundManager';
import { buildDefaultQueue, buildMvpQueue } from '../challenges/challengeRegistry';

export type CameraStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'occupied';

export interface LivePlayerFeedback {
  label?: string;
  value?: number;
  pulse?: ScoreEvent | null;
}

const COUNTDOWN_MS = 3200;
const INTRO_MS = 2600;
// round_result screen waits for an explicit "continue" tap instead of a timer

export function useAuraMatch() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<Tracker | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [trackerStatus, setTrackerStatus] = useState<TrackerLoadProgress>({ pose: 'idle', hand: 'idle', face: 'idle' });
  const [fps, setFps] = useState(0);
  const [countdownValue, setCountdownValue] = useState<number | 'GO' | null>(null);
  const [liveFeedback, setLiveFeedback] = useState<Record<PlayerId, LivePlayerFeedback>>({ p1: {}, p2: {} });
  const [lastRecord, setLastRecord] = useState<RoundRecord | null>(null);
  const [auraBreak, setAuraBreak] = useState<PlayerId | null>(null);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const [match, dispatch] = useReducer(matchReducer, createInitialMatch('local', buildMvpQueue()));
  const matchRef = useRef(match);
  matchRef.current = match;

  const capturesRef = useRef<Record<PlayerId, PlayerRoundCapture>>({
    p1: { frames: [], state: {}, events: [] },
    p2: { frames: [], state: {}, events: [] },
  });

  // ---------------- Camera ----------------

  const attachStreamToVideo = useCallback(async (video: HTMLVideoElement, stream = streamRef.current) => {
    if (!stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    await video.play().catch(() => {});
  }, []);

  const enableCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable');
      return;
    }
    setCameraStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) await attachStreamToVideo(videoRef.current, stream);
      setCameraStatus('granted');
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') setCameraStatus('denied');
      else if (name === 'NotReadableError' || name === 'TrackStartError') setCameraStatus('occupied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setCameraStatus('unavailable');
      else setCameraStatus('denied');
    }
  }, [attachStreamToVideo]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ---------------- Match lifecycle ----------------

  const startMatch = useCallback((mode: GameMode, prompt?: string, mutation?: MutationLoadout, seed?: number) => {
    const queue = mode === 'online' ? buildDefaultQueue(prompt, seed ?? Date.now()) : buildDefaultQueue(prompt);
    trackerRef.current?.dispose();
    trackerRef.current = new Tracker(setTrackerStatus, mode === 'local');
    introStartedForRef.current = -1;
    dispatch({ type: 'RESET', mode, queue, mutation });
  }, []);

  const goHome = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopCamera();
    trackerRef.current?.dispose();
    dispatch({ type: 'SET_SCREEN', screen: 'round_intro' });
  }, [stopCamera]);

  const rematch = useCallback(() => {
    startMatch(match.mode, customPrompt);
  }, [match.mode, startMatch, customPrompt]);

  // ---------------- Round flow ----------------

  const runIntroThenCountdown = useCallback((_challenge: Challenge) => {
    dispatch({ type: 'SET_SCREEN', screen: 'round_intro' });
    window.setTimeout(() => {
      dispatch({ type: 'SET_SCREEN', screen: 'countdown' });
      runCountdown();
    }, INTRO_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runCountdown = useCallback(() => {
    const steps: Array<number | 'GO'> = [3, 2, 1, 'GO'];
    let i = 0;
    setCountdownValue(steps[0]);
    const interval = window.setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        window.clearInterval(interval);
        setCountdownValue(null);
        beginChallenge();
        return;
      }
      setCountdownValue(steps[i]);
    }, COUNTDOWN_MS / steps.length);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const beginChallenge = useCallback(async () => {
    const challenge = currentChallenge(matchRef.current);
    if (!challenge) return;

    await trackerRef.current?.ensureLoaded(challenge.trackingRequirements);

    capturesRef.current = {
      p1: { frames: [], state: {}, events: [] },
      p2: { frames: [], state: {}, events: [] },
    };
    setLiveFeedback({ p1: {}, p2: {} });
    dispatch({ type: 'SET_SCREEN', screen: 'challenge' });

    const startTime = performance.now();
    const durationMs = challenge.duration * 1000;
    const isAiMode = matchRef.current.mode === 'ai';
    let lastFpsSample = startTime;
    let frameCount = 0;

    const loop = (now: number) => {
      const elapsedMs = now - startTime;
      setChallengeTimeLeft(Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000)));

      frameCount += 1;
      if (now - lastFpsSample > 500) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsSample)));
        frameCount = 0;
        lastFpsSample = now;
      }

      if (videoRef.current && trackerRef.current) {
        let frames: Record<PlayerId, TrackingFrame>;
        if (isAiMode) {
          const f = trackerRef.current.detect(videoRef.current, now);
          frames = { p1: f, p2: { timestamp: now, pose: null, leftHand: null, rightHand: null, face: null } };
        } else {
          frames = trackerRef.current.detectSplit(videoRef.current, now, 'p1', 'p2');
        }

        (['p1', 'p2'] as PlayerId[]).forEach((playerId) => {
          if (isAiMode && playerId === 'p2') return;
          const capture = capturesRef.current[playerId];
          const rawFrameCount = Number(capture.state.rawFrameCount || 0) + 1;
          capture.state.rawFrameCount = rawFrameCount;
          if (rawFrameCount % 3 === 0) {
            capture.frames.push(frames[playerId]);
            const landmarkScores = Array.isArray(capture.state.landmarkScores) ? capture.state.landmarkScores as ReturnType<typeof scoreLandmarkFrame>[] : [];
            landmarkScores.push(scoreLandmarkFrame(challenge, frames[playerId]));
            capture.state.landmarkScores = landmarkScores;
          }
          const result = challenge.onFrame?.({
            playerId,
            frame: frames[playerId],
            elapsedMs,
            state: capture.state,
          });
          if (result) {
            setLiveFeedback((prev) => ({ ...prev, [playerId]: { label: result.liveLabel, value: result.liveValue, pulse: result.event ?? null } }));
            if (result.event) capture.events.push(result.event);
          }
        });
      }

      if (elapsedMs < durationMs) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        finishChallenge(challenge, durationMs);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finishChallenge = useCallback(async (challenge: Challenge, durationMs: number) => {
    const isAiMode = matchRef.current.mode === 'ai';
    const botOverride = isAiMode ? generateBotRoundCapture(challenge, 'medium').scoreOverride : undefined;

    const record = await finalizeRound(
      challenge,
      capturesRef.current,
      durationMs,
      isAiMode ? { p2: botOverride } : undefined,
    );

    setLastRecord(record);
    const p1Break = record.scores.p1.total >= challenge.auraBreakThreshold;
    const p2Break = record.scores.p2.total >= challenge.auraBreakThreshold;
    if (p1Break || p2Break) {
      setAuraBreak(p1Break && p2Break ? (record.scores.p1.total >= record.scores.p2.total ? 'p1' : 'p2') : p1Break ? 'p1' : 'p2');
      window.setTimeout(() => setAuraBreak(null), 1800);
    }

    dispatch({ type: 'APPLY_ROUND_RESULT', record });
  }, []);

  const continueToNextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  // Whenever we land on 'round_intro' for a round we haven't started yet
  // (initial round after RESET, or after NEXT_ROUND advances roundIndex),
  // kick off the intro -> countdown -> challenge sequence exactly once.
  const introStartedForRef = useRef<number>(-1);
  useEffect(() => {
    if (match.screen !== 'round_intro') return;
    if (cameraStatus !== 'granted') return;
    if (introStartedForRef.current === match.roundIndex) return;
    const challenge = currentChallenge(match);
    if (!challenge) return;
    introStartedForRef.current = match.roundIndex;
    runIntroThenCountdown(challenge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.screen, match.roundIndex, cameraStatus]);

  const beginFirstRound = useCallback(() => {
    // No-op trigger: the effect above starts the round automatically once
    // camera is granted and screen is 'round_intro' (set by startMatch/RESET).
  }, []);

  // ---------------- Debug controls ----------------

  const debugForceWin = useCallback((playerId: PlayerId) => {
    const challenge = currentChallenge(matchRef.current);
    if (!challenge) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const other: PlayerId = playerId === 'p1' ? 'p2' : 'p1';
    finalizeRound(
      challenge,
      capturesRef.current,
      challenge.duration * 1000,
      { [playerId]: 95, [other]: 20 } as Partial<Record<PlayerId, number>>,
    ).then((record) => {
      setLastRecord(record);
      dispatch({ type: 'APPLY_ROUND_RESULT', record });
    });
  }, []);

  const debugSkipRound = useCallback(() => {
    continueToNextRound();
  }, [continueToNextRound]);

  return {
    match,
    videoRef,
    cameraStatus,
    attachStreamToVideo,
    enableCamera,
    trackerStatus,
    fps,
    countdownValue,
    liveFeedback,
    lastRecord,
    auraBreak,
    challengeTimeLeft,
    debugOpen,
    setDebugOpen,
    customPrompt,
    setCustomPrompt,
    startMatch,
    goHome,
    rematch,
    continueToNextRound,
    beginFirstRound,
    winner: overallWinner(match),
    setPlayerName: (playerId: PlayerId, name: string) => dispatch({ type: 'SET_PLAYER_NAME', playerId, name }),
    debugForceWin,
    debugSkipRound,
  };
}

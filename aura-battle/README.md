# AURA BATTLE 🌀⚡

A browser-based, camera-powered "aura battle" party game. Two players stand in front of one
webcam (or one player vs. an AI-generated opponent) and race through fast, meme-y
mini-challenges — pose matching, hand gestures, freeze, freestyle "aura farming" — scored
live by on-device computer vision (MediaPipe Tasks Vision: pose + hand + face landmarkers,
all running **locally in the browser**, nothing streamed to a server).

This is a real, playable prototype — not a mockup.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

Needs a webcam and a modern Chromium/Safari-based browser (getUserMedia + WebAssembly SIMD).
Best on desktop Chrome/Edge or Safari/Chrome on iOS/Android.

## What's implemented (playable now)

- **Home → Mode Select → Camera Check → Player Setup → Battle → Final Result** full flow.
- Camera permission flow with explicit error states (denied / no camera / camera in use /
  unsupported browser) — the app never crashes if the camera is refused.
- **Local Battle mode**: one shared camera, split into a left/right player zone; pose (up to
  2 people), hands (up to 4), and face are all tracked simultaneously and assigned to the
  correct player by screen position.
- **AI Battle mode**: you vs. a bot that produces a randomized-but-plausible score band per
  round (a stand-in for a real opponent so the game is testable solo — see §7 Mode 2 of the
  spec). Swappable later for a real difficulty-tuned model.
- **8 fully working challenges**, each with real computer-vision scoring:
  - `67 / 6-7` — alternating raised-arm pose, hit-counted with a cooldown
  - `NPC Freeze` — stillness scoring from frame-to-frame landmark displacement
  - `Hand Gesture` — thumbs up / peace / open palm / fist / point, classified from raw hand
    landmark ratios, scored on reaction time
  - `Mirror` — Player 1's held pose becomes the live target Player 2 is scored against
    (scale/position-normalized pose-signature similarity)
  - `Mewing` — head tilt + yaw stability hold, from face landmarks
  - `SIUUU!` — celebration-pose similarity match
  - `Stare Down` — head-orientation + stillness hold
  - `Aura Farming` — freeform: pose-variety + movement-smoothness objective score, blended
    with a subjective "judge" score
  - `Custom Aura` — same freeform engine, but the *prompt* is whatever the player typed in
    Player Setup
- **Objective + subjective score blending** per challenge (`weights.objective` /
  `weights.subjective`, configurable per challenge — e.g. 67 is 95% objective, Aura Farming is
  60% subjective).
- **AI Judge is a pluggable, optional layer** (see below) — the game is fully playable and
  fun with **zero AI configured**, using an algorithmic local fallback judge.
- Round intro / 3-2-1-GO countdown / live score popups / combo-style hit pulses / an
  "⚡ AURA BREAK ⚡" flash+shake when a round score clears a threshold / round result screen /
  final result screen with a full round-by-round recap.
- Share button (Web Share API with clipboard fallback) and a **local-device leaderboard**
  (localStorage — see Scope below for what's *not* wired up).
- Debug panel (`import.meta.env.DEV` only): FPS, per-model load status, force-win buttons,
  skip-round.
- Dark neon "meme aesthetic" UI (Tailwind v4 + Framer Motion), responsive down to mobile,
  `prefers-reduced-motion` respected.

## Project structure

```
src/
  components/     CameraView, Countdown, ScoreDisplay, RoundIntro, RoundResult,
                   FinalResult, AuraBreak, Home, ModeSelect, PlayerSetup, Leaderboard, DebugPanel
  challenges/      one file per challenge + challengeRegistry.ts (the extension point —
                   adding a challenge means adding one file + one registry line, no engine changes)
  vision/          tracker.ts (MediaPipe wrapper), landmarkUtils, normalization,
                   gestureDetection, poseSimilarity, movementAnalysis
  scoring/         objectiveScoring, subjectiveScoring (local fallback judge), aiJudge
                   (optional pluggable AI), scoreEngine (combines the two per challenge weights)
  game/            types.ts, gameState.ts (reducer), roundManager.ts, useAuraMatch.ts
                   (the hook that runs the whole match loop)
  utils/           leaderboard.ts (localStorage)
```

## Environment variables

None are required. One optional var:

```
VITE_AI_JUDGE_URL=https://your-backend.example.com/aura-judge
```

If set, `Aura Farming` / `Custom Aura` (and any challenge with a nonzero subjective weight)
will POST `{ challengeId, prompt, features }` to that URL and expect back
`{ "score": number, "criteria": Record<string, number>, "comment"?: string }`. If it's unset,
times out, or returns something malformed, the game **silently falls back** to the local
algorithmic judge — the match never blocks on this.

**We deliberately did not wire a direct browser → LLM API call.** Doing that would mean
shipping an API key to every player's browser. `VITE_AI_JUDGE_URL` is meant to point at a
small backend you control that holds the real key and forwards a judged, structured-JSON
response — matching spec §24/§42's "no invented APIs, must run without AI configured" rule.

## What's stubbed / not implemented in this build

Being upfront about scope, per the spec's own phased plan (§41) — this build covers Phases
1-4 plus most of Phase 5/6, not the full 50-section spec in one shot:

- **Online multiplayer (Mode 3 / room codes)**: the `GameMode` type and UI entry point exist
  (disabled card on Mode Select) but there's no matchmaking/WebSocket server in this build.
  `challengeQueue` and scoring are already structured so a server just needs to broadcast
  `SET_SCREEN`/`APPLY_ROUND_RESULT`-shaped events to both clients.
- **Remaining challenges from the spec** (Rizz Face, Meme Pose, Perfect Timing, Copycat,
  Random Combo, Sigma Pose) are not built yet — the registry (`challengeRegistry.ts`) is the
  single place to add them; each is a self-contained file implementing the `Challenge`
  interface, no engine changes needed.
  Example (see any file in `src/challenges/`):
  ```ts
  export const challengeName: Challenge = {
    id, name, duration, trackingRequirements, weights, /* ... */
    onFrame(ctx) { /* live scoring */ },
    computeObjective(ctx) { /* final score, 0-100 */ },
  };
  ```
- **Anti-cheat / server-side score validation** (spec §37) — irrelevant until there's a real
  network multiplayer/backend leaderboard to cheat.
- **Global/daily/weekly/country leaderboard** — only a local-device leaderboard
  (localStorage) is implemented; a real one needs a backend.
- **Sound effects** (spec §38) — hooks exist in the UI (hit pulses, AURA BREAK, countdown) but
  no audio files are bundled; add files under `public/sounds/` and wire an `Audio()` call in
  the relevant component/challenge `onFrame`/`event` handler.
- **Replay of highlight moments** (spec §6/§33) is not implemented — `ScoreEvent` timestamps
  are already recorded per round, which is what a replay clip picker would key off of.
- **On-screen skeleton overlay** for debugging landmark tracking isn't drawn (the debug panel
  shows model-load/FPS status instead); the raw landmarks are available in every `onFrame`
  call if you want to add a `<canvas>` overlay.

## How to run it locally and test it end to end

1. `npm install && npm run dev`
2. Open the printed `localhost` URL in Chrome (needs HTTPS or localhost for camera access —
   `localhost` is exempt from the HTTPS requirement).
3. Home → PLAY → Local Battle → Camera Check → allow the camera → Player Setup → Start Battle.
4. Stand so both players are roughly on their own half of frame for Local Battle.
5. Play through all 9 rounds (67, Hand Gesture, Mirror, Freeze, Mewing, SIUUU, Stare Down,
   Aura Farming, Custom Aura) to Final Result, then try Rematch / New Battle / Share.
6. Try **Practice** from Home to jump straight into Local Battle's camera check.
7. Try **AI Battle** to confirm the solo/bot flow works without a second person.

## A note on "Aura Score"

Per spec §48: nothing here measures anything real about a person's appearance. Every
subjective score (`creativity` / `style` / `confidence` / `aura`) is derived only from
**motion features** — pose variety, movement smoothness, stability — never from how someone
looks. It's a game score, framed as one throughout the UI.

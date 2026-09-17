import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
  FaceLandmarker,
  type PoseLandmarkerResult,
  type HandLandmarkerResult,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { Landmark, PlayerId, TrackingFrame, TrackingRequirement } from '../game/types';

function avgX(landmarks: Landmark[]): number {
  if (!landmarks.length) return 0.5;
  return landmarks.reduce((sum, l) => sum + l.x, 0) / landmarks.length;
}

// All models are loaded from the jsDelivr CDN mirror of the official
// MediaPipe model assets, exactly as documented at
// https://ai.google.dev/edge/mediapipe/solutions/vision — no invented URLs.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export type TrackerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TrackerLoadProgress {
  pose: TrackerStatus;
  hand: TrackerStatus;
  face: TrackerStatus;
}

/**
 * Lazily loads only the MediaPipe landmarkers a challenge actually needs
 * (per spec §27: "don't run face + hand + pose heavy models at once if not
 * needed"), and runs them against a live <video> element on every animation
 * frame via GameLoop.
 */
export class Tracker {
  private poseLandmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private loadingPromise: Promise<void> | null = null;
  status: TrackerLoadProgress = { pose: 'idle', hand: 'idle', face: 'idle' };
  private onStatusChange?: (s: TrackerLoadProgress) => void;
  /** Whether to configure landmarkers for up to two people in one frame
   * (Local Battle mode, both players share one camera). */
  private twoPlayer: boolean;

  constructor(onStatusChange?: (s: TrackerLoadProgress) => void, twoPlayer = false) {
    this.onStatusChange = onStatusChange;
    this.twoPlayer = twoPlayer;
  }

  private notify() {
    this.onStatusChange?.({ ...this.status });
  }

  async ensureLoaded(requirements: TrackingRequirement[]): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.loadInternal(requirements);
    return this.loadingPromise;
  }

  private async loadInternal(requirements: TrackingRequirement[]): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);

    const tasks: Promise<void>[] = [];

    if (requirements.includes('body') && !this.poseLandmarker) {
      this.status.pose = 'loading';
      this.notify();
      tasks.push(
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: this.twoPlayer ? 2 : 1,
        })
          .then((lm) => {
            this.poseLandmarker = lm;
            this.status.pose = 'ready';
            this.notify();
          })
          .catch(() => {
            this.status.pose = 'error';
            this.notify();
          }),
      );
    }

    if (requirements.includes('hands') && !this.handLandmarker) {
      this.status.hand = 'loading';
      this.notify();
      tasks.push(
        HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: this.twoPlayer ? 4 : 2,
        })
          .then((lm) => {
            this.handLandmarker = lm;
            this.status.hand = 'ready';
            this.notify();
          })
          .catch(() => {
            this.status.hand = 'error';
            this.notify();
          }),
      );
    }

    if (requirements.includes('face') && !this.faceLandmarker) {
      this.status.face = 'loading';
      this.notify();
      tasks.push(
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: this.twoPlayer ? 2 : 1,
        })
          .then((lm) => {
            this.faceLandmarker = lm;
            this.status.face = 'ready';
            this.notify();
          })
          .catch(() => {
            this.status.face = 'error';
            this.notify();
          }),
      );
    }

    await Promise.all(tasks);
  }

  /** Runs whichever landmarkers are loaded against a video frame. Must be
   * called with a monotonically increasing timestamp (ms) per video element. */
  detect(video: HTMLVideoElement, timestampMs: number): TrackingFrame {
    let pose: TrackingFrame['pose'] = null;
    let leftHand: TrackingFrame['leftHand'] = null;
    let rightHand: TrackingFrame['rightHand'] = null;
    let face: TrackingFrame['face'] = null;

    if (this.poseLandmarker && video.readyState >= 2) {
      try {
        const result: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(video, timestampMs);
        pose = result.landmarks?.[0] ?? null;
      } catch {
        // Detector can throw if the video frame isn't ready yet; skip this frame.
      }
    }

    if (this.handLandmarker && video.readyState >= 2) {
      try {
        const result: HandLandmarkerResult = this.handLandmarker.detectForVideo(video, timestampMs);
        result.handedness?.forEach((cats, i) => {
          const label = cats[0]?.categoryName;
          // MediaPipe reports handedness from the subject's own perspective,
          // which is mirrored relative to a front-facing selfie camera.
          if (label === 'Left') rightHand = result.landmarks[i];
          else if (label === 'Right') leftHand = result.landmarks[i];
        });
      } catch {
        // skip frame
      }
    }

    if (this.faceLandmarker && video.readyState >= 2) {
      try {
        const result: FaceLandmarkerResult = this.faceLandmarker.detectForVideo(video, timestampMs);
        face = result.faceLandmarks?.[0] ?? null;
      } catch {
        // skip frame
      }
    }

    return { timestamp: timestampMs, pose, leftHand, rightHand, face };
  }

  /**
   * Local Battle mode: both players share one camera, video is mirrored
   * (CSS scaleX(-1)) for a natural selfie view. Raw MediaPipe landmark x
   * coordinates are NOT mirrored, so a larger raw x = further left on the
   * mirrored display. We sort detected people by raw x descending and
   * assign the first to whichever player is displayed on-screen-left, the
   * second to on-screen-right. Hands/face are assigned to the nearer body
   * by x-midpoint distance. This is a heuristic (not identity tracking) —
   * players should stay roughly on their own side of frame.
   */
  detectSplit(
    video: HTMLVideoElement,
    timestampMs: number,
    leftPlayerId: PlayerId,
    rightPlayerId: PlayerId,
  ): Record<PlayerId, TrackingFrame> {
    const empty = (): TrackingFrame => ({ timestamp: timestampMs, pose: null, leftHand: null, rightHand: null, face: null });
    const out: Record<PlayerId, TrackingFrame> = { p1: empty(), p2: empty() } as Record<PlayerId, TrackingFrame>;
    if (video.readyState < 2) return out;

    let poseXs: number[] = [];

    if (this.poseLandmarker) {
      try {
        const result = this.poseLandmarker.detectForVideo(video, timestampMs);
        const people = (result.landmarks ?? [])
          .map((pose) => ({ pose, x: avgX(pose) }))
          .sort((a, b) => b.x - a.x); // descending raw x -> left-of-mirrored-screen first
        poseXs = people.map((p) => p.x);
        if (people[0]) out[leftPlayerId].pose = people[0].pose;
        if (people[1]) out[rightPlayerId].pose = people[1].pose;
      } catch {
        // skip frame
      }
    }

    if (this.handLandmarker) {
      try {
        const result = this.handLandmarker.detectForVideo(video, timestampMs);
        result.landmarks?.forEach((hand, i) => {
          const hx = avgX(hand);
          const nearestIsLeft = poseXs.length >= 2 ? Math.abs(hx - poseXs[0]) <= Math.abs(hx - poseXs[1]) : hx > 0.5;
          const targetPlayer = nearestIsLeft ? leftPlayerId : rightPlayerId;
          const label = result.handedness?.[i]?.[0]?.categoryName;
          // Mirrored selfie view: MediaPipe's "Left"/"Right" is the subject's
          // own hand, which reads as the opposite side on a mirrored display.
          if (label === 'Left') out[targetPlayer].rightHand = hand;
          else out[targetPlayer].leftHand = hand;
        });
      } catch {
        // skip frame
      }
    }

    if (this.faceLandmarker) {
      try {
        const result = this.faceLandmarker.detectForVideo(video, timestampMs);
        const faces = (result.faceLandmarks ?? []).map((f) => ({ f, x: avgX(f) })).sort((a, b) => b.x - a.x);
        if (faces[0]) out[leftPlayerId].face = faces[0].f;
        if (faces[1]) out[rightPlayerId].face = faces[1].f;
      } catch {
        // skip frame
      }
    }

    return out;
  }

  dispose() {
    this.poseLandmarker?.close();
    this.handLandmarker?.close();
    this.faceLandmarker?.close();
    this.poseLandmarker = null;
    this.handLandmarker = null;
    this.faceLandmarker = null;
    this.loadingPromise = null;
    this.status = { pose: 'idle', hand: 'idle', face: 'idle' };
  }
}

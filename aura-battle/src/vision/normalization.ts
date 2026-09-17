// Landmarks from MediaPipe come back in normalized [0,1] image coordinates,
// which means raw pixel/coordinate distances are NOT comparable between two
// players who are different heights or standing at different distances from
// the camera. Every scoring function in this game must normalize distances
// by a body-scale reference (shoulder width, falling back to torso length)
// before comparing across players. See landmarkUtils.bodyScale/normalizedDist.

export { bodyScale, normalizedDist } from './landmarkUtils';

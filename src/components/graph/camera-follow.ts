import * as THREE from 'three';

/**
 * Keep the camera destination up to date.
 * Tiny layout jitter must not restart the fly-to, or the camera never finishes.
 */
export function followCameraTarget(
  current: THREE.Vector3 | null,
  next: THREE.Vector3,
  frames: { current: number }
): THREE.Vector3 {
  if (!current) {
    frames.current = 0;
    return next.clone();
  }
  if (current.distanceTo(next) > 8) frames.current = 0;
  current.copy(next);
  return current;
}

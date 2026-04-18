/**
 * ScoreSystem.ts
 * Pure scoring logic – maps distance from target center → score value.
 *
 * Ring layout (radius in pixels, relative to the Phaser scene target):
 *   0  – 28  px  → 10 (bullseye / gold)
 *   28 – 56  px  → 8  (inner red)
 *   56 – 84  px  → 6  (outer red)
 *   84 – 112 px  → 4  (inner blue)
 *   112 – 140 px → 2  (outer blue / black)
 *   > 140 px     → 0  (miss)
 */

export interface ScoreRing {
  maxRadius: number; // outer edge of this ring in px
  score: number;
}

/** Ordered from inside outward */
export const SCORE_RINGS: ScoreRing[] = [
  { maxRadius: 28,  score: 10 },
  { maxRadius: 56,  score: 8  },
  { maxRadius: 84,  score: 6  },
  { maxRadius: 112, score: 4  },
  { maxRadius: 140, score: 2  },
];

/** Outer radius of the whole target face */
export const TARGET_RADIUS = 140;

/**
 * Given a pixel distance from the target centre,
 * return the corresponding score (0 = miss).
 */
export function distanceToScore(distance: number): number {
  for (const ring of SCORE_RINGS) {
    if (distance <= ring.maxRadius) {
      return ring.score;
    }
  }
  return 0; // miss
}

/**
 * Human-readable label for a score value.
 */
export function scoreLabel(score: number): string {
  switch (score) {
    case 10: return 'Bullseye! 🎯';
    case 8:  return 'Excellent! ⭐';
    case 6:  return 'Good! 👍';
    case 4:  return 'Okay 👌';
    case 2:  return 'Near Miss…';
    default: return 'Miss! 💨';
  }
}

/**
 * Ring colour look-up (matches the colours drawn on the target).
 */
export function ringColor(score: number): string {
  switch (score) {
    case 10: return '#FFD700'; // Gold
    case 8:  return '#e74c3c'; // Red
    case 6:  return '#c0392b'; // Dark Red
    case 4:  return '#3498db'; // Blue
    case 2:  return '#2c3e50'; // Dark Blue/Black
    default: return '#7f8c8d'; // Grey
  }
}

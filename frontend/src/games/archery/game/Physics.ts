/**
 * Physics.ts
 * Helper maths used by the Phaser scene for arrow trajectory simulation.
 *
 * The bow is on the LEFT side of the canvas, the target on the RIGHT.
 * The player drags the mouse LEFT/DOWN to pull the bowstring back;
 * releasing fires the arrow toward the target with physics applied.
 */

export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Convert a drag vector (from bow anchor to current mouse position)
 * into an initial arrow velocity.
 *
 * @param dragStart  – position where the drag started (bow anchor)
 * @param dragEnd    – current mouse position while dragging
 * @param power      – multiplier to tune overall arrow speed
 * @returns velocity vector {vx, vy}
 */
export function dragToVelocity(
  dragStart: Vector2,
  dragEnd: Vector2,
  power = 4.5,
): Vector2 {
  // The arrow travels in the OPPOSITE direction of the drag
  const dx = dragStart.x - dragEnd.x;
  const dy = dragStart.y - dragEnd.y;
  return { x: dx * power, y: dy * power };
}

/**
 * Clamp drag magnitude so players can't launch infinitely fast arrows.
 */
export function clampDrag(
  dragStart: Vector2,
  dragEnd: Vector2,
  maxDist = 110,
): Vector2 {
  const dx = dragEnd.x - dragStart.x;
  const dy = dragEnd.y - dragStart.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= maxDist) return dragEnd;
  const scale = maxDist / dist;
  return {
    x: dragStart.x + dx * scale,
    y: dragStart.y + dy * scale,
  };
}

/**
 * Euclidean distance between two points.
 */
export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Rotation angle (radians) that makes a sprite face its velocity direction.
 */
export function velocityAngle(velocity: Vector2): number {
  return Math.atan2(velocity.y, velocity.x);
}

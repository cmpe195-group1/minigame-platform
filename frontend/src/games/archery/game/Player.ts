/**
 * Player.ts
 * Defines the Player data model and related types.
 */

export interface Arrow {
  round: number;
  score: number;
  distanceFromCenter: number; // in pixels, used for ring detection
}

export interface Player {
  id: number;
  name: string;
  color: string;         // Hex color used to tint the archer / arrows
  scores: Arrow[];       // History of every arrow shot
  totalScore: number;
}

/** Available player colors (one per slot) */
export const PLAYER_COLORS: string[] = [
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f39c12', // Orange
];

/** Display names assigned by default */
export const DEFAULT_NAMES: string[] = [
  'Player 1',
  'Player 2',
  'Player 3',
  'Player 4',
];

/**
 * Factory – create a fresh Player object.
 */
export function createPlayer(id: number, name?: string): Player {
  return {
    id,
    name: name ?? DEFAULT_NAMES[id - 1],
    color: PLAYER_COLORS[id - 1],
    scores: [],
    totalScore: 0,
  };
}

/**
 * Return a sorted (descending) copy of the player array for the leaderboard.
 */
export function rankPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => b.totalScore - a.totalScore);
}

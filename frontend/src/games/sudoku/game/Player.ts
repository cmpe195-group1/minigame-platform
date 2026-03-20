export interface Player {
  id: number;
  name: string;
  color: string;
  colorName: string;
  score: number;
}

export const PLAYER_COLORS: { color: string; colorName: string }[] = [
  { color: "#3B82F6", colorName: "Blue" },
  { color: "#22C55E", colorName: "Green" },
  { color: "#F97316", colorName: "Orange" },
  { color: "#A855F7", colorName: "Purple" },
];

export function createPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    color: PLAYER_COLORS[i].color,
    colorName: PLAYER_COLORS[i].colorName,
    score: 0,
  }));
}

export type Player = "A" | "B";

export interface PuckMeta {
  player: Player;
  angle: number;
  power: number;
}
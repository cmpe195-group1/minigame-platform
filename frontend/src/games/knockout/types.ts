export type Player = "A" | "B";

export interface PuckState {
  id: string;
  player: Player;
  x: number;
  y: number;
  active: boolean;
}

export interface KnockoutGameState {
  currentPlayer: Player;
  phase: "aiming" | "waiting" | "finished";
  winner: Player | null;
  turnNumber: number;
  pucks: PuckState[];
}

export interface KnockoutStatus {
  currentPlayer: Player;
  phase: "aiming" | "waiting" | "finished";
  aRemaining: number;
  bRemaining: number;
  winner: Player | null;
}

export interface LocalShotPayload {
  puckId: string;
  impulseX: number;
  impulseY: number;
  turnNumber: number;
}

export interface ShotReplayPayload extends LocalShotPayload {
  shooterClientId: string;
}
export type Player = "white" | "black";

export interface Piece {
  color: Player;
  king: boolean;
}

export type Board = (Piece | null)[][];

export interface Position {
  x: number;
  y: number;
}

export interface CheckersState {
  board: Board;
  turn: Player;
  selected: Position | null;
}

export type Action =
  | { type: "SELECT"; x: number; y: number }
  | { type: "MOVE"; x: number; y: number };
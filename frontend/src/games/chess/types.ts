export type Player = "white" | "black";

export interface Position {
  x: number;
  y: number;
}

export type Color = "white" | "black";
export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";

export interface Piece {
  type: PieceType;
  color: Color;
  hasMoved: boolean;
}

export type Board = (Piece | null)[][];

export interface ChessState {
  board: Board;
  turn: Color;
  selected: Position | null;
}

export type Action =
  | { type: "SELECT"; x: number; y: number }
  | { type: "MOVE"; x: number; y: number }
  | { type: "RESET" };
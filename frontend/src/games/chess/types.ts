export type Color = "white" | "black";
export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";

export interface Piece {
  type: PieceType;
  color: Color;
  hasMoved: boolean; // For tracking moves relevant to castling and en passant
}

export type Board = (Piece | null)[][];

export interface ChessState {
  board: Board;
  turn: Color;
  selectedSquare: { x: number; y: number } | null;
  history: ChessState[];
}

export type Action =
  | { type: "SELECT"; x: number; y: number }
  | { type: "MOVE"; x: number; y: number }
  | { type: "RESET" }
  | { type: "UNDO" };
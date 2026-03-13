export type Color = "white" | "black";
export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Board = (Piece | null)[][];

export interface ChessState {
  board: Board;
  turn: Color;
  selectedSquare: { x: number; y: number } | null;
}
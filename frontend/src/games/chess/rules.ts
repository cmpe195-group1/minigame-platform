import type { Board, Piece } from "./types";

const emptyRow = (): (Piece | null)[] => Array.from({ length: 8 }, () => null);

function makePawnRow(color: "white" | "black"): Piece[] {
  return Array.from({ length: 8 }, () => ({
    type: "pawn",
    color,
    hasMoved: false,
  }));
}

function backRank(color: "white" | "black"): Piece[] {
  return [
    { type: "rook", color, hasMoved: false },
    { type: "knight", color, hasMoved: false },
    { type: "bishop", color, hasMoved: false },
    { type: "queen", color, hasMoved: false },
    { type: "king", color, hasMoved: false },
    { type: "bishop", color, hasMoved: false },
    { type: "knight", color, hasMoved: false },
    { type: "rook", color, hasMoved: false },
  ];
}

export function createInitialBoard(): Board {
  return [
    backRank("black"),
    makePawnRow("black"),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    makePawnRow("white"),
    backRank("white"),
  ];
}
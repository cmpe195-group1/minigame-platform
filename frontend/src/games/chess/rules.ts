import type { Board, Piece } from "./types";

const emptyRow = Array(8).fill(null);

export function createInitialBoard(): Board {
  const backRank = (color: "white" | "black"): Piece[] => [
    { type: "rook", color },
    { type: "knight", color },
    { type: "bishop", color },
    { type: "queen", color },
    { type: "king", color },
    { type: "bishop", color },
    { type: "knight", color },
    { type: "rook", color },
  ];

  return [
    backRank("black"),
    Array(8).fill({ type: "pawn", color: "black" }),
    [...emptyRow],
    [...emptyRow],
    [...emptyRow],
    [...emptyRow],
    Array(8).fill({ type: "pawn", color: "white" }),
    backRank("white"),
  ];
}
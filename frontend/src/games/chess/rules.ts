import type { Board, Piece } from "./types";

const emptyRow = Array(8).fill(null);

export function createInitialBoard(): Board {
  const backRank = (color: "white" | "black"): Piece[] => [
    { type: "rook", color, hasMoved: false },
    { type: "knight", color, hasMoved: false },
    { type: "bishop", color,  hasMoved: false },
    { type: "queen", color,  hasMoved: false },
    { type: "king", color, hasMoved: false   },
    { type: "bishop", color,  hasMoved: false },
    { type: "knight", color, hasMoved: false },
    { type: "rook", color, hasMoved: false },
  ];

  return [
    backRank("black"),
    Array(8).fill({ type: "pawn", color: "black", hasMoved: false }),
    [...emptyRow],
    [...emptyRow],
    [...emptyRow],
    [...emptyRow],
    Array(8).fill({ type: "pawn", color: "white", hasMoved: false }),
    backRank("white"),
  ];
}
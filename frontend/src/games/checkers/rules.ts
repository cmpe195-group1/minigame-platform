import type { Board, Piece } from "./types";

export function createInitialBoard(): Board {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 8; x++) {
      if ((x + y) % 2 === 1) {
        board[y][x] = { color: "black", king: false };
      }
    }
  }

  for (let y = 5; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if ((x + y) % 2 === 1) {
        board[y][x] = { color: "white", king: false };
      }
    }
  }

  return board;
}
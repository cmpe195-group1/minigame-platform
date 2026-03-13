import type { ChessState } from "./types";

export function chessReducer(
  state: ChessState,
  action: { type: "SELECT"; x: number; y: number } | { type: "MOVE"; x: number; y: number }
): ChessState {
  switch (action.type) {
    case "SELECT":
      return { ...state, selectedSquare: { x: action.x, y: action.y } };

    case "MOVE":
      if (!state.selectedSquare) return state;

      const newBoard = state.board.map(row => [...row]);
      const piece = newBoard[state.selectedSquare.y][state.selectedSquare.x];

      newBoard[state.selectedSquare.y][state.selectedSquare.x] = null;
      newBoard[action.y][action.x] = piece;

      return {
        board: newBoard,
        selectedSquare: null,
        turn: state.turn === "white" ? "black" : "white",
      };

    default:
      return state;
  }
}
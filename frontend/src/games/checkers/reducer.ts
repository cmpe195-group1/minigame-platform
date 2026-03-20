import type { CheckersState, Action } from "./types";

export function checkersReducer(
  state: CheckersState,
  action: Action
): CheckersState {
  switch (action.type) {
    case "SELECT": {
      const piece = state.board[action.y][action.x];

      // enforce turn
      if (!piece || piece.color !== state.turn) {
        return state;
      }

      return {
        ...state,
        selected: { x: action.x, y: action.y },
      };
    }

    case "MOVE": {
      if (!state.selected) return state;

      const newBoard = state.board.map(row => [...row]);

      const piece = newBoard[state.selected.y][state.selected.x];
      if (!piece) return state;

      const target = newBoard[action.y][action.x];

      // can't capture own piece
      if (target && target.color === piece.color) {
        return state;
      }

      // move
      newBoard[state.selected.y][state.selected.x] = null;
      newBoard[action.y][action.x] = piece;

      // king promotion
      if (piece.color === "white" && action.y === 0) {
        piece.king = true;
      }
      if (piece.color === "black" && action.y === 7) {
        piece.king = true;
      }

      return {
        board: newBoard,
        selected: null,
        turn: state.turn === "white" ? "black" : "white",
      };
    }

    default:
      return state;
  }
}
import type { CheckersState, Action, Piece } from "./types";

function canCapture(board: (Piece | null)[][], x: number, y: number): boolean {
  const piece = board[y][x];
  if (!piece) return false;
  const dir = getDirection(piece.color);

  const captures = [
    { dx: 2, dy: 2 * dir },
    { dx: -2, dy: 2 * dir },  
    { dx: 2, dy: -2 * dir },
    { dx: -2, dy: -2 * dir },
  ];

  for (const { dx, dy } of captures) {
    const tx = x + dx;
    const ty = y + dy;
    const midX = x + dx / 2;
    const midY = y + dy / 2;
    if (isInside(tx, ty) && isInside(midX, midY)) {
      const target = board[ty][tx];
      const middle = board[midY][midX];
      if (!target && middle && middle.color !== piece.color) {
        return true;
      }
    }
  }
  return false;
}

function isInside(x: number, y: number) {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function getDirection(color: "white" | "black") {
  return color === "white" ? -1 : 1;
}

export function checkersReducer(
  state: CheckersState,
  action: Action
): CheckersState {
  switch (action.type) {
    case "SELECT": {
      const piece = state.board[action.y][action.x];

      // ❌ can't select empty or opponent piece
      if (!piece || piece.color !== state.turn) return state;

      return {
        ...state,
        selected: { x: action.x, y: action.y },
      };
    }

    case "MOVE": {
      if (!state.selected) return state;

      const { x: sx, y: sy } = state.selected;
      const { x: tx, y: ty } = action;

      const piece = state.board[sy][sx];
      if (!piece) return { ...state, selected: null };

      const dx = tx - sx;
      const dy = ty - sy;

      const newBoard = state.board.map((row) => [...row]);

      // ❌ must move to empty square
      if (newBoard[ty][tx] !== null) return { ...state, selected: null };

      const dir = getDirection(piece.color);

      // =========================
      // 🟢 NORMAL MOVE (1 step)
      // =========================
      if (
        Math.abs(dx) === 1 &&
        (piece.king ? Math.abs(dy) === 1 : dy === dir)
      ) {
        newBoard[sy][sx] = null;
        newBoard[ty][tx] = piece;

        // 🔥 PROMOTION
        if (
          (piece.color === "white" && ty === 0) ||
          (piece.color === "black" && ty === 7)
        ) {
          newBoard[ty][tx] = { ...piece, king: true };
        }

        return {
          board: newBoard,
          selected: null,
          turn: state.turn === "white" ? "black" : "white",
        };
      }

      // =========================
      // 🔴 CAPTURE MOVE (jump)
      // =========================
      if (
        Math.abs(dx) === 2 &&
        (piece.king ? Math.abs(dy) === 2 : dy === 2 * dir)
      ) {
        const midX = sx + dx / 2;
        const midY = sy + dy / 2;

        const middlePiece = newBoard[midY][midX];

        // ❌ must capture opponent
        if (!middlePiece || middlePiece.color === piece.color) {
          return { ...state, selected: null };
        }

        // remove captured piece
        newBoard[midY][midX] = null;

        // move piece
        newBoard[sy][sx] = null;
        newBoard[ty][tx] = piece;

        // if can capture on next turn, don't switch player
        if (canCapture(newBoard, tx, ty)) {
          return {
            board: newBoard,
            selected: { x: tx, y: ty },
            turn: state.turn,
          };
        }

        // 🔥 PROMOTION
        if (
          (piece.color === "white" && ty === 0) ||
          (piece.color === "black" && ty === 7)
        ) {
          newBoard[ty][tx] = { ...piece, king: true };
        }

        return {
          board: newBoard,
          selected: null,
          turn: state.turn === "white" ? "black" : "white",
        };
      }

      return { ...state, selected: null };
    }

    default:
      return state;
  }
}
import type { ChessState, Piece } from "./types";

export function chessReducer(
  state: ChessState,
  action: { type: "SELECT"; x: number; y: number } | { type: "MOVE"; x: number; y: number }
): ChessState {
  switch (action.type) {
    case "SELECT": {
      const piece = state.board[action.y][action.x];
      if (!piece || piece.color !== state.turn) return state;
      return { ...state, selected: { x: action.x, y: action.y } };
    }

    case "MOVE": {
      if (!state.selected) return { ...state, selected: null };

      const selected = state.selected;
      const selectedPiece = state.board[selected.y][selected.x];
      if (!selectedPiece) return { ...state, selected: null };

      const targetPiece = state.board[action.y][action.x];
      if (targetPiece && targetPiece.color === state.turn) {
        return { ...state, selected: null };
      }

      const dx = action.x - selected.x;
      const dy = action.y - selected.y;

      if (!validatePieceMove(state, selectedPiece, dx, dy)) {
        return { ...state, selected: null };
      }

      const newBoard = state.board.map((row) =>
        row.map((piece) => (piece ? { ...piece } : null))
      );

      const movedPiece = newBoard[selected.y][selected.x];
      newBoard[selected.y][selected.x] = null;
      newBoard[action.y][action.x] = movedPiece;

      if (movedPiece) {
        movedPiece.hasMoved = true;
      }

      if (movedPiece?.type === "king" && Math.abs(dx) === 2) {
        const rookFromX = dx > 0 ? 7 : 0;
        const rookToX = dx > 0 ? action.x - 1 : action.x + 1;
        const rook = newBoard[selected.y][rookFromX];
        newBoard[selected.y][rookFromX] = null;
        newBoard[selected.y][rookToX] = rook ? { ...rook, hasMoved: true } : null;
      }

      if (movedPiece?.type === "pawn" && promotionCheck(state, movedPiece, dx, dy)) {
        newBoard[action.y][action.x] = {
          type: "queen",
          color: movedPiece.color,
          hasMoved: true,
        };
      }

      if (movedPiece?.type === "pawn" && enPassantCheck(state, movedPiece, dx, dy)) {
        newBoard[selected.y][selected.x + dx] = null;
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

function noPieceInWay(state: ChessState, fromX: number, fromY: number, toX: number, toY: number) {
  const dx = Math.sign(toX - fromX);
  const dy = Math.sign(toY - fromY);
  let x = fromX + dx;
  let y = fromY + dy;

  while (x !== toX || y !== toY) {
    if (state.board[y][x] !== null) return false;
    x += dx;
    y += dy;
  }

  return true;
}

function validatePieceMove(state: ChessState, piece: Piece, dx: number, dy: number) {
  if (!state.selected) return false;

  if (
    piece.type !== "knight" &&
    !noPieceInWay(state, state.selected.x, state.selected.y, state.selected.x + dx, state.selected.y + dy)
  ) {
    return false;
  }

  switch (piece.type) {
    case "pawn": {
      const dir = piece.color === "white" ? -1 : 1;

      if (dx === 0 && dy === dir && state.board[state.selected.y + dir][state.selected.x] === null) {
        return true;
      }

      if (
        dx === 0 &&
        dy === 2 * dir &&
        !piece.hasMoved &&
        state.board[state.selected.y + dir][state.selected.x] === null &&
        state.board[state.selected.y + 2 * dir][state.selected.x] === null
      ) {
        return true;
      }

      if (Math.abs(dx) === 1 && dy === dir) {
        const target = state.board[state.selected.y + dir][state.selected.x + dx];
        if (target && target.color !== piece.color) return true;
        if (enPassantCheck(state, piece, dx, dy)) return true;
      }

      return false;
    }

    case "bishop":
      return Math.abs(dx) === Math.abs(dy);

    case "rook":
      return dx === 0 || dy === 0;

    case "knight":
      return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);

    case "queen":
      return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);

    case "king":
      if (castleCheck(state, piece, dx, dy)) return true;
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;

    default:
      return false;
  }
}

function castleCheck(state: ChessState, piece: Piece, dx: number, dy: number) {
  if (!state.selected || piece.type !== "king" || piece.hasMoved || dy !== 0) return false;

  if (dx === 2) {
    const rook = state.board[state.selected.y][7];
    if (rook?.type === "rook" && !rook.hasMoved && rook.color === piece.color) {
      for (let x = 5; x < 7; x++) {
        if (state.board[state.selected.y][x] !== null) return false;
      }
      return true;
    }
  }

  if (dx === -2) {
    const rook = state.board[state.selected.y][0];
    if (rook?.type === "rook" && !rook.hasMoved && rook.color === piece.color) {
      for (let x = 1; x < 4; x++) {
        if (state.board[state.selected.y][x] !== null) return false;
      }
      return true;
    }
  }

  return false;
}

function enPassantCheck(state: ChessState, piece: Piece, dx: number, dy: number) {
  if (!state.selected || piece.type !== "pawn") return false;
  const dir = piece.color === "white" ? -1 : 1;

  if (Math.abs(dx) === 1 && dy === dir) {
    const target = state.board[state.selected.y][state.selected.x + dx];
    return !!target && target.type === "pawn" && target.color !== piece.color && target.hasMoved;
  }

  return false;
}

function promotionCheck(state: ChessState, piece: Piece, _dx: number, dy: number) {
  if (!state.selected || piece.type !== "pawn") return false;
  const targetY = state.selected.y + dy;
  return (piece.color === "white" && targetY === 0) || (piece.color === "black" && targetY === 7);
}
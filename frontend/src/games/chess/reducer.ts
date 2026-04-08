import type { ChessState } from "./types";

export function chessReducer(
  state: ChessState,
  action: { type: "SELECT"; x: number; y: number } | { type: "MOVE"; x: number; y: number }
): ChessState {
  switch (action.type) {
    case "SELECT":
      //piece at the selected square
      const p = state.board[action.y][action.x];

      // can't select empty or opponent piece
      if (!p || p.color !== state.turn) return state;
      return { ...state, selectedSquare: { x: action.x, y: action.y } };
    case "MOVE":
      // can't move if no piece is selected
      if (!state.selectedSquare) return { ...state, selectedSquare: null };

      // can't move to a square occupied by own piece
      const targetPiece = state.board[action.y][action.x];
      if (targetPiece && targetPiece.color === state.turn) return { ...state, selectedSquare: null };

      //validate piece move
      if (!validatePieceMove(state, state.board[state.selectedSquare.y][state.selectedSquare.x], action.x - state.selectedSquare.x, action.y - state.selectedSquare.y)) {
        return { ...state, selectedSquare: null };
      }

      const newBoard = state.board.map(row => [...row]);
      const piece = newBoard[state.selectedSquare.y][state.selectedSquare.x];

      newBoard[state.selectedSquare.y][state.selectedSquare.x] = null;
      newBoard[action.y][action.x] = piece;

      if (piece?.type === "king" && Math.abs(action.x - state.selectedSquare.x) === 2) {
        // Castling
        let dx = (action.x - state.selectedSquare.x > 0 ? 1 : -1);
        if (action.x > state.selectedSquare.x) {
          // Kingside
          newBoard[state.selectedSquare.y][7] = null;
          newBoard[state.selectedSquare.y][action.x - dx] = { type: "rook", color: piece.color, hasMoved: true };
        } else {
          // Queenside
          newBoard[state.selectedSquare.y][0] = null;
          newBoard[state.selectedSquare.y][action.x - dx] = { type: "rook", color: piece.color, hasMoved: true };
        }
      }

      updateMovedPieces(state, piece, state.selectedSquare.x, state.selectedSquare.y, action.x, action.y);

      return {
        board: newBoard,
        selectedSquare: null,
        turn: state.turn === "white" ? "black" : "white",
        history: [...state.history, state], // Track moved squares for special moves
      };

    default:
      return state;
  }
}

function updateMovedPieces(state: ChessState, piece: ChessState["board"][number][number], fromX: number, fromY: number, toX: number, toY: number) {
  // Track moved squares for special moves like castling or en passant
  if (!piece) return null;

  if (piece.type === "king" || piece.type === "rook") {
    piece.hasMoved = true;
  }
  if (piece.type === "pawn" && Math.abs(toY - fromY) === 2) {
    piece.hasMoved = true;  
  }
}

function noPieceInWay(state: ChessState, fromX: number, fromY: number, toX: number, toY: number) {
  const dx = Math.sign(toX - fromX);
  const dy = Math.sign(toY - fromY);

  let x = fromX + dx;
  let y = fromY + dy;
  while (x !== toX || y !== toY) {
    if (state.board[y][x] !== null) {
      return false;
    }
    x += dx;
    y += dy;
  } 
  return true;
}

function validatePieceMove(state: ChessState, piece: ChessState["board"][number][number], dx: number, dy: number) {
  if (!piece) return false; 

  if (piece.type !== "knight" && !noPieceInWay(state, state.selectedSquare!.x, state.selectedSquare!.y, state.selectedSquare!.x + dx, state.selectedSquare!.y + dy)) {
    return false; 
  }

  switch (piece.type) {
    case "pawn":
      const dir = piece.color === "white" ? -1 : 1;
      if (promotionCheck(state, piece, dx, dy)) {
        state["board"][state.selectedSquare!.y][state.selectedSquare!.x] = { type: "queen", color: piece.color, hasMoved: true }; // Auto-promote to queen for simplicity
        return true;
      }
      if (enPassantCheck(state, piece, dx, dy)) return true;
      // Normal move
      if (dx === 0 && dy === dir) return true;  
      // Initial double move
      if (dx === 0 && dy === 2 * dir && ((piece.color === "white" && state.selectedSquare!.y === 6) || (piece.color === "black" && state.selectedSquare!.y === 1))) {
        piece.hasMoved = true; // Mark pawn as having moved for en passant
        return true;
      }
      // Captures
      if (Math.abs(dx) === 1 && dy === dir) {
        const target = state.board[state.selectedSquare!.y + dir][state.selectedSquare!.x + dx];
        return target !== null && target.color !== piece.color;
      }
      return false;
    case "bishop":
      return Math.abs(dx) === Math.abs(dy); 
    case "rook":
      return dx === 0 || dy === 0;
    case "knight":
      return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
    case "queen": 
      return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
    case "king":
      if (castleCheck(state, piece, dx, dy)) {
        piece.hasMoved = true; // Mark king as having moved for castling
        return true;
      }
      
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    default:
      return false;
  }

  function castleCheck(state: ChessState, piece: ChessState["board"][number][number], dx: number, dy: number) {
    // Castling logic would go here (not implemented in this basic version)
    if (piece?.type !== "king" || piece.hasMoved) return false;
    
    if (dx === 2 && dy === 0) {
      // Kingside castling
      const rook = state.board[state.selectedSquare!.y][7];
      
      if (rook?.type === "rook" && !rook.hasMoved && rook.color === piece.color) {
        // Check if squares between king and rook are empty
        for (let x = 5; x < 7; x++) {
          if (state.board[state.selectedSquare!.y][x] !== null) {
            return false;
          }
        }
        return true;
      }
    }

    if (dx === -2 && dy === 0) {
      // Queenside castling
      const rook = state.board[state.selectedSquare!.y][0];
      if(rook?.type === "rook" && !rook.hasMoved && rook.color === piece.color) {
        // Check if squares between king and rook are empty
        for (let x = 1; x < 4; x++) {
          if (state.board[state.selectedSquare!.y][x] !== null) {
            return false;
          }
        }

        return true;
      }
    }

    return false;
  }

  function enPassantCheck(state: ChessState, piece: ChessState["board"][number][number], dx: number, dy: number) {
    if (piece?.type !== "pawn") return false;

    const dir = piece.color === "white" ? -1 : 1;
    if (Math.abs(dx) === 1 && dy === dir) {
      const target = state.board[state.selectedSquare!.y][state.selectedSquare!.x + dx];
      return target?.type === "pawn" && target.color !== piece.color && target.hasMoved;
    }

    return false;
  }

  function promotionCheck(state: ChessState, piece: ChessState["board"][number][number], dx: number, dy: number) {
    // Promotion logic would go here (not implemented in this basic version)
    if (piece?.type !== "pawn") return false;
    const targetY = state.selectedSquare!.y + dy;
    if ((piece.color === "white" && targetY === 0) || (piece.color === "black" && targetY === 7)) {
      return true; 
    }
  }
}
import { type Board, cloneBoard, isBoardFull } from "./SudokuBoard";
import { type Player, createPlayers } from "./Player";
import { generateSudokuBoard, checkPlacement } from "./SudokuGenerator";

export type GamePhase = "setup" | "playing" | "finished";

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  board: Board;
  winner: Player | null;
  lastMoveCorrect: boolean | null;
  moveCount: number;
}

export interface MoveResult {
  correct: boolean;
  boardFull: boolean;
  winner: Player | null;
}

/** Create the initial game state (before a puzzle is loaded) */
export function createInitialState(playerCount: number): GameState {
  const players = createPlayers(playerCount);
  const board = generateSudokuBoard(36);
  return {
    phase: "playing",
    players,
    currentPlayerIndex: 0,
    board,
    winner: null,
    lastMoveCorrect: null,
    moveCount: 0,
  };
}

/** Apply a player's move; returns mutation result + updated state */
export function applyMove(
  state: GameState,
  row: number,
  col: number,
  num: number
): { newState: GameState; result: MoveResult } {
  const cell = state.board[row][col];
  if (cell.isGiven || cell.value !== 0) {
    // Cell already filled – ignore
    return { newState: state, result: { correct: false, boardFull: false, winner: null } };
  }

  const correct = checkPlacement(state.board, row, col, num);

  // Clone board and update cell
  const newBoard = cloneBoard(state.board);
  newBoard[row][col].value = num;
  newBoard[row][col].playerId = state.players[state.currentPlayerIndex].id;
  newBoard[row][col].isCorrect = correct;

  // Update scores
  const newPlayers = state.players.map((p, i) => {
    if (i === state.currentPlayerIndex && correct) {
      return { ...p, score: p.score + 1 };
    }
    return { ...p };
  });

  const boardFull = isBoardFull(newBoard);

  let winner: Player | null = null;
  if (boardFull) {
    const sorted = [...newPlayers].sort((a, b) => b.score - a.score);
    winner = sorted[0];
  }

  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

  const newState: GameState = {
    ...state,
    board: newBoard,
    players: newPlayers,
    currentPlayerIndex: boardFull ? state.currentPlayerIndex : nextPlayerIndex,
    phase: boardFull ? "finished" : "playing",
    winner,
    lastMoveCorrect: correct,
    moveCount: state.moveCount + 1,
  };

  return { newState, result: { correct, boardFull, winner } };
}

/** Generate a fresh board, keep players & reset scores */
export function newPuzzle(state: GameState): GameState {
  const freshPlayers = state.players.map((p) => ({ ...p, score: 0 }));
  const board = generateSudokuBoard(36);
  return {
    ...state,
    board,
    players: freshPlayers,
    currentPlayerIndex: 0,
    phase: "playing",
    winner: null,
    lastMoveCorrect: null,
    moveCount: 0,
  };
}

/** Restart completely (go back to setup screen) */
export function restartGame(): GameState {
  return {
    phase: "setup",
    players: [],
    currentPlayerIndex: 0,
    board: [] as unknown as Board,
    winner: null,
    lastMoveCorrect: null,
    moveCount: 0,
  };
}

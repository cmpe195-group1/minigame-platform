/**
 * GameLogic.ts - Main game logic for Battleship
 *
 * Supports five game modes:
 * - "vs_computer": Player vs AI (random attacks)
 * - "multiplayer_local": Two players on the same device
 * - "multiplayer_online": Two players via BroadcastChannel/WebSocket
 * - "multiplayer_local_4p": Four players on the same device
 * - "multiplayer_online_4p": Four players via BroadcastChannel/WebSocket
 */

import { Board } from "./Board";

/** Possible game states */
export type GameStatus =
  | "playing"
  | "player1_wins"
  | "player2_wins"
  | "player3_wins"
  | "player4_wins";

/** Game mode */
export type GameMode =
  | "vs_computer"
  | "multiplayer_local"
  | "multiplayer_online"
  | "multiplayer_local_4p"
  | "multiplayer_online_4p";

/** Whose turn it is */
export type Turn = "player1" | "player2" | "player3" | "player4";

/** All turns in order */
const TURN_ORDER: Turn[] = ["player1", "player2", "player3", "player4"];

/** Check if mode is a 4-player mode */
export function is4PlayerMode(mode: GameMode): boolean {
  return mode === "multiplayer_local_4p" || mode === "multiplayer_online_4p";
}

/** Map turn to player index (0-3) */
export function turnToIndex(turn: Turn): number {
  return TURN_ORDER.indexOf(turn);
}

/** Map player index (0-3) to turn */
export function indexToTurn(index: number): Turn {
  return TURN_ORDER[index];
}

/** Main game logic class */
export class GameLogic {
  board1: Board;
  board2: Board;
  board3: Board;
  board4: Board;
  turn: Turn;
  status: GameStatus;
  mode: GameMode;
  eliminatedPlayers: Set<Turn>;

  constructor(mode: GameMode = "vs_computer") {
    this.board1 = new Board();
    this.board2 = new Board();
    this.board3 = new Board();
    this.board4 = new Board();
    this.turn = "player1";
    this.status = "playing";
    this.mode = mode;
    this.eliminatedPlayers = new Set();

    // In online modes, boards are set up separately
    if (mode !== "multiplayer_online" && mode !== "multiplayer_online_4p") {
      this.board1.placeShipsRandomly();
      this.board2.placeShipsRandomly();
      if (is4PlayerMode(mode)) {
        this.board3.placeShipsRandomly();
        this.board4.placeShipsRandomly();
      }
    }
  }

  /** Get all boards as an array [board1, board2, board3, board4] */
  getBoards(): Board[] {
    return [this.board1, this.board2, this.board3, this.board4];
  }

  /** Get board by player index (0-3) */
  getBoardByIndex(index: number): Board {
    return this.getBoards()[index];
  }

  /** Get board by turn */
  getBoardByTurn(turn: Turn): Board {
    return this.getBoardByIndex(turnToIndex(turn));
  }

  /** Player 1 attacks a cell on board 2 */
  player1Attack(col: number, row: number): "hit" | "miss" | "invalid" {
    if (this.status !== "playing" || this.turn !== "player1") return "invalid";

    const result = this.board2.receiveAttack(col, row);
    if (result === "invalid") return "invalid";

    if (this.board2.allShipsSunk()) {
      this.status = "player1_wins";
      return result;
    }

    this.turn = "player2";
    return result;
  }

  /** Player 2 attacks a cell on board 1 */
  player2Attack(col: number, row: number): "hit" | "miss" | "invalid" {
    if (this.status !== "playing" || this.turn !== "player2") return "invalid";

    const result = this.board1.receiveAttack(col, row);
    if (result === "invalid") return "invalid";

    if (this.board1.allShipsSunk()) {
      this.status = "player2_wins";
      return result;
    }

    this.turn = "player1";
    return result;
  }

  /** Computer attacks a random valid cell on board 1 */
  computerAttack(): { col: number; row: number; result: "hit" | "miss" } | null {
    if (this.status !== "playing" || this.turn !== "player2") return null;
    if (this.mode !== "vs_computer") return null;

    const validTargets: { col: number; row: number }[] = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const cell = this.board1.cells[row][col];
        if (cell === "empty" || cell === "ship") {
          validTargets.push({ col, row });
        }
      }
    }

    if (validTargets.length === 0) return null;

    const target = validTargets[Math.floor(Math.random() * validTargets.length)];
    const result = this.board1.receiveAttack(target.col, target.row);

    if (this.board1.allShipsSunk()) {
      this.status = "player2_wins";
    } else {
      this.turn = "player1";
    }

    return { col: target.col, row: target.row, result: result as "hit" | "miss" };
  }

  // ============================================================
  // 4-Player Mode Methods
  // ============================================================

  /**
   * Attack in 4-player mode.
   * @param attackerTurn - who is attacking
   * @param targetBoardIndex - index of the target board (0-3)
   * @param col - column to attack
   * @param row - row to attack
   * @returns result of the attack
   */
  attack4P(
    attackerTurn: Turn,
    targetBoardIndex: number,
    col: number,
    row: number
  ): "hit" | "miss" | "invalid" {
    if (this.status !== "playing") return "invalid";
    if (this.turn !== attackerTurn) return "invalid";

    const attackerIndex = turnToIndex(attackerTurn);
    // Can't attack own board
    if (targetBoardIndex === attackerIndex) return "invalid";
    // Can't attack eliminated player
    const targetTurn = indexToTurn(targetBoardIndex);
    if (this.eliminatedPlayers.has(targetTurn)) return "invalid";

    const targetBoard = this.getBoardByIndex(targetBoardIndex);
    const result = targetBoard.receiveAttack(col, row);
    if (result === "invalid") return "invalid";

    // Check if target is now eliminated
    if (targetBoard.allShipsSunk()) {
      this.eliminatedPlayers.add(targetTurn);

      // Check if only one player remains
      const remainingPlayers = TURN_ORDER.filter(
        (t) => !this.eliminatedPlayers.has(t)
      );
      if (remainingPlayers.length === 1) {
        const winner = remainingPlayers[0];
        this.status = `${winner}_wins` as GameStatus;
        return result;
      }
    }

    // Advance to next non-eliminated player
    this.advanceTurn4P();
    return result;
  }

  /** Advance turn to the next non-eliminated player */
  advanceTurn4P(): void {
    const currentIndex = turnToIndex(this.turn);
    for (let i = 1; i <= 4; i++) {
      const nextIndex = (currentIndex + i) % 4;
      const nextTurn = indexToTurn(nextIndex);
      if (!this.eliminatedPlayers.has(nextTurn)) {
        this.turn = nextTurn;
        return;
      }
    }
  }

  /** Get the indices of boards that the current player can attack */
  getAttackableBoards(attackerTurn: Turn): number[] {
    const attackerIndex = turnToIndex(attackerTurn);
    const targets: number[] = [];
    for (let i = 0; i < 4; i++) {
      if (i === attackerIndex) continue;
      if (this.eliminatedPlayers.has(indexToTurn(i))) continue;
      targets.push(i);
    }
    return targets;
  }

  /** Get the number of active (non-eliminated) players */
  getActivePlayers(): Turn[] {
    return TURN_ORDER.filter((t) => !this.eliminatedPlayers.has(t));
  }
}

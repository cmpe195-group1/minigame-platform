/**
 * Board.ts - Represents a 10x10 Battleship game board
 *
 * Handles ship placement, receiving attacks, and checking win/sunk conditions.
 */

import { type Ship, SHIP_TEMPLATES } from "./Ship";

/** Possible states for each cell on the board */
export type CellState = "empty" | "ship" | "hit" | "miss";

/** Serialized board data for multiplayer sync */
export interface BoardData {
  cells: CellState[][];
  ships: Ship[];
}

/** The game board - manages a 10x10 grid and ship placement */
export class Board {
  /** 10x10 grid of cell states */
  cells: CellState[][];

  /** List of ships placed on this board */
  ships: Ship[];

  constructor() {
    // Create an empty 10x10 grid
    this.cells = [];
    for (let row = 0; row < 10; row++) {
      this.cells[row] = [];
      for (let col = 0; col < 10; col++) {
        this.cells[row][col] = "empty";
      }
    }
    this.ships = [];
  }

  /** Create a Board from serialized data */
  static fromData(data: BoardData): Board {
    const board = new Board();
    board.cells = data.cells.map((row) => [...row]);
    board.ships = data.ships.map((s) => ({ ...s }));
    return board;
  }

  /** Serialize this board for network transfer */
  toData(): BoardData {
    return {
      cells: this.cells.map((row) => [...row]),
      ships: this.ships.map((s) => ({ ...s })),
    };
  }

  /** Check if a ship can be legally placed at the given position */
  canPlaceShip(ship: Ship): boolean {
    for (let i = 0; i < ship.size; i++) {
      const col = ship.horizontal ? ship.x + i : ship.x;
      const row = ship.horizontal ? ship.y : ship.y + i;

      // Must be within bounds
      if (col < 0 || col >= 10 || row < 0 || row >= 10) return false;

      // Must not overlap another ship
      if (this.cells[row][col] === "ship") return false;
    }
    return true;
  }

  /** Place a ship on the board. Returns false if placement is invalid. */
  placeShip(ship: Ship): boolean {
    if (!this.canPlaceShip(ship)) return false;

    for (let i = 0; i < ship.size; i++) {
      const col = ship.horizontal ? ship.x + i : ship.x;
      const row = ship.horizontal ? ship.y : ship.y + i;
      this.cells[row][col] = "ship";
    }

    this.ships.push(ship);
    return true;
  }

  /** Randomly place all standard ships on the board */
  placeShipsRandomly(): void {
    for (const template of SHIP_TEMPLATES) {
      let placed = false;
      while (!placed) {
        const horizontal = Math.random() > 0.5;
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        placed = this.placeShip({
          x,
          y,
          size: template.size,
          horizontal,
          name: template.name,
        });
      }
    }
  }

  /**
   * Receive an attack at the given cell.
   * @returns 'hit' if a ship was there, 'miss' if water, 'invalid' if already attacked
   */
  receiveAttack(col: number, row: number): "hit" | "miss" | "invalid" {
    const cell = this.cells[row][col];

    if (cell === "hit" || cell === "miss") return "invalid";

    if (cell === "ship") {
      this.cells[row][col] = "hit";
      return "hit";
    } else {
      this.cells[row][col] = "miss";
      return "miss";
    }
  }

  /** Check if all ships on this board have been completely sunk */
  allShipsSunk(): boolean {
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (this.cells[row][col] === "ship") return false;
      }
    }
    return true;
  }

  /** Check if a specific ship is completely sunk */
  isShipSunk(ship: Ship): boolean {
    for (let i = 0; i < ship.size; i++) {
      const col = ship.horizontal ? ship.x + i : ship.x;
      const row = ship.horizontal ? ship.y : ship.y + i;
      if (this.cells[row][col] !== "hit") return false;
    }
    return true;
  }

  /** Get the number of hits on this board */
  getHitCount(): number {
    let count = 0;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (this.cells[row][col] === "hit") count++;
      }
    }
    return count;
  }
}

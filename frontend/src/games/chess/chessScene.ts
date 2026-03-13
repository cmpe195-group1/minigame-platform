import Phaser from "phaser";
import { createInitialBoard } from "./rules";
import { chessReducer } from "./reducer";
import type { ChessState } from "./types";
const TILE_SIZE = 64;

export class ChessScene extends Phaser.Scene {
  private state!: ChessState;

  constructor() {
    super("ChessScene");
  }

  create() {
    this.state = {
      board: createInitialBoard(),
      turn: "white",
      selectedSquare: null,
    };

    this.drawBoard();
    this.input.on("pointerdown", this.handleClick, this);
  }

  drawBoard() {
    this.children.removeAll();

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const isLight = (x + y) % 2 === 0;
        const color = isLight ? 0xf0d9b5 : 0xb58863;

        const tile = this.add.rectangle(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
          color
        ).setOrigin(0);

        const piece = this.state.board[y][x];
        if (piece) {
          const text = this.add.text(
            x * TILE_SIZE + 22,
            y * TILE_SIZE + 18,
            piece.type[0].toUpperCase(),
            { color: piece.color === "white" ? "#fff" : "#000" }
          );
        }
      }
    }
  }

  handleClick(pointer: Phaser.Input.Pointer) {
    const x = Math.floor(pointer.x / TILE_SIZE);
    const y = Math.floor(pointer.y / TILE_SIZE);

    if (!this.state.selectedSquare) {
      this.state = chessReducer(this.state, { type: "SELECT", x, y });
    } else {
      this.state = chessReducer(this.state, { type: "MOVE", x, y });
    }

    this.drawBoard();
  }
}
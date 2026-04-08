import Phaser from "phaser";
import { createInitialBoard } from "./rules";
import { checkersReducer } from "./reducer";
import type { CheckersState } from "./types";

const TILE_SIZE = 64;

export class CheckersScene extends Phaser.Scene {
  private state!: CheckersState;

  constructor() {
    super("CheckersScene");
  }

  create(): void {
    this.state = {
      board: createInitialBoard(),
      turn: "white",
      selected: null,
    };

    this.drawBoard();
    this.input.on("pointerdown", this.handleClick, this);
  }

  drawBoard(): void {
    this.children.removeAll();

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const isDark = (x + y) % 2 === 1;
        const color = isDark ? 0x444444 : 0xdddddd;

        this.add
          .rectangle(
            x * TILE_SIZE,
            y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
            color
          )
          .setOrigin(0);

        // highlight selection
        if (
          this.state.selected &&
          this.state.selected.x === x &&
          this.state.selected.y === y
        ) {
          this.add
            .rectangle(
              x * TILE_SIZE,
              y * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE,
              0xffff00,
              0.3
            )
            .setOrigin(0);
        }

        const piece = this.state.board[y][x];

        if (piece) {
          const pieceColor =
            piece.color === "white" ? 0xffffff : 0x000000;

          this.add.circle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            20,
            pieceColor
          );

          if (piece.king) {
            this.add.circle(
              x * TILE_SIZE + TILE_SIZE / 2,
              y * TILE_SIZE + TILE_SIZE / 2,
              10,
              pieceColor === 0xffffff ? 0xffff00 : 0xff0000
            );
          }
        }
      }
    }
  }

  handleClick(pointer: Phaser.Input.Pointer): void {
    const x = Math.floor(pointer.x / TILE_SIZE);
    const y = Math.floor(pointer.y / TILE_SIZE);

    if (!this.state.selected) {
      this.state = checkersReducer(this.state, {
        type: "SELECT",
        x,
        y,
      });
    } else {
      this.state = checkersReducer(this.state, {
        type: "MOVE",
        x,
        y,
      });
    }

    this.drawBoard();
  }
}
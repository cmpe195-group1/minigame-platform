import Phaser from "phaser";
import { createInitialBoard } from "./rules";
import { chessReducer } from "./reducer";
import type { ChessState } from "./types";

import black_bishop from "./assets/black_bishop.png";
import black_king from "./assets/black_king.png";
import black_knight from "./assets/black_knight.png";
import black_pawn from "./assets/black_pawn.png";
import black_queen from "./assets/black_queen.png";
import black_rook from "./assets/black_rook.png";
import white_bishop from "./assets/white_bishop.png";
import white_king from "./assets/white_king.png";
import white_knight from "./assets/white_knight.png";
import white_pawn from "./assets/white_pawn.png";
import white_queen from "./assets/white_queen.png";
import white_rook from "./assets/white_rook.png";

const TILE_SIZE = 64;


export class ChessScene extends Phaser.Scene {
  private state!: ChessState;

  constructor() {
    super("ChessScene");
  }

  preload() {
    this.load.image('b_bishop', black_bishop);
    this.load.image('b_king', black_king);
    this.load.image('b_knight', black_knight);
    this.load.image('b_pawn', black_pawn);
    this.load.image('b_queen', black_queen);
    this.load.image('b_rook', black_rook);
    this.load.image('w_bishop', white_bishop);
    this.load.image('w_king', white_king);
    this.load.image('w_knight', white_knight);
    this.load.image('w_pawn', white_pawn);
    this.load.image('w_queen', white_queen);
    this.load.image('w_rook', white_rook);
  }

  create() {
    this.state = {
      board: createInitialBoard(),
      turn: "white",
      selectedSquare: null,
      history: [],
    };

    this.add.text(520, 50, "New Game", {
      color: "#00ff00",
    })
    .setInteractive()
    .on("pointerdown", () => {
      //this.state = chessReducer(this.state, { type: "RESET" });
    });

    this.add.text(520, 100, "Undo", {
      color: "#ffff00",
    })
    .setInteractive()
    .on("pointerdown", () => {
      //this.state = chessReducer(this.state, { type: "UNDO" });
    });

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

        if (
          this.state.selectedSquare &&
          this.state.selectedSquare.x === x &&
          this.state.selectedSquare.y === y
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
            //highlightPieceSquares(this, this.state.board[y][x], x, y);
        }

        const piece = this.state.board[y][x];
        if (piece) {
          /*
          const text = this.add.text(
            x * TILE_SIZE + 22,
            y * TILE_SIZE + 18,
            piece.type[0].toUpperCase(),
            { color: piece.color === "white" ? "#fff" : "#000" }
          );
          */
         piece.color === "white" ? this.add.image(x * TILE_SIZE + 32, y * TILE_SIZE + 32, `w_${piece.type}`) : this.add.image(x * TILE_SIZE + 32, y * TILE_SIZE + 32, `b_${piece.type}`);
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

function highlightPieceSquares(scene: Phaser.Scene, piece: any, x: number, y: number) {
  switch (piece.type) {
    case "pawn":
      if (piece.color === "white") {
        scene.add.circle(x * TILE_SIZE + 32, y * TILE_SIZE - TILE_SIZE + 64, 10, 0x00ff00, 0.5);
        if (!piece.hasMoved) {
          scene.add.circle(x * TILE_SIZE + 32, y * TILE_SIZE - TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        }
      } else {
        scene.add.circle(x * TILE_SIZE + 32, y * TILE_SIZE + TILE_SIZE + 64, 10, 0x00ff00, 0.5);
        if (!piece.hasMoved) {
          scene.add.circle(x * TILE_SIZE + 32, y * TILE_SIZE + TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        }
      }
      break;
    case "rook":
      for (let i = 0; i < 8; i++) {
        if (i !== y) scene.add.circle(x * TILE_SIZE + 32, i * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (i !== x) scene.add.circle(i * TILE_SIZE + 32, y * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
      }
      break;
    case "knight":
      const knightMoves = [
        [1, 2], [1, -2], [-1, 2], [-1, -2],
        [2, 1], [2, -1], [-2, 1], [-2, -1]
      ];  
      knightMoves.forEach(([dx, dy]) => {
        const tx = x + dx;
        const ty = y + dy;
        if (tx >= 0 && tx < 8 && ty >= 0 && ty < 8) {
          scene.add.circle(tx * TILE_SIZE + 32, ty * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        }
      });
      break;
    case "bishop":
      for (let i = 1; i < 8; i++) {
        if (x + i < 8 && y + i < 8) scene.add.circle((x + i) * TILE_SIZE + 32, (y + i) * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (x + i < 8 && y - i >= 0) scene.add.circle((x + i) * TILE_SIZE + 32, (y - i) * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (x - i >= 0 && y + i < 8) scene.add.circle((x - i) * TILE_SIZE + 32, (y + i) * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (x - i >= 0 && y - i >= 0) scene.add.circle((x - i) * TILE_SIZE + 32, (y - i) * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
      }
      break;
    case "queen":
      for (let i = 0; i < 8; i++) {
        if (i !== y) scene.add.circle(x * TILE_SIZE + 32, i * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (i !== x) scene.add.circle(i * TILE_SIZE + 32, y * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (x + i < 8 && y + i < 8) scene.add.circle((x + i) * TILE_SIZE + 32, (y + i) * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (x + i < 8 && y - i >= 0) scene.add.circle((x + i) * TILE_SIZE + 32, (y - i) * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (x - i >= 0 && y + i < 8) scene.add.circle((x - i) * TILE_SIZE + 32, (y + i) * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
        if (x - i >= 0 && y - i >= 0) scene.add.circle((x - i) * TILE_SIZE + 32, (y - i) * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
      }
      break;
    case "king":
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (tx >= 0 && tx < 8 && ty >= 0 && ty < 8) {
            scene.add.circle(tx * TILE_SIZE + 32, ty * TILE_SIZE + 32, 10, 0x00ff00, 0.5);
          }

        }
      } 
  }
}
import Phaser from "phaser";
import type { Board, Cell } from "../game/SudokuBoard";
import { type Player } from "../game/Player";

export const CELL_SIZE = 56;
export const PADDING = 28;
export const GRID_SIZE = CELL_SIZE * 9;
export const CANVAS_SIZE = GRID_SIZE + PADDING * 2;

const COLORS = {
  bg: 0xf8fafc,
  gridThin: 0xb0b8c8,
  gridBold: 0x1e293b,
  cellNormal: 0xffffff,
  cellHighlight: 0xdbeafe,
  cellRowCol: 0xeff6ff,
  cellBox: 0xf1f5f9,
  cellWrong: 0xfee2e2,
  givenText: "#1e293b",
};

export type OnCellClick = (row: number, col: number) => void;

export default class SudokuScene extends Phaser.Scene {
  private board: Board = [];
  private players: Player[] = [];
  private currentPlayerIndex = 0;
  private selectedRow = -1;
  private selectedCol = -1;
  private onCellClick?: OnCellClick;

  private cellBgs: Phaser.GameObjects.Rectangle[][] = [];
  private cellTexts: Phaser.GameObjects.Text[][] = [];
  private lineGraphics!: Phaser.GameObjects.Graphics;
  private isReady = false;

  constructor() {
    super({ key: "SudokuScene" });
  }

  // Called by React to register click handler
  setOnCellClick(cb: OnCellClick) {
    this.onCellClick = cb;
  }

  // Called by React whenever state changes
  updateBoard(board: Board, players: Player[], currentPlayerIndex: number) {
    this.board = board;
    this.players = players;
    this.currentPlayerIndex = currentPlayerIndex;
    if (this.isReady) {
      this.render();
    }
  }

  clearSelection() {
    this.selectedRow = -1;
    this.selectedCol = -1;
    if (this.isReady) this.render();
  }

  preload() {}

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.lineGraphics = this.add.graphics();
    this.buildCells();
    this.drawLines();
    this.isReady = true;

    // If board was already pushed in before create() ran, render it now
    if (this.board && this.board.length > 0) {
      this.render();
    }
  }

  private buildCells() {
    this.cellBgs = [];
    this.cellTexts = [];

    for (let r = 0; r < 9; r++) {
      this.cellBgs[r] = [];
      this.cellTexts[r] = [];

      for (let c = 0; c < 9; c++) {
        const cx = PADDING + c * CELL_SIZE + CELL_SIZE / 2;
        const cy = PADDING + r * CELL_SIZE + CELL_SIZE / 2;

        const rect = this.add
          .rectangle(cx, cy, CELL_SIZE - 1, CELL_SIZE - 1, COLORS.cellNormal)
          .setInteractive({ useHandCursor: true });

        rect.on("pointerdown", () => this.handleCellClick(r, c));

        this.cellBgs[r][c] = rect;

        const text = this.add
          .text(cx, cy, "", {
            fontSize: "22px",
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontStyle: "bold",
            color: COLORS.givenText,
          })
          .setOrigin(0.5)
          .setDepth(2);

        this.cellTexts[r][c] = text;
      }
    }
  }

  private handleCellClick(row: number, col: number) {
    this.selectedRow = row;
    this.selectedCol = col;
    this.render();
    if (this.onCellClick) {
      this.onCellClick(row, col);
    }
  }

  private drawLines() {
    const g = this.lineGraphics;
    g.clear();

    // Thin lines
    g.lineStyle(1, COLORS.gridThin, 1);
    for (let i = 0; i <= 9; i++) {
      const x = PADDING + i * CELL_SIZE;
      const y = PADDING + i * CELL_SIZE;
      g.beginPath();
      g.moveTo(x, PADDING);
      g.lineTo(x, PADDING + GRID_SIZE);
      g.strokePath();
      g.beginPath();
      g.moveTo(PADDING, y);
      g.lineTo(PADDING + GRID_SIZE, y);
      g.strokePath();
    }

    // Bold box lines
    g.lineStyle(3, COLORS.gridBold, 1);
    for (let i = 0; i <= 3; i++) {
      const x = PADDING + i * CELL_SIZE * 3;
      const y = PADDING + i * CELL_SIZE * 3;
      g.beginPath();
      g.moveTo(x, PADDING);
      g.lineTo(x, PADDING + GRID_SIZE);
      g.strokePath();
      g.beginPath();
      g.moveTo(PADDING, y);
      g.lineTo(PADDING + GRID_SIZE, y);
      g.strokePath();
    }
  }

  private render() {
    if (!this.board || this.board.length === 0) return;

    const currentPlayer = this.players[this.currentPlayerIndex] ?? null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell: Cell = this.board[r][c];
        const rect = this.cellBgs[r][c];
        const text = this.cellTexts[r][c];

        // --- Background color logic ---
        const isSelected = r === this.selectedRow && c === this.selectedCol;
        const sameRow = this.selectedRow !== -1 && r === this.selectedRow && !isSelected;
        const sameCol = this.selectedCol !== -1 && c === this.selectedCol && !isSelected;
        const sameBox =
          this.selectedRow !== -1 &&
          !isSelected &&
          !sameRow &&
          !sameCol &&
          Math.floor(r / 3) === Math.floor(this.selectedRow / 3) &&
          Math.floor(c / 3) === Math.floor(this.selectedCol / 3);

        let bgColor = COLORS.cellNormal;

        if (isSelected) {
          bgColor = currentPlayer
            ? this.lighten(this.parseHex(currentPlayer.color), 0.78)
            : COLORS.cellHighlight;
        } else if (sameRow || sameCol) {
          bgColor = COLORS.cellRowCol;
        } else if (sameBox) {
          bgColor = COLORS.cellBox;
        }

        // Wrong answer gets red background
        if (!cell.isGiven && cell.value !== 0 && !cell.isCorrect) {
          bgColor = COLORS.cellWrong;
        }

        rect.setFillStyle(bgColor);

        // Selected cell border
        if (isSelected) {
          const borderColor = currentPlayer
            ? this.parseHex(currentPlayer.color)
            : 0x3b82f6;
          rect.setStrokeStyle(2.5, borderColor);
        } else {
          rect.setStrokeStyle(0);
        }

        // --- Text ---
        if (cell.value !== 0) {
          text.setText(String(cell.value));
          if (cell.isGiven) {
            text.setStyle({ color: COLORS.givenText, fontSize: "22px", fontStyle: "bold" });
          } else {
            const owner = this.players.find((p) => p.id === cell.playerId);
            text.setStyle({
              color: owner ? owner.color : "#6b7280",
              fontSize: "22px",
              fontStyle: "bold",
            });
          }
        } else {
          text.setText("");
        }
      }
    }

    // Re-draw lines so they stay on top
    this.drawLines();
  }

  private parseHex(hex: string): number {
    return parseInt(hex.replace("#", ""), 16);
  }

  private lighten(color: number, factor: number): number {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return (
      (Math.round(r + (255 - r) * factor) << 16) |
      (Math.round(g + (255 - g) * factor) << 8) |
      Math.round(b + (255 - b) * factor)
    );
  }
}

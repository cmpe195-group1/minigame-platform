/**
 * BattleshipScene.ts - Main Phaser scene for the Battleship game
 *
 * Handles:
 * - Drawing two 10x10 grids with ocean water effects
 * - Detailed warship illustrations (hull, turrets, bridge, radar)
 * - Explosion & splash animations
 * - Mouse hover crosshair targeting
 * - Click-to-attack interaction
 * - Works with vs_computer and multiplayer_local modes
 *
 * For online multiplayer, the React layer handles communication —
 * this scene just renders and processes attacks.
 */

import Phaser from "phaser";
import { GameLogic, type GameMode, is4PlayerMode, turnToIndex, indexToTurn } from "../../game/GameLogic";
import type{ Ship } from "../../game/Ship";
import { Board } from "../../game/Board";

// ============================================================
// Layout Constants
// ============================================================

const CELL = 40;
const GRID = 10;
const LEFT_X = 50;
const RIGHT_X = 510;
const GRID_TOP = 80;
const LABEL_GAP = 18;

// 4P Layout (2×2 grid)
const GRID4_POSITIONS = [
  { x: 50,  y: 60 },  // Top-left: current player's fleet
  { x: 510, y: 60 },  // Top-right: opponent 1
  { x: 50,  y: 510 }, // Bottom-left: opponent 2
  { x: 510, y: 510 }, // Bottom-right: opponent 3
];
const GRID4_TITLE_OFFSET = -22;

// ============================================================
// Colors
// ============================================================

const C = {
  OCEAN_DEEP:    0x0d3b66,
  OCEAN_MID:     0x125d98,
  OCEAN_LIGHT:   0x1a7abd,
  GRID_LINE:     0x0a3a6b,
  GRID_BORDER:   0x1976d2,
  HULL:          0x455a64,
  HULL_DARK:     0x263238,
  HULL_LIGHT:    0x607d8b,
  DECK:          0x78909c,
  BRIDGE:        0x37474f,
  TURRET:        0x546e7a,
  TURRET_DARK:   0x37474f,
  RADAR:         0x80cbc4,
  WINDOW:        0x4dd0e1,
  STRIPE:        0xb0bec5,
  HIT_RED:       0xe53935,
  HIT_ORANGE:    0xff6d00,
  HIT_YELLOW:    0xffd600,
  FIRE_GLOW:     0xff6f60,
  MISS_CYAN:     0x4fc3f7,
  MISS_RING:     0x81d4fa,
  HOVER:         0x42a5f5,
  HOVER_BORDER:  0xbbdefb,
  BG_DARK:       0x050e1a,
};

/**
 * Callback type for status updates sent to React
 */
type StatusCallback = (
  status: string,
  turn: string,
  extra?: {
    sunkShip?: string;
    board1Hits?: number;
    board2Hits?: number;
    board3Hits?: number;
    board4Hits?: number;
    waitingForPass?: boolean;
    is4P?: boolean;
    eliminatedPlayers?: string[];
  }
) => void;

/**
 * Optional callback for online multiplayer attacks
 * When player clicks, we notify React which sends the attack to opponent
 */
type AttackCallback = (col: number, row: number) => void;

/**
 * Main Phaser scene — renders grids, ships, and handles interaction
 */
export class BattleshipScene extends Phaser.Scene {
  private gameLogic!: GameLogic;
  private mode!: GameMode;
  private onStatusChange!: StatusCallback;
  private onPlayerAttack: AttackCallback | null = null;

  // Water cell rectangles (2P)
  private leftCells: Phaser.GameObjects.Rectangle[][] = [];
  private rightCells: Phaser.GameObjects.Rectangle[][] = [];

  // 4P grid cells: gridCells4P[gridSlot][row][col]
  private gridCells4P: Phaser.GameObjects.Rectangle[][][] = [[], [], [], []];

  // Markers for hits/misses (2P)
  private leftMarkers: (Phaser.GameObjects.Container | null)[][] = [];
  private rightMarkers: (Phaser.GameObjects.Container | null)[][] = [];

  // 4P markers: gridMarkers4P[gridSlot][row][col]
  private gridMarkers4P: (Phaser.GameObjects.Container | null)[][][] = [[], [], [], []];

  // Ship graphic containers
  private shipContainers: Phaser.GameObjects.Container[] = [];

  // Crosshair overlay
  private crosshair: Phaser.GameObjects.Container | null = null;

  // Wave animation
  private waveTexts: Phaser.GameObjects.Text[] = [];
  private waveTimer = 0;

  // Processing flag
  private isProcessing = false;

  // Local multiplayer pass overlay
  private waitingForPass = false;
  private passOverlay: Phaser.GameObjects.Container | null = null;

  // Player role for online (used to decide which grid to show ships on)
  private playerRole: "host" | "guest" = "host";

  // For online mode: controlled externally
  private _onlineCanAct = true;

  // 4P state
  private is4P = false;
  private myPlayerIndex = 0; // 0-3, which player slot I am
  // Maps grid slot (0-3) → actual board index (0-3)
  private slotToBoardIndex: number[] = [0, 1, 2, 3];

  constructor() {
    super({ key: "BattleshipScene" });
  }

  /** Set whether the player can act (used by React for online turn management) */
  public setCanAct(canAct: boolean): void {
    this._onlineCanAct = canAct;
  }

  /** Reset processing flag (used after online attack result) */
  public resetProcessing(): void {
    this.isProcessing = false;
  }

  // ============================================================
  // Phaser Lifecycle
  // ============================================================

  create(): void {
    this.gameLogic = this.registry.get("gameLogic") as GameLogic;
    this.mode = this.registry.get("mode") as GameMode;
    this.onStatusChange = this.registry.get("onStatusChange") as StatusCallback;
    this.onPlayerAttack = this.registry.get("onPlayerAttack") as AttackCallback | null;
    this.playerRole = (this.registry.get("playerRole") as "host" | "guest") || "host";
    this.is4P = is4PlayerMode(this.mode);
    this.myPlayerIndex = (this.registry.get("myPlayerIndex") as number) ?? 0;

    this.cameras.main.setBackgroundColor("#050e1a");

    if (this.is4P) {
      this.create4P();
    } else {
      this.create2P();
    }
  }

  /** Standard 2-player scene setup */
  private create2P(): void {
    // Init marker arrays
    for (let r = 0; r < GRID; r++) {
      this.leftMarkers[r] = new Array(GRID).fill(null);
      this.rightMarkers[r] = new Array(GRID).fill(null);
    }

    // Draw scene
    this.drawOceanBackground();
    this.drawDivider();
    this.drawLabels(LEFT_X, GRID_TOP);
    this.drawLabels(RIGHT_X, GRID_TOP);
    this.drawTitle(LEFT_X, this.getLeftTitle(), "#64b5f6");
    this.drawTitle(RIGHT_X, this.getRightTitle(), "#ef9a9a");
    this.createWaterGrid(LEFT_X, GRID_TOP, this.leftCells, false);
    this.createWaterGrid(RIGHT_X, GRID_TOP, this.rightCells, true);

    // Draw player's ships on left grid
    this.drawShipsOnGrid(this.getMyBoard().ships, LEFT_X, GRID_TOP);

    this.createCrosshair();

    // Local multiplayer pass overlay
    if (this.mode === "multiplayer_local") {
      this.createPassOverlay();
    }

    this.refreshAllCells();
    this.emitStatus();
  }

  /** 4-player scene setup — 2×2 grid layout */
  private create4P(): void {
    // Compute slot mapping: slot 0 = my board, slots 1-3 = opponents in order
    this.computeSlotMapping();

    // Init marker arrays for all 4 grids
    for (let slot = 0; slot < 4; slot++) {
      this.gridMarkers4P[slot] = [];
      this.gridCells4P[slot] = [];
      for (let r = 0; r < GRID; r++) {
        this.gridMarkers4P[slot][r] = new Array(GRID).fill(null);
      }
    }

    // Draw background (larger for 4P)
    this.drawOceanBackground4P();

    // Draw 4 grids
    const titles4P = this.get4PTitles();
    const colors4P = ["#64b5f6", "#ef9a9a", "#a5d6a7", "#ffcc80"];
    for (let slot = 0; slot < 4; slot++) {
      const pos = GRID4_POSITIONS[slot];
      this.drawLabels(pos.x, pos.y);
      this.drawTitle4P(pos.x, pos.y + GRID4_TITLE_OFFSET, titles4P[slot], colors4P[slot]);
      const isInteractive = slot !== 0; // Slot 0 = my fleet, not interactive
      this.createWaterGrid4P(pos.x, pos.y, slot, isInteractive);
    }

    // Draw ships on my fleet (slot 0)
    const myBoard = this.gameLogic.getBoardByIndex(this.slotToBoardIndex[0]);
    this.drawShipsOnGrid(myBoard.ships, GRID4_POSITIONS[0].x, GRID4_POSITIONS[0].y);

    this.createCrosshair();

    // Pass overlay for local 4P
    if (this.mode === "multiplayer_local_4p") {
      this.createPassOverlay();
    }

    // Gray out eliminated players
    this.updateEliminatedOverlays();

    this.refreshAllCells();
    this.emitStatus();
  }

  /** Compute mapping from visual slot (0-3) to actual board index (0-3) */
  private computeSlotMapping(): void {
    // In local 4P: my board index = turnToIndex(current turn)
    // In online 4P: my board index = this.myPlayerIndex
    const myIdx = this.mode === "multiplayer_local_4p"
      ? turnToIndex(this.gameLogic.turn)
      : this.myPlayerIndex;
    this.slotToBoardIndex = [myIdx];
    for (let i = 1; i < 4; i++) {
      this.slotToBoardIndex.push((myIdx + i) % 4);
    }
  }

  /** Get titles for 4P grids */
  private get4PTitles(): string[] {
    const names = ["Player 1", "Player 2", "Player 3", "Player 4"];
    return this.slotToBoardIndex.map((boardIdx, slot) => {
      if (slot === 0) return `⚓ ${names[boardIdx]} (YOU)`;
      return `🎯 ${names[boardIdx]}`;
    });
  }

  /** Draw title for 4P layout */
  private drawTitle4P(gx: number, y: number, text: string, color: string): void {
    const cx = gx + (GRID * CELL) / 2;
    this.add.text(cx, y, text, {
      fontSize: "13px", color, fontFamily: "Arial, sans-serif", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(2);
  }

  /** Draw ocean background for 4P (taller canvas) */
  private drawOceanBackground4P(): void {
    const g = this.add.graphics();
    g.setDepth(0);
    g.fillStyle(C.BG_DARK, 1);
    g.fillRect(0, 0, 960, 920);

    g.lineStyle(1, 0x0a1f3c, 0.3);
    for (let y = 0; y < 920; y += 16) {
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x < 960; x += 4) {
        const wave = Math.sin((x + y * 0.5) * 0.03) * 2;
        g.lineTo(x, y + wave);
      }
      g.strokePath();
    }

    // Dividers
    const gg = this.add.graphics();
    gg.setDepth(1);
    // Vertical divider
    for (let y = 30; y < 900; y += 10) {
      gg.lineStyle(1, 0x1a3a5c, y % 20 === 0 ? 0.5 : 0.2);
      gg.lineBetween(480, y, 480, y + 5);
    }
    // Horizontal divider
    for (let x = 30; x < 930; x += 10) {
      gg.lineStyle(1, 0x1a3a5c, x % 20 === 0 ? 0.5 : 0.2);
      gg.lineBetween(x, 480, x + 5, 480);
    }
    this.add.text(480, 480, "⚔️", { fontSize: "22px" }).setOrigin(0.5).setDepth(1);
  }

  /** Create a water grid for 4P layout */
  private createWaterGrid4P(
    sx: number, sy: number, slot: number, interactive: boolean
  ): void {
    const g = this.add.graphics();
    g.setDepth(1);

    this.gridCells4P[slot] = [];
    for (let row = 0; row < GRID; row++) {
      this.gridCells4P[slot][row] = [];
      for (let col = 0; col < GRID; col++) {
        const x = sx + col * CELL + CELL / 2;
        const y = sy + row * CELL + CELL / 2;
        const shade = (row + col) % 2 === 0 ? C.OCEAN_DEEP : C.OCEAN_MID;
        const rect = this.add.rectangle(x, y, CELL - 1, CELL - 1, shade);
        rect.setStrokeStyle(1, C.GRID_LINE, 0.5);
        rect.setDepth(1);
        this.gridCells4P[slot][row][col] = rect;

        if ((row * 3 + col) % 5 === 0) {
          const wt = this.add.text(x, y, "~", {
            fontSize: "11px", color: "#1e88e5", fontFamily: "Arial",
          }).setOrigin(0.5).setAlpha(0.2).setDepth(1);
          this.waveTexts.push(wt);
        }

        if (interactive) {
          rect.setInteractive({ useHandCursor: true });
          rect.on("pointerover", () => {
            if (!this.canAct()) return;
            const boardIdx = this.slotToBoardIndex[slot];
            const board = this.gameLogic.getBoardByIndex(boardIdx);
            if (this.gameLogic.eliminatedPlayers.has(indexToTurn(boardIdx))) return;
            const st = board.cells[row][col];
            if (st !== "hit" && st !== "miss") {
              this.showCrosshair(col, row, sx, sy);
            }
          });
          rect.on("pointerout", () => this.hideCrosshair());
          rect.on("pointerdown", () => this.handleAttack4P(slot, col, row));
        }
      }
    }

    g.lineStyle(2, C.GRID_BORDER, 0.6);
    g.strokeRect(sx, sy, GRID * CELL, GRID * CELL);
  }

  // Eliminated player overlays
  private eliminatedOverlays: Phaser.GameObjects.Graphics[] = [];

  /** Draw gray overlay on eliminated players' grids */
  private updateEliminatedOverlays(): void {
    // Remove old overlays
    this.eliminatedOverlays.forEach(o => o.destroy());
    this.eliminatedOverlays = [];

    if (!this.is4P) return;

    for (let slot = 0; slot < 4; slot++) {
      const boardIdx = this.slotToBoardIndex[slot];
      if (this.gameLogic.eliminatedPlayers.has(indexToTurn(boardIdx))) {
        const pos = GRID4_POSITIONS[slot];
        const overlay = this.add.graphics();
        overlay.setDepth(50);
        overlay.fillStyle(0x000000, 0.5);
        overlay.fillRect(pos.x, pos.y, GRID * CELL, GRID * CELL);
        const label = this.add.text(
          pos.x + GRID * CELL / 2, pos.y + GRID * CELL / 2,
          "☠️ ELIMINATED", {
            fontSize: "18px", color: "#ef5350", fontFamily: "Arial, sans-serif", fontStyle: "bold",
          }
        ).setOrigin(0.5).setDepth(51);
        // Store graphics for cleanup (use a container would be cleaner but this works)
        this.eliminatedOverlays.push(overlay);
        // Also treat label as graphics-like for cleanup
        label.setData("eliminatedLabel", true);
      }
    }
  }

  update(_time: number, delta: number): void {
    this.waveTimer += delta;
    if (this.waveTimer > 800) {
      this.waveTimer = 0;
      this.waveTexts.forEach((t, i) => {
        const phase = (Date.now() / 1000 + i * 0.3) % (Math.PI * 2);
        t.setAlpha(0.15 + Math.sin(phase) * 0.1);
      });
    }
  }

  // ============================================================
  // Public methods for online multiplayer (called from React)
  // ============================================================

  /** Apply an opponent's attack result on our left grid */
  public applyOpponentAttack(col: number, row: number, result: "hit" | "miss"): void {
    const px = LEFT_X + col * CELL + CELL / 2;
    const py = GRID_TOP + row * CELL + CELL / 2;

    if (result === "hit") {
      this.explode(px, py);
    } else {
      this.splash(px, py);
    }

    this.time.delayedCall(250, () => {
      this.refreshAllCells();
      this.emitStatus();
    });
  }

  /** Apply our attack result on the right grid */
  public applyOurAttackResult(col: number, row: number, result: "hit" | "miss", sunkShipName?: string): void {
    const px = RIGHT_X + col * CELL + CELL / 2;
    const py = GRID_TOP + row * CELL + CELL / 2;

    if (result === "hit") {
      this.explode(px, py);
    } else {
      this.splash(px, py);
    }

    this.time.delayedCall(250, () => {
      this.refreshAllCells();
      this.emitStatus(false, sunkShipName);
      this.isProcessing = false;
    });
  }

  /** Full refresh of the display */
  public fullRefresh(): void {
    // Clear old ship graphics
    this.shipContainers.forEach((c) => c.destroy());
    this.shipContainers = [];

    // Clear all markers
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (this.leftMarkers[r][c]) {
          this.leftMarkers[r][c]!.destroy();
          this.leftMarkers[r][c] = null;
        }
        if (this.rightMarkers[r][c]) {
          this.rightMarkers[r][c]!.destroy();
          this.rightMarkers[r][c] = null;
        }
      }
    }

    this.drawShipsOnGrid(this.getMyBoard().ships, LEFT_X, GRID_TOP);
    this.refreshAllCells();
    this.emitStatus();
  }

  /** Show game over reveal */
  public showGameOverReveal(playerWon: boolean): void {
    const enemyBoard = this.getTargetBoard();
    enemyBoard.ships.forEach((ship) => {
      const g = this.add.graphics();
      g.setDepth(5);
      const sx = RIGHT_X + ship.x * CELL + 2;
      const sy = GRID_TOP + ship.y * CELL + 2;
      const sw = (ship.horizontal ? ship.size * CELL : CELL) - 4;
      const sh = (ship.horizontal ? CELL : ship.size * CELL) - 4;
      const color = playerWon ? 0x66bb6a : 0xef5350;
      g.lineStyle(2, color, 0.7);
      g.strokeRoundedRect(sx, sy, sw, sh, 4);
      g.fillStyle(color, 0.1);
      g.fillRoundedRect(sx, sy, sw, sh, 4);
    });
  }

  // ============================================================
  // Title Helpers
  // ============================================================

  private getLeftTitle(): string {
    if (this.mode === "vs_computer") return "⚓ YOUR FLEET";
    if (this.mode === "multiplayer_online") {
      return this.playerRole === "host" ? "⚓ YOUR FLEET (HOST)" : "⚓ YOUR FLEET (GUEST)";
    }
    return "⚓ YOUR FLEET";
  }

  private getRightTitle(): string {
    if (this.mode === "vs_computer") return "🎯 ENEMY WATERS";
    return "🎯 ENEMY WATERS";
  }

  // ============================================================
  // Board Accessors
  // ============================================================

  private getMyBoard(): Board {
    if (this.mode === "multiplayer_local") {
      return this.gameLogic.turn === "player1" ? this.gameLogic.board1 : this.gameLogic.board2;
    }
    // For vs_computer and online, board1 = my board
    return this.gameLogic.board1;
  }

  private getTargetBoard(): Board {
    if (this.mode === "multiplayer_local") {
      return this.gameLogic.turn === "player1" ? this.gameLogic.board2 : this.gameLogic.board1;
    }
    return this.gameLogic.board2;
  }

  // ============================================================
  // Ocean Background
  // ============================================================

  private drawOceanBackground(): void {
    const g = this.add.graphics();
    g.setDepth(0);
    g.fillStyle(C.BG_DARK, 1);
    g.fillRect(0, 0, 960, 560);

    g.lineStyle(1, 0x0a1f3c, 0.3);
    for (let y = 0; y < 560; y += 16) {
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x < 960; x += 4) {
        const wave = Math.sin((x + y * 0.5) * 0.03) * 2;
        g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
  }

  private drawDivider(): void {
    const cx = 480;
    const g = this.add.graphics();
    g.setDepth(1);

    for (let y = 60; y < 510; y += 10) {
      g.lineStyle(1, 0x1a3a5c, y % 20 === 0 ? 0.5 : 0.2);
      g.lineBetween(cx, y, cx, y + 5);
    }

    this.add.text(cx, 35, "⚔️", { fontSize: "22px" }).setOrigin(0.5).setDepth(1);
  }

  // ============================================================
  // Grid Labels & Titles
  // ============================================================

  private drawLabels(gx: number, gy: number): void {
    const letters = "ABCDEFGHIJ";
    for (let i = 0; i < GRID; i++) {
      this.add.text(gx + i * CELL + CELL / 2, gy - LABEL_GAP, letters[i], {
        fontSize: "12px", color: "#546e7a", fontFamily: "monospace", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(2);

      this.add.text(gx - LABEL_GAP + 2, gy + i * CELL + CELL / 2, String(i + 1), {
        fontSize: "12px", color: "#546e7a", fontFamily: "monospace", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(2);
    }
  }

  private drawTitle(gx: number, text: string, color: string): void {
    const cx = gx + (GRID * CELL) / 2;
    this.add.text(cx, 35, text, {
      fontSize: "16px", color, fontFamily: "Arial, sans-serif", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(2);

    const g = this.add.graphics();
    g.setDepth(2);
    const hex = color === "#64b5f6" ? 0x64b5f6 : 0xef9a9a;
    g.lineStyle(1, hex, 0.4);
    g.lineBetween(cx - 80, 50, cx + 80, 50);
  }

  // ============================================================
  // Water Grid
  // ============================================================

  private createWaterGrid(
    sx: number, sy: number,
    cells: Phaser.GameObjects.Rectangle[][],
    interactive: boolean
  ): void {
    const g = this.add.graphics();
    g.setDepth(1);

    for (let row = 0; row < GRID; row++) {
      cells[row] = [];
      for (let col = 0; col < GRID; col++) {
        const x = sx + col * CELL + CELL / 2;
        const y = sy + row * CELL + CELL / 2;

        const shade = (row + col) % 2 === 0 ? C.OCEAN_DEEP : C.OCEAN_MID;
        const rect = this.add.rectangle(x, y, CELL - 1, CELL - 1, shade);
        rect.setStrokeStyle(1, C.GRID_LINE, 0.5);
        rect.setDepth(1);
        cells[row][col] = rect;

        if ((row * 3 + col) % 5 === 0) {
          const wt = this.add.text(x, y, "~", {
            fontSize: "11px", color: "#1e88e5", fontFamily: "Arial",
          }).setOrigin(0.5).setAlpha(0.2).setDepth(1);
          this.waveTexts.push(wt);
        }

        if (interactive) {
          rect.setInteractive({ useHandCursor: true });

          rect.on("pointerover", () => {
            if (!this.canAct()) return;
            const board = this.getTargetBoard();
            const st = board.cells[row][col];
            if (st !== "hit" && st !== "miss") {
              this.showCrosshair(col, row, sx);
            }
          });

          rect.on("pointerout", () => {
            this.hideCrosshair();
          });

          rect.on("pointerdown", () => this.handleAttack(col, row));
        }
      }
    }

    g.lineStyle(2, C.GRID_BORDER, 0.6);
    g.strokeRect(sx, sy, GRID * CELL, GRID * CELL);

    const corners = [
      [sx, sy], [sx + GRID * CELL, sy],
      [sx, sy + GRID * CELL], [sx + GRID * CELL, sy + GRID * CELL],
    ];
    corners.forEach(([cx, cy]) => {
      g.fillStyle(C.GRID_BORDER, 0.5);
      g.fillCircle(cx, cy, 3);
    });
  }

  // ============================================================
  // Crosshair
  // ============================================================

  private createCrosshair(): void {
    const c = this.add.container(0, 0);
    c.setDepth(15);

    const outer = this.add.rectangle(0, 0, CELL - 1, CELL - 1);
    outer.setStrokeStyle(2, C.HOVER_BORDER, 0.9);
    outer.setFillStyle(C.HOVER, 0.25);
    c.add(outer);

    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0xbbdefb, 0.7);
    const half = CELL / 2 - 4;
    gfx.lineBetween(-half, 0, -3, 0);
    gfx.lineBetween(3, 0, half, 0);
    gfx.lineBetween(0, -half, 0, -3);
    gfx.lineBetween(0, 3, 0, half);
    c.add(gfx);

    const dot = this.add.circle(0, 0, 2, 0xff5252, 0.8);
    c.add(dot);

    const circle = this.add.graphics();
    circle.lineStyle(1, 0xbbdefb, 0.4);
    circle.strokeCircle(0, 0, 8);
    c.add(circle);

    c.setVisible(false);
    this.crosshair = c;
  }

  private showCrosshair(col: number, row: number, gridX: number, gridY: number = GRID_TOP): void {
    if (!this.crosshair) return;
    this.crosshair.setPosition(
      gridX + col * CELL + CELL / 2,
      gridY + row * CELL + CELL / 2
    );
    this.crosshair.setVisible(true);
  }

  private hideCrosshair(): void {
    this.crosshair?.setVisible(false);
  }

  // ============================================================
  // Ship Drawing — Detailed Warship Illustrations
  // ============================================================

  private drawShipsOnGrid(ships: Ship[], gridX: number, gridY: number): void {
    ships.forEach((ship) => {
      const container = this.drawWarship(ship, gridX, gridY);
      this.shipContainers.push(container);
    });
  }

  private drawWarship(ship: Ship, gridX: number, gridY: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.setDepth(3);
    const g = this.add.graphics();
    container.add(g);

    const px = gridX + ship.x * CELL;
    const py = gridY + ship.y * CELL;
    const totalW = ship.horizontal ? ship.size * CELL : CELL;
    const totalH = ship.horizontal ? CELL : ship.size * CELL;
    const m = 3;
    const sx = px + m;
    const sy = py + m;
    const sw = totalW - m * 2;
    const sh = totalH - m * 2;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(sx + 2, sy + 2, sw, sh, 5);

    // Hull
    g.fillStyle(C.HULL, 1);
    g.fillRoundedRect(sx, sy, sw, sh, 5);
    g.lineStyle(1, C.HULL_DARK, 0.9);
    g.strokeRoundedRect(sx, sy, sw, sh, 5);

    // Waterline stripe
    if (ship.horizontal) {
      g.fillStyle(0x8b0000, 0.5);
      g.fillRect(sx + 4, sy + sh - 5, sw - 8, 3);
    } else {
      g.fillStyle(0x8b0000, 0.5);
      g.fillRect(sx + sw - 5, sy + 4, 3, sh - 8);
    }

    // Deck
    if (ship.horizontal) {
      const dy = sy + sh * 0.2;
      const dh = sh * 0.55;
      g.fillStyle(C.DECK, 0.5);
      g.fillRoundedRect(sx + 8, dy, sw - 16, dh, 3);
      g.lineStyle(1, C.STRIPE, 0.15);
      for (let lx = sx + 14; lx < sx + sw - 14; lx += 8) {
        g.lineBetween(lx, dy + 2, lx, dy + dh - 2);
      }
    } else {
      const dx = sx + sw * 0.2;
      const dw = sw * 0.55;
      g.fillStyle(C.DECK, 0.5);
      g.fillRoundedRect(dx, sy + 8, dw, sh - 16, 3);
      g.lineStyle(1, C.STRIPE, 0.15);
      for (let ly = sy + 14; ly < sy + sh - 14; ly += 8) {
        g.lineBetween(dx + 2, ly, dx + dw - 2, ly);
      }
    }

    // Bridge
    const bridgeSize = Math.min(sw, sh) * 0.4;
    let bx: number, by: number;
    if (ship.horizontal) {
      bx = sx + sw * 0.55 - bridgeSize / 2;
      by = sy + sh / 2 - bridgeSize / 2;
    } else {
      bx = sx + sw / 2 - bridgeSize / 2;
      by = sy + sh * 0.55 - bridgeSize / 2;
    }

    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(bx + 1, by + 1, bridgeSize, bridgeSize, 3);
    g.fillStyle(C.BRIDGE, 1);
    g.fillRoundedRect(bx, by, bridgeSize, bridgeSize, 3);
    g.lineStyle(1, C.HULL_DARK, 0.7);
    g.strokeRoundedRect(bx, by, bridgeSize, bridgeSize, 3);

    // Windows
    g.fillStyle(C.WINDOW, 0.8);
    const winY = by + bridgeSize * 0.2;
    const winH = bridgeSize * 0.2;
    g.fillRect(bx + bridgeSize * 0.15, winY, bridgeSize * 0.7, winH);
    g.lineStyle(1, 0x263238, 0.5);
    g.strokeRect(bx + bridgeSize * 0.15, winY, bridgeSize * 0.7, winH);
    const numWins = Math.min(ship.size, 4);
    const winW = bridgeSize * 0.7;
    for (let wi = 1; wi < numWins; wi++) {
      const wx = bx + bridgeSize * 0.15 + (winW * wi) / numWins;
      g.lineBetween(wx, winY, wx, winY + winH);
    }

    // Radar
    if (ship.size >= 3) {
      const radarX = bx + bridgeSize / 2;
      const radarY = by - 2;
      g.lineStyle(1, C.STRIPE, 0.8);
      g.lineBetween(radarX, radarY, radarX, radarY - 6);
      g.fillStyle(C.RADAR, 0.7);
      g.fillCircle(radarX, radarY - 7, 3);
      g.lineStyle(1, 0x263238, 0.5);
      g.strokeCircle(radarX, radarY - 7, 3);
    }

    // Cannon turrets
    const cannonCount = Math.max(1, ship.size - 1);
    for (let ci = 0; ci < cannonCount; ci++) {
      let cx: number, cy: number;
      if (ship.horizontal) {
        cx = sx + (sw * (ci + 0.8)) / (cannonCount + 1.5);
        cy = sy + sh / 2;
      } else {
        cx = sx + sw / 2;
        cy = sy + (sh * (ci + 0.8)) / (cannonCount + 1.5);
      }

      const dx = cx - (bx + bridgeSize / 2);
      const dy = cy - (by + bridgeSize / 2);
      if (Math.abs(dx) < bridgeSize * 0.5 && Math.abs(dy) < bridgeSize * 0.5) continue;

      g.fillStyle(0x000000, 0.2);
      g.fillCircle(cx + 1, cy + 1, 5);
      g.fillStyle(C.TURRET, 1);
      g.fillCircle(cx, cy, 5);
      g.lineStyle(1, C.TURRET_DARK, 0.7);
      g.strokeCircle(cx, cy, 5);

      g.lineStyle(2, C.TURRET_DARK, 1);
      if (ship.size >= 4) {
        if (ship.horizontal) {
          g.lineBetween(cx, cy - 2, cx, cy - 9);
          g.lineBetween(cx, cy + 2, cx, cy + 9);
        } else {
          g.lineBetween(cx - 2, cy, cx - 9, cy);
          g.lineBetween(cx + 2, cy, cx + 9, cy);
        }
      } else {
        if (ship.horizontal) {
          g.lineBetween(cx, cy, cx, cy - 8);
        } else {
          g.lineBetween(cx, cy, cx - 8, cy);
        }
      }
    }

    // Bow
    g.fillStyle(C.HULL_LIGHT, 0.6);
    if (ship.horizontal) {
      const bowX = sx + sw - 6;
      const bowMid = sy + sh / 2;
      g.fillTriangle(bowX - 2, bowMid - 6, bowX + 6, bowMid, bowX - 2, bowMid + 6);
      g.fillStyle(C.HULL_DARK, 0.4);
      g.fillRect(sx + 1, sy + 4, 4, sh - 8);
    } else {
      const bowY = sy + sh - 6;
      const bowMid = sx + sw / 2;
      g.fillTriangle(bowMid - 6, bowY - 2, bowMid, bowY + 6, bowMid + 6, bowY - 2);
      g.fillStyle(C.HULL_DARK, 0.4);
      g.fillRect(sx + 4, sy + 1, sw - 8, 4);
    }

    // Ship name label
    if (ship.size >= 3) {
      const lx = px + totalW / 2;
      const ly = py + totalH / 2;
      const label = this.add.text(lx, ly, ship.name.toUpperCase(), {
        fontSize: "7px", color: "#b0bec5", fontFamily: "monospace", fontStyle: "bold",
      }).setOrigin(0.5).setAlpha(0.6);
      if (!ship.horizontal) label.setAngle(90);
      container.add(label);
    }

    return container;
  }

  // ============================================================
  // Effects
  // ============================================================

  private explode(px: number, py: number): void {
    this.cameras.main.shake(200, 0.005);

    const flash = this.add.circle(px, py, 4, C.HIT_YELLOW, 1).setDepth(20);
    this.tweens.add({
      targets: flash, scaleX: 5, scaleY: 5, alpha: 0,
      duration: 350, ease: "Power2", onComplete: () => flash.destroy(),
    });

    const ring = this.add.circle(px, py, 3, C.HIT_ORANGE, 0.8).setDepth(19);
    this.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0,
      duration: 450, delay: 50, ease: "Power2", onComplete: () => ring.destroy(),
    });

    const smoke = this.add.circle(px, py, 5, 0x424242, 0.3).setDepth(18);
    this.tweens.add({
      targets: smoke, scaleX: 4, scaleY: 4, alpha: 0,
      duration: 600, delay: 150, ease: "Power1", onComplete: () => smoke.destroy(),
    });

    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const color = [C.HIT_YELLOW, C.HIT_ORANGE, C.HIT_RED, 0xffffff][Math.floor(Math.random() * 4)];
      const spark = this.add.circle(px, py, 2, color, 1).setDepth(21);
      const dist = 20 + Math.random() * 20;
      this.tweens.add({
        targets: spark,
        x: px + Math.cos(angle) * dist,
        y: py + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 300 + Math.random() * 200,
        ease: "Power2", onComplete: () => spark.destroy(),
      });
    }

    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const debris = this.add.rectangle(
        px, py, 3, 3, C.HULL_DARK, 0.8
      ).setDepth(20).setAngle(Math.random() * 360);
      this.tweens.add({
        targets: debris,
        x: px + Math.cos(angle) * (25 + Math.random() * 15),
        y: py + Math.sin(angle) * (25 + Math.random() * 15) + 10,
        angle: Math.random() * 720,
        alpha: 0, duration: 500 + Math.random() * 200,
        ease: "Power1", onComplete: () => debris.destroy(),
      });
    }
  }

  private splash(px: number, py: number): void {
    const col = this.add.ellipse(px, py, 6, 14, C.MISS_CYAN, 0.6).setDepth(18);
    this.tweens.add({
      targets: col, scaleY: 2.5, scaleX: 0.5, alpha: 0, y: py - 10,
      duration: 400, ease: "Power2", onComplete: () => col.destroy(),
    });

    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(px, py, 4, 0x000000, 0).setDepth(17);
      ring.setStrokeStyle(1, C.MISS_RING, 0.6);
      this.tweens.add({
        targets: ring,
        scaleX: 2.5 + i, scaleY: 2.5 + i, alpha: 0,
        duration: 500 + i * 150, delay: i * 100,
        ease: "Power1", onComplete: () => ring.destroy(),
      });
    }

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const drop = this.add.circle(px, py, 1.5, C.MISS_RING, 0.9).setDepth(19);
      const dist = 12 + Math.random() * 12;
      this.tweens.add({
        targets: drop,
        x: px + Math.cos(angle) * dist,
        y: py + Math.sin(angle) * dist - 8,
        alpha: 0, duration: 450,
        ease: "Power1", onComplete: () => drop.destroy(),
      });
    }
  }

  // ============================================================
  // Local Multiplayer Pass Overlay
  // ============================================================

  private createPassOverlay(): void {
    const c = this.add.container(0, 0);
    c.setDepth(100);

    const bg = this.add.rectangle(480, 280, 960, 560, 0x000000, 0.85);
    c.add(bg);

    const box = this.add.rectangle(480, 260, 420, 220, 0x0a1929, 1);
    box.setStrokeStyle(2, 0x1976d2, 0.8);
    c.add(box);

    const title = this.add.text(480, 210, "🔄 PASS THE DEVICE", {
      fontSize: "24px", color: "#64b5f6", fontFamily: "Arial, sans-serif", fontStyle: "bold",
    }).setOrigin(0.5);
    c.add(title);

    const sub = this.add.text(480, 250, "", {
      fontSize: "16px", color: "#b0bec5", fontFamily: "Arial, sans-serif",
    }).setOrigin(0.5);
    c.add(sub);

    const btn = this.add.text(480, 310, "[ CLICK TO CONTINUE ]", {
      fontSize: "14px", color: "#4fc3f7", fontFamily: "monospace",
    }).setOrigin(0.5);
    c.add(btn);

    this.tweens.add({ targets: btn, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => {
      if (this.waitingForPass) {
        this.waitingForPass = false;
        c.setVisible(false);
        this.rebuildForCurrentPlayer();
        this.emitStatus();
      }
    });

    this.passOverlay = c;
    c.setVisible(false);
    this.registry.set("passSubtitle", sub);
  }

  private showPassOverlay(): void {
    if (!this.passOverlay) return;
    this.waitingForPass = true;
    const turnIdx = turnToIndex(this.gameLogic.turn);
    const nextPlayer = `Player ${turnIdx + 1}`;
    const sub = this.registry.get("passSubtitle") as Phaser.GameObjects.Text;
    if (sub) sub.setText(`It's ${nextPlayer}'s turn now`);
    this.passOverlay.setVisible(true);
    this.emitStatus(true);
  }

  private rebuildForCurrentPlayer(): void {
    this.shipContainers.forEach((c) => c.destroy());
    this.shipContainers = [];

    if (this.is4P) {
      // 4P: recompute slot mapping, clear & redraw
      this.computeSlotMapping();
      for (let slot = 0; slot < 4; slot++) {
        for (let r = 0; r < GRID; r++) {
          for (let c = 0; c < GRID; c++) {
            if (this.gridMarkers4P[slot]?.[r]?.[c]) {
              this.gridMarkers4P[slot][r][c]!.destroy();
              this.gridMarkers4P[slot][r][c] = null;
            }
          }
        }
      }
      const myBoard = this.gameLogic.getBoardByIndex(this.slotToBoardIndex[0]);
      this.drawShipsOnGrid(myBoard.ships, GRID4_POSITIONS[0].x, GRID4_POSITIONS[0].y);
      this.updateEliminatedOverlays();
    } else {
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (this.leftMarkers[r][c]) {
            this.leftMarkers[r][c]!.destroy();
            this.leftMarkers[r][c] = null;
          }
          if (this.rightMarkers[r][c]) {
            this.rightMarkers[r][c]!.destroy();
            this.rightMarkers[r][c] = null;
          }
        }
      }
      const myBoard = this.getMyBoard();
      this.drawShipsOnGrid(myBoard.ships, LEFT_X, GRID_TOP);
    }
    this.refreshAllCells();
  }

  // ============================================================
  // Attack Handling
  // ============================================================

  private canAct(): boolean {
    if (this.mode === "multiplayer_online" || this.mode === "multiplayer_online_4p") {
      return this._onlineCanAct && !this.isProcessing;
    }
    return (
      this.gameLogic.status === "playing" &&
      !this.isProcessing &&
      !this.waitingForPass
    );
  }

  private handleAttack(col: number, row: number): void {
    if (!this.canAct()) return;

    // For online multiplayer, delegate to React
    if (this.mode === "multiplayer_online" && this.onPlayerAttack) {
      // Check if already attacked
      const targetBoard = this.getTargetBoard();
      const cell = targetBoard.cells[row][col];
      if (cell === "hit" || cell === "miss") return;

      this.isProcessing = true;
      this.hideCrosshair();
      this.onPlayerAttack(col, row);
      return;
    }

    // Local modes (vs_computer and multiplayer_local)
    const turn = this.gameLogic.turn;
    let result: "hit" | "miss" | "invalid";

    if (turn === "player1") {
      result = this.gameLogic.player1Attack(col, row);
    } else {
      result = this.gameLogic.player2Attack(col, row);
    }

    if (result === "invalid") return;

    this.isProcessing = true;
    this.hideCrosshair();

    const px = RIGHT_X + col * CELL + CELL / 2;
    const py = GRID_TOP + row * CELL + CELL / 2;

    if (result === "hit") {
      this.explode(px, py);
    } else {
      this.splash(px, py);
    }

    // Check for sunk ships
    const targetBoard = turn === "player1" ? this.gameLogic.board2 : this.gameLogic.board1;
    let sunkShipName: string | undefined;
    for (const ship of targetBoard.ships) {
      if (targetBoard.isShipSunk(ship)) {
        if (this.checkShipJustSunk(ship, col, row)) {
          sunkShipName = ship.name;
          this.showSunkShipOutline(ship, RIGHT_X, GRID_TOP);
        }
      }
    }

    this.time.delayedCall(250, () => {
      this.refreshAllCells();
      this.emitStatus(false, sunkShipName);

      if (this.gameLogic.status !== "playing") {
        this.isProcessing = false;
        this.showGameOverReveal(this.gameLogic.status === "player1_wins");
        return;
      }

      if (this.mode === "vs_computer") {
        // Computer turn
        this.time.delayedCall(700, () => {
          const compResult = this.gameLogic.computerAttack();
          if (compResult) {
            const cpx = LEFT_X + compResult.col * CELL + CELL / 2;
            const cpy = GRID_TOP + compResult.row * CELL + CELL / 2;
            if (compResult.result === "hit") {
              this.explode(cpx, cpy);
            } else {
              this.splash(cpx, cpy);
            }
          }

          this.time.delayedCall(250, () => {
            this.refreshAllCells();
            this.emitStatus();
            this.isProcessing = false;

            if (this.gameLogic.status !== "playing") {
              this.showGameOverReveal(this.gameLogic.status === "player1_wins");
            }
          });
        });
      } else if (this.mode === "multiplayer_local") {
        this.isProcessing = false;
        this.showPassOverlay();
      }
    });
  }

  /** Handle attack for 4P mode — called when player clicks on an opponent grid slot */
  private handleAttack4P(slot: number, col: number, row: number): void {
    if (!this.canAct()) return;

    const targetBoardIndex = this.slotToBoardIndex[slot];
    const targetTurn = indexToTurn(targetBoardIndex);

    // Can't attack eliminated players
    if (this.gameLogic.eliminatedPlayers.has(targetTurn)) return;

    // For online 4P, delegate to React
    if (this.mode === "multiplayer_online_4p" && this.onPlayerAttack) {
      const board = this.gameLogic.getBoardByIndex(targetBoardIndex);
      const cell = board.cells[row][col];
      if (cell === "hit" || cell === "miss") return;
      this.isProcessing = true;
      this.hideCrosshair();
      // Encode targetBoardIndex in the attack via a custom callback
      // We pass targetBoardIndex * 100 + col as col, row stays the same
      // Actually, let's use registry to pass the target board
      this.registry.set("lastAttackTargetBoard", targetBoardIndex);
      this.onPlayerAttack(col, row);
      return;
    }

    // Local 4P mode
    const result = this.gameLogic.attack4P(this.gameLogic.turn, targetBoardIndex, col, row);
    if (result === "invalid") return;

    this.isProcessing = true;
    this.hideCrosshair();

    const pos = GRID4_POSITIONS[slot];
    const px = pos.x + col * CELL + CELL / 2;
    const py = pos.y + row * CELL + CELL / 2;

    if (result === "hit") {
      this.explode(px, py);
    } else {
      this.splash(px, py);
    }

    // Check for sunk ships
    const targetBoard = this.gameLogic.getBoardByIndex(targetBoardIndex);
    let sunkShipName: string | undefined;
    for (const ship of targetBoard.ships) {
      if (targetBoard.isShipSunk(ship)) {
        if (this.checkShipJustSunk(ship, col, row)) {
          sunkShipName = ship.name;
          this.showSunkShipOutline(ship, pos.x, pos.y);
        }
      }
    }

    this.time.delayedCall(250, () => {
      this.refreshAllCells();
      this.updateEliminatedOverlays();
      this.emitStatus(false, sunkShipName);

      if (this.gameLogic.status !== "playing") {
        this.isProcessing = false;
        return;
      }

      if (this.mode === "multiplayer_local_4p") {
        this.isProcessing = false;
        this.showPassOverlay();
      }
    });
  }

  private checkShipJustSunk(ship: Ship, hitCol: number, hitRow: number): boolean {
    for (let i = 0; i < ship.size; i++) {
      const sc = ship.horizontal ? ship.x + i : ship.x;
      const sr = ship.horizontal ? ship.y : ship.y + i;
      if (sc === hitCol && sr === hitRow) return true;
    }
    return false;
  }

  private showSunkShipOutline(ship: Ship, gridX: number, gridY: number): void {
    const g = this.add.graphics();
    g.setDepth(6);

    const sx = gridX + ship.x * CELL + 2;
    const sy = gridY + ship.y * CELL + 2;
    const sw = (ship.horizontal ? ship.size * CELL : CELL) - 4;
    const sh = (ship.horizontal ? CELL : ship.size * CELL) - 4;

    g.lineStyle(2, 0xef5350, 0.8);
    g.strokeRoundedRect(sx, sy, sw, sh, 4);
    g.fillStyle(0xef5350, 0.15);
    g.fillRoundedRect(sx, sy, sw, sh, 4);

    const lx = gridX + ship.x * CELL + (ship.horizontal ? ship.size * CELL : CELL) / 2;
    const ly = gridY + ship.y * CELL + (ship.horizontal ? CELL : ship.size * CELL) / 2;
    const label = this.add.text(lx, ly, "SUNK", {
      fontSize: "8px", color: "#ff8a80", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(7);

    this.tweens.add({ targets: label, alpha: 0.5, duration: 500, yoyo: true, repeat: 3 });
  }

  // ============================================================
  // Cell Display Update
  // ============================================================

  private refreshAllCells(): void {
    if (this.is4P) {
      this.refreshAllCells4P();
      return;
    }
    const myBoard = this.getMyBoard();
    const targetBoard = this.getTargetBoard();

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        this.updateCell(row, col, true, myBoard);
        this.addMarker(row, col, myBoard, this.leftMarkers, LEFT_X);
        this.updateCell(row, col, false, targetBoard);
        this.addMarker(row, col, targetBoard, this.rightMarkers, RIGHT_X);
      }
    }
  }

  private refreshAllCells4P(): void {
    for (let slot = 0; slot < 4; slot++) {
      const boardIdx = this.slotToBoardIndex[slot];
      const board = this.gameLogic.getBoardByIndex(boardIdx);
      const pos = GRID4_POSITIONS[slot];
      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          this.updateCell4P(slot, row, col, board);
          this.addMarker4P(slot, row, col, board, pos.x, pos.y);
        }
      }
    }
  }

  private updateCell4P(
    slot: number, row: number, col: number,
    board: { cells: string[][] }
  ): void {
    const rect = this.gridCells4P[slot]?.[row]?.[col];
    if (!rect) return;
    const state = board.cells[row][col];
    const shade = (row + col) % 2 === 0 ? C.OCEAN_DEEP : C.OCEAN_MID;
    if (state === "hit") {
      rect.setFillStyle(C.HIT_RED, 0.7);
    } else if (state === "miss") {
      rect.setFillStyle(C.OCEAN_LIGHT, 0.5);
    } else {
      rect.setFillStyle(shade);
    }
  }

  private addMarker4P(
    slot: number, row: number, col: number,
    board: { cells: string[][] },
    gridX: number, gridY: number
  ): void {
    if (!this.gridMarkers4P[slot]?.[row]) return;
    if (this.gridMarkers4P[slot][row][col] !== null) return;
    const state = board.cells[row][col];
    if (state !== "hit" && state !== "miss") return;

    const x = gridX + col * CELL + CELL / 2;
    const y = gridY + row * CELL + CELL / 2;
    const container = this.add.container(x, y);
    container.setDepth(8);

    if (state === "hit") {
      const glow = this.add.circle(0, 0, 14, C.FIRE_GLOW, 0.15);
      container.add(glow);
      const fire = this.add.text(0, -1, "🔥", { fontSize: "20px" }).setOrigin(0.5);
      container.add(fire);
      const xm = this.add.text(0, 0, "✕", {
        fontSize: "16px", color: "#ffffff", fontStyle: "bold",
        stroke: "#000000", strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0.8);
      container.add(xm);
    } else {
      const g = this.add.graphics();
      g.lineStyle(1, C.MISS_CYAN, 0.4);
      g.strokeCircle(0, 0, 7);
      g.lineStyle(1, C.MISS_CYAN, 0.2);
      g.strokeCircle(0, 0, 11);
      container.add(g);
      const dot = this.add.circle(0, 0, 2, C.MISS_RING, 0.5);
      container.add(dot);
      const drop = this.add.text(0, 0, "💧", { fontSize: "13px" }).setOrigin(0.5).setAlpha(0.5);
      container.add(drop);
    }
    this.gridMarkers4P[slot][row][col] = container;
  }

  private updateCell(
    row: number, col: number, isLeft: boolean,
    board: { cells: string[][] }
  ): void {
    const rect = isLeft ? this.leftCells[row][col] : this.rightCells[row][col];
    const state = board.cells[row][col];
    const shade = (row + col) % 2 === 0 ? C.OCEAN_DEEP : C.OCEAN_MID;

    if (state === "hit") {
      rect.setFillStyle(C.HIT_RED, 0.7);
    } else if (state === "miss") {
      rect.setFillStyle(C.OCEAN_LIGHT, 0.5);
    } else {
      rect.setFillStyle(shade);
    }
  }

  private addMarker(
    row: number, col: number,
    board: { cells: string[][] },
    markers: (Phaser.GameObjects.Container | null)[][],
    gridX: number
  ): void {
    if (markers[row][col] !== null) return;
    const state = board.cells[row][col];
    if (state !== "hit" && state !== "miss") return;

    const x = gridX + col * CELL + CELL / 2;
    const y = GRID_TOP + row * CELL + CELL / 2;
    const container = this.add.container(x, y);
    container.setDepth(8);

    if (state === "hit") {
      const glow = this.add.circle(0, 0, 14, C.FIRE_GLOW, 0.15);
      container.add(glow);
      const fire = this.add.text(0, -1, "🔥", { fontSize: "20px" }).setOrigin(0.5);
      container.add(fire);
      const xm = this.add.text(0, 0, "✕", {
        fontSize: "16px", color: "#ffffff", fontStyle: "bold",
        stroke: "#000000", strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0.8);
      container.add(xm);
    } else {
      const g = this.add.graphics();
      g.lineStyle(1, C.MISS_CYAN, 0.4);
      g.strokeCircle(0, 0, 7);
      g.lineStyle(1, C.MISS_CYAN, 0.2);
      g.strokeCircle(0, 0, 11);
      container.add(g);
      const dot = this.add.circle(0, 0, 2, C.MISS_RING, 0.5);
      container.add(dot);
      const drop = this.add.text(0, 0, "💧", { fontSize: "13px" }).setOrigin(0.5).setAlpha(0.5);
      container.add(drop);
    }

    markers[row][col] = container;
  }

  // ============================================================
  // Status
  // ============================================================

  private emitStatus(waitingForPass = false, sunkShip?: string): void {
    if (this.is4P) {
      this.onStatusChange(
        this.gameLogic.status,
        this.gameLogic.turn,
        {
          sunkShip,
          board1Hits: this.gameLogic.board1.getHitCount(),
          board2Hits: this.gameLogic.board2.getHitCount(),
          board3Hits: this.gameLogic.board3.getHitCount(),
          board4Hits: this.gameLogic.board4.getHitCount(),
          waitingForPass,
          is4P: true,
          eliminatedPlayers: Array.from(this.gameLogic.eliminatedPlayers),
        }
      );
    } else {
      this.onStatusChange(
        this.gameLogic.status,
        this.gameLogic.turn,
        {
          sunkShip,
          board1Hits: this.gameLogic.board1.getHitCount(),
          board2Hits: this.gameLogic.board2.getHitCount(),
          waitingForPass,
        }
      );
    }
  }

  /** Apply attack result on a specific grid (4P online) */
  public applyAttackResult4P(
    targetBoardIndex: number, col: number, row: number,
    result: "hit" | "miss", sunkShipName?: string
  ): void {
    // Find which slot this board is displayed in
    const slot = this.slotToBoardIndex.indexOf(targetBoardIndex);
    if (slot === -1) return;
    const pos = GRID4_POSITIONS[slot];
    const px = pos.x + col * CELL + CELL / 2;
    const py = pos.y + row * CELL + CELL / 2;

    if (result === "hit") {
      this.explode(px, py);
    } else {
      this.splash(px, py);
    }

    this.time.delayedCall(250, () => {
      this.refreshAllCells();
      this.updateEliminatedOverlays();
      this.emitStatus(false, sunkShipName);
      this.isProcessing = false;
    });
  }

  /** Get the target board index from last 4P attack (set by handleAttack4P) */
  public getLastAttackTargetBoard(): number {
    return (this.registry.get("lastAttackTargetBoard") as number) ?? -1;
  }
}

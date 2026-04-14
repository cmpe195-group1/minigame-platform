import Phaser from "phaser";
import { createInitialBoard } from "./rules";
import { checkersReducer } from "./reducer";
import type { Board, CheckersState, Piece, Player, Position } from "./types";

// TODO: Allow local play or remote/lan room creation similar to other games in the folder like ./games/battleship. This will require some UI work to create a lobby and handle player matching, but the core game logic and rendering should be reusable with minimal changes. Use springboot and other necessary backend tech to create and manage game rooms, handle player connections, and relay game state updates between clients. The existing CheckersScene can be adapted to support both local and online multiplayer modes based on the presence of a networked game session.
const BOARD_SIZE = 8;
const TILE_SIZE = 68;
const BOARD_X = 36;
const BOARD_Y = 92;
const BOARD_PIXELS = BOARD_SIZE * TILE_SIZE;
const PANEL_X = BOARD_X + BOARD_PIXELS + 28;
const SCENE_WIDTH = PANEL_X + 200;
const SCENE_HEIGHT = BOARD_Y + BOARD_PIXELS + 36;

export const CHECKERS_SCENE_WIDTH = SCENE_WIDTH;
export const CHECKERS_SCENE_HEIGHT = SCENE_HEIGHT;

const COLORS = {
  backgroundTop: 0x1a2330,
  backgroundBottom: 0x0f141c,
  lightTile: 0xe7d7ba,
  darkTile: 0x7a5230,
  lightTileAlt: 0xf0e3cd,
  darkTileAlt: 0x6a4728,
  frame: 0x301d11,
  whitePiece: 0xf7f3eb,
  whiteShadow: 0xd2cabd,
  blackPiece: 0x2b313c,
  blackShadow: 0x141920,
  select: 0xffd166,
  moveHint: 0x44c27f,
  captureHint: 0xff7b72,
  text: 0xf6f0e8,
  subtext: 0xc5b8a5,
  button: 0x5d9cec,
  buttonHover: 0x7ab2ff,
  buttonText: 0x081019,
  overlay: 0x091018,
  victory: 0x1f8f5f,
  defeat: 0xb24545,
};

export type MovePayload = {
  from: Position;
  to: Position;
  resultingState: CheckersState;
};

export interface CheckersSceneStatusExtra {
  winner: Player | null;
  whitePieces: number;
  blackPieces: number;
  multiplayer: boolean;
}

type StatusCallback = (
  status: "playing" | "game_over",
  turn: Player,
  extra?: CheckersSceneStatusExtra
) => void;

type MoveCallback = (payload: MovePayload) => void;

export type SceneMode = "local" | "multiplayer_online";

export interface CheckersSceneConfig {
  mode?: SceneMode;
  initialState?: CheckersState;
  playerColor?: Player;
  canInteract?: boolean;
  winnerOverride?: Player | null;
  onStatusChange?: StatusCallback | null;
  onPlayerMove?: MoveCallback | null;
}

type MoveOption = {
  x: number;
  y: number;
  capture: boolean;
};

function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((piece) => (piece ? { ...piece } : null))
  );
}

function cloneState(state: CheckersState): CheckersState {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    selected: state.selected ? { ...state.selected } : null,
  };
}

export function getInitialState(): CheckersState {
  return {
    board: createInitialBoard(),
    turn: "white",
    selected: null,
  };
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function getDirections(piece: Piece): Array<{ dx: number; dy: number }> {
  const forward = piece.color === "white" ? -1 : 1;
  if (piece.king) {
    return [
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 },
    ];
  }

  return [
    { dx: -1, dy: forward },
    { dx: 1, dy: forward },
  ];
}

function getPieceMoves(board: Board, x: number, y: number): MoveOption[] {
  const piece = board[y]?.[x];
  if (!piece) {
    return [];
  }

  const moves: MoveOption[] = [];
  const directions = getDirections(piece);

  for (const { dx, dy } of directions) {
    const nx = x + dx;
    const ny = y + dy;

    if (inBounds(nx, ny) && !board[ny][nx]) {
      moves.push({ x: nx, y: ny, capture: false });
    }

    const jumpX = x + dx * 2;
    const jumpY = y + dy * 2;
    if (!inBounds(jumpX, jumpY)) {
      continue;
    }

    const middlePiece = board[y + dy]?.[x + dx];
    if (
      middlePiece &&
      middlePiece.color !== piece.color &&
      !board[jumpY][jumpX]
    ) {
      moves.push({ x: jumpX, y: jumpY, capture: true });
    }
  }

  return moves;
}

function getAllMoves(board: Board, player: Player): Array<{
  from: Position;
  moves: MoveOption[];
}> {
  const captureSets: Array<{ from: Position; moves: MoveOption[] }> = [];
  const normalSets: Array<{ from: Position; moves: MoveOption[] }> = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const piece = board[y][x];
      if (!piece || piece.color !== player) {
        continue;
      }

      const moves = getPieceMoves(board, x, y);
      if (moves.length === 0) {
        continue;
      }

      const captures = moves.filter((move) => move.capture);
      const entry = { from: { x, y }, moves: captures.length > 0 ? captures : moves };

      if (captures.length > 0) {
        captureSets.push(entry);
      } else {
        normalSets.push(entry);
      }
    }
  }

  return captureSets.length > 0 ? captureSets : normalSets;
}

function getPieceCounts(board: Board): Record<Player, number> {
  let white = 0;
  let black = 0;

  for (const row of board) {
    for (const piece of row) {
      if (!piece) {
        continue;
      }

      if (piece.color === "white") {
        white += 1;
      } else {
        black += 1;
      }
    }
  }

  return { white, black };
}

function getWinner(state: CheckersState): Player | null {
  const counts = getPieceCounts(state.board);
  if (counts.white === 0) {
    return "black";
  }
  if (counts.black === 0) {
    return "white";
  }

  const availableMoves = getAllMoves(state.board, state.turn);
  if (availableMoves.length === 0) {
    return state.turn === "white" ? "black" : "white";
  }

  return null;
}

export class CheckersScene extends Phaser.Scene {
  private state!: CheckersState;
  private boardLayer?: Phaser.GameObjects.Container;
  private uiLayer?: Phaser.GameObjects.Container;
  private modalLayer?: Phaser.GameObjects.Container;
  private winner: Player | null = null;
  private mode: SceneMode = "local";
  private playerColor: Player = "white";
  private canInteract = true;
  private onStatusChange: StatusCallback | null = null;
  private onPlayerMove: MoveCallback | null = null;
  private winnerOverride: Player | null | undefined = undefined;
  private initialConfig?: CheckersSceneConfig;
  private isReady = false;

  constructor(initialConfig?: CheckersSceneConfig) {
    super("CheckersScene");
    this.initialConfig = initialConfig;
  }

  create(): void {
    const config = this.initialConfig ?? {};
    this.state = config.initialState
      ? cloneState(config.initialState)
      : getInitialState();
    this.mode = config.mode ?? (this.registry.get("mode") as SceneMode) ?? "local";
    this.playerColor =
      config.playerColor ?? (this.registry.get("playerColor") as Player) ?? "white";
    this.canInteract =
      config.canInteract ?? (this.registry.get("canInteract") as boolean | undefined) ?? true;
    this.winnerOverride =
      config.winnerOverride ??
      (this.registry.get("winnerOverride") as Player | null | undefined);
    this.onStatusChange =
      config.onStatusChange ??
      (this.registry.get("onStatusChange") as StatusCallback | null) ??
      null;
    this.onPlayerMove =
      config.onPlayerMove ??
      (this.registry.get("onPlayerMove") as MoveCallback | null) ??
      null;
    this.winner = this.getResolvedWinner(this.state);

    this.cameras.main.setBackgroundColor("#101722");
    this.drawBackground();
    this.renderScene();
    this.input.on("pointerdown", this.handleClick, this);
    this.isReady = true;
    this.emitStatus();
  }

  public configureSession(config: CheckersSceneConfig): void {
    if (config.mode) {
      this.mode = config.mode;
    }
    if (config.playerColor) {
      this.playerColor = config.playerColor;
    }
    if (typeof config.canInteract === "boolean") {
      this.canInteract = config.canInteract;
    }
    if (Object.prototype.hasOwnProperty.call(config, "winnerOverride")) {
      this.winnerOverride = config.winnerOverride;
    }
    if (config.onStatusChange !== undefined) {
      this.onStatusChange = config.onStatusChange;
    }
    if (config.onPlayerMove !== undefined) {
      this.onPlayerMove = config.onPlayerMove;
    }

    this.winner = this.getResolvedWinner(this.state);

    if (this.isReady) {
      this.renderScene();
      this.emitStatus();
    }
  }

  public setCanInteract(canInteract: boolean): void {
    this.canInteract = canInteract;
    if (this.isReady) {
      this.renderScene();
    }
  }

  public syncState(nextState: CheckersState): void {
    this.state = cloneState(nextState);
    this.winner = this.getResolvedWinner(this.state);

    if (this.isReady) {
      this.renderScene();
      this.emitStatus();
    }
  }

  public applyRemoteMove(payload: MovePayload): void {
    this.state = cloneState(payload.resultingState);
    this.winner = this.getResolvedWinner(this.state);

    if (this.isReady) {
      this.renderScene();
      this.emitStatus();
    }
  }

  public resetBoard(): void {
    this.state = getInitialState();
    this.winnerOverride = undefined;
    this.winner = this.getResolvedWinner(this.state);

    if (this.isReady) {
      this.renderScene();
      this.emitStatus();
    }
  }

  public setWinnerOverride(winnerOverride: Player | null | undefined): void {
    this.winnerOverride = winnerOverride;
    this.winner = this.getResolvedWinner(this.state);

    if (this.isReady) {
      this.renderScene();
      this.emitStatus();
    }
  }

  private getResolvedWinner(state: CheckersState): Player | null {
    return this.winnerOverride === undefined ? getWinner(state) : this.winnerOverride;
  }

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      COLORS.backgroundTop,
      COLORS.backgroundTop,
      COLORS.backgroundBottom,
      COLORS.backgroundBottom,
      1
    );
    bg.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

    const frame = this.add.graphics();
    frame.lineStyle(6, COLORS.frame, 0.9);
    frame.strokeRoundedRect(
      BOARD_X - 14,
      BOARD_Y - 14,
      BOARD_PIXELS + 28,
      BOARD_PIXELS + 28,
      12
    );
  }

  private renderScene(): void {
    this.boardLayer?.destroy(true);
    this.uiLayer?.destroy(true);
    this.modalLayer?.destroy(true);

    this.boardLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);
    this.modalLayer = this.add.container(0, 0);

    this.drawBoard();
    this.drawUi();
    this.drawGameOverOverlay();
  }

  private drawBoard(): void {
    const moves = this.state.selected
      ? this.getAllowedMovesForSelection(this.state.selected)
      : [];

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const isDark = (x + y) % 2 === 1;
        const baseColor = isDark
          ? y % 2 === 0
            ? COLORS.darkTile
            : COLORS.darkTileAlt
          : y % 2 === 0
            ? COLORS.lightTile
            : COLORS.lightTileAlt;

        const tile = this.add
          .rectangle(
            BOARD_X + x * TILE_SIZE + TILE_SIZE / 2,
            BOARD_Y + y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
            baseColor
          )
          .setStrokeStyle(1, 0x000000, 0.12);
        this.boardLayer?.add(tile);

        const labelNeeded = x === 0 || y === BOARD_SIZE - 1;
        if (labelNeeded) {
          if (x === 0) {
            const rowLabel = this.add
              .text(
                BOARD_X - 14,
                BOARD_Y + y * TILE_SIZE + TILE_SIZE / 2,
                String(BOARD_SIZE - y),
                {
                  color: "#cbbba8",
                  fontSize: "14px",
                  fontFamily: "Arial",
                }
              )
              .setOrigin(0.5);
            this.boardLayer?.add(rowLabel);
          }

          if (y === BOARD_SIZE - 1) {
            const colLabel = this.add
              .text(
                BOARD_X + x * TILE_SIZE + TILE_SIZE / 2,
                BOARD_Y + BOARD_PIXELS + 12,
                String.fromCharCode(65 + x),
                {
                  color: "#cbbba8",
                  fontSize: "14px",
                  fontFamily: "Arial",
                }
              )
              .setOrigin(0.5);
            this.boardLayer?.add(colLabel);
          }
        }

        if (
          this.state.selected &&
          this.state.selected.x === x &&
          this.state.selected.y === y
        ) {
          const selected = this.add
            .rectangle(
              BOARD_X + x * TILE_SIZE + TILE_SIZE / 2,
              BOARD_Y + y * TILE_SIZE + TILE_SIZE / 2,
              TILE_SIZE - 6,
              TILE_SIZE - 6
            )
            .setStrokeStyle(4, COLORS.select, 0.95);
          this.boardLayer?.add(selected);
        }

        const move = moves.find((option) => option.x === x && option.y === y);
        if (move) {
          const marker = this.add.circle(
            BOARD_X + x * TILE_SIZE + TILE_SIZE / 2,
            BOARD_Y + y * TILE_SIZE + TILE_SIZE / 2,
            move.capture ? 14 : 10,
            move.capture ? COLORS.captureHint : COLORS.moveHint,
            move.capture ? 0.5 : 0.35
          );
          this.boardLayer?.add(marker);
        }

        const piece = this.state.board[y][x];
        if (piece) {
          this.drawPiece(x, y, piece);
        }
      }
    }
  }

  private drawPiece(x: number, y: number, piece: Piece): void {
    const cx = BOARD_X + x * TILE_SIZE + TILE_SIZE / 2;
    const cy = BOARD_Y + y * TILE_SIZE + TILE_SIZE / 2;
    const fill = piece.color === "white" ? COLORS.whitePiece : COLORS.blackPiece;
    const shadow =
      piece.color === "white" ? COLORS.whiteShadow : COLORS.blackShadow;

    const container = this.add.container(cx, cy);
    const shadowDisc = this.add.ellipse(0, 6, 38, 14, 0x000000, 0.18);
    const discBottom = this.add.circle(0, 5, 24, shadow, 1);
    const discTop = this.add.circle(0, 0, 24, fill, 1);
    discTop.setStrokeStyle(2, 0xffffff, piece.color === "white" ? 0.15 : 0.06);
    container.add([shadowDisc, discBottom, discTop]);

    if (piece.king) {
      const crown = this.add.text(0, -1, "K", {
        fontFamily: "Arial Black",
        fontSize: "20px",
        color: piece.color === "white" ? "#b07a00" : "#ffd166",
      });
      crown.setOrigin(0.5);
      container.add(crown);
    }

    this.boardLayer?.add(container);
  }

  private drawUi(): void {
    const title = this.add.text(BOARD_X, 24, "Checkers", {
      fontFamily: "Arial Black",
      fontSize: "28px",
      color: "#f8f2e9",
    });
    this.uiLayer?.add(title);

    const counts = getPieceCounts(this.state.board);
    const activeText = this.winner
      ? `${this.capitalize(this.winner)} wins`
      : `${this.capitalize(this.state.turn)} to move`;
    const detailText = this.winner
      ? "Game over"
      : this.mode === "multiplayer_online"
        ? this.state.turn === this.playerColor && this.canInteract
          ? "Your turn"
          : "Waiting for opponent"
        : "Local match";

    const turnCard = this.add.container(PANEL_X, BOARD_Y);
    const cardBg = this.add
      .rectangle(92, 58, 184, 116, 0x182230, 0.96)
      .setStrokeStyle(
        2,
        this.winner
          ? this.winner === "white"
            ? COLORS.whitePiece
            : COLORS.captureHint
          : this.state.turn === "white"
            ? COLORS.whitePiece
            : COLORS.button,
        0.7
      );
    const turnLabel = this.add.text(20, 18, "Turn", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#b8c7d9",
    });
    const turnValue = this.add.text(20, 42, activeText, {
      fontFamily: "Arial Black",
      fontSize: "23px",
      color: "#f7f4ef",
    });
    const turnMeta = this.add.text(20, 76, detailText, {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#8ea2ba",
    });
    turnCard.add([cardBg, turnLabel, turnValue, turnMeta]);
    this.uiLayer?.add(turnCard);

    const stats = this.add.container(PANEL_X, BOARD_Y + 142);
    const statsBg = this.add
      .rectangle(92, 64, 184, 128, 0x15202d, 0.94)
      .setStrokeStyle(2, 0x34495f, 0.75);
    const whiteCount = this.add.text(18, 18, `White: ${counts.white}`, {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#f7f3eb",
    });
    const blackCount = this.add.text(18, 48, `Black: ${counts.black}`, {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#d7deea",
    });
    const modeLabel = this.add.text(
      18,
      82,
      this.mode === "multiplayer_online" ? "Online multiplayer ready" : "Same-device play",
      {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#8ea2ba",
        wordWrap: { width: 150 },
      }
    );
    stats.add([statsBg, whiteCount, blackCount, modeLabel]);
    this.uiLayer?.add(stats);

    if (this.mode === "local") {
      const resetButton = this.add.container(PANEL_X, BOARD_Y + 300);
      const buttonBg = this.add
        .rectangle(92, 26, 184, 52, COLORS.button, 1)
        .setStrokeStyle(2, 0xffffff, 0.15)
        .setInteractive({ useHandCursor: true });
      const buttonLabel = this.add.text(92, 26, "Reset Match", {
        fontFamily: "Arial Black",
        fontSize: "18px",
        color: "#081019",
      });
      buttonLabel.setOrigin(0.5);
      buttonBg.on("pointerover", () => buttonBg.setFillStyle(COLORS.buttonHover, 1));
      buttonBg.on("pointerout", () => buttonBg.setFillStyle(COLORS.button, 1));
      buttonBg.on("pointerdown", () => this.resetBoard());
      resetButton.add([buttonBg, buttonLabel]);
      this.uiLayer?.add(resetButton);
    }
  }

  private drawGameOverOverlay(): void {
    if (!this.winner) {
      return;
    }

    const overlay = this.add.container(0, 0);
    const shade = this.add.rectangle(
      SCENE_WIDTH / 2,
      SCENE_HEIGHT / 2,
      SCENE_WIDTH,
      SCENE_HEIGHT,
      COLORS.overlay,
      0.72
    );
    const panel = this.add
      .rectangle(
        SCENE_WIDTH / 2,
        SCENE_HEIGHT / 2,
        360,
        220,
        this.winner === "white" ? COLORS.victory : COLORS.defeat,
        0.94
      )
      .setStrokeStyle(3, 0xffffff, 0.2);
    const title = this.add.text(
      SCENE_WIDTH / 2,
      SCENE_HEIGHT / 2 - 48,
      `${this.capitalize(this.winner)} Wins`,
      {
        fontFamily: "Arial Black",
        fontSize: "34px",
        color: "#ffffff",
      }
    );
    title.setOrigin(0.5);
    const subtitle = this.add.text(
      SCENE_WIDTH / 2,
      SCENE_HEIGHT / 2 - 8,
      "Play again with the reset button.",
      {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#f3f4f6",
      }
    );
    subtitle.setOrigin(0.5);
    const badge = this.add.text(
      SCENE_WIDTH / 2,
      SCENE_HEIGHT / 2 + 52,
      this.winner === "white" ? "Light pieces dominate the board" : "Dark pieces close out the game",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ecf0f1",
      }
    );
    badge.setOrigin(0.5);

    overlay.add([shade, panel, title, subtitle, badge]);
    this.modalLayer?.add(overlay);
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    if (
      this.winner ||
      pointer.x < BOARD_X ||
      pointer.x >= BOARD_X + BOARD_PIXELS ||
      pointer.y < BOARD_Y ||
      pointer.y >= BOARD_Y + BOARD_PIXELS
    ) {
      return;
    }

    if (!this.isLocalPlayersTurn()) {
      return;
    }

    const x = Math.floor((pointer.x - BOARD_X) / TILE_SIZE);
    const y = Math.floor((pointer.y - BOARD_Y) / TILE_SIZE);
    const clickedPiece = this.state.board[y][x];

    if (!this.state.selected) {
      this.applySelect(x, y);
      return;
    }

    const allowedMoves = this.getAllowedMovesForSelection(this.state.selected);
    const moveSelected = allowedMoves.some((move) => move.x === x && move.y === y);
    if (moveSelected) {
      const previous = this.state.selected;
      const nextState = checkersReducer(this.state, { type: "MOVE", x, y });
      if (nextState !== this.state) {
        this.state = nextState;
        this.afterMove({ from: previous, to: { x, y }, resultingState: nextState });
      }
      return;
    }

    if (clickedPiece && clickedPiece.color === this.state.turn) {
      this.applySelect(x, y);
      return;
    }

    this.state = { ...this.state, selected: null };
    this.renderScene();
  }

  private applySelect(x: number, y: number): void {
    this.state = checkersReducer(this.state, {
      type: "SELECT",
      x,
      y,
    });
    this.renderScene();
  }

  private afterMove(payload: MovePayload): void {
    this.winner = this.getResolvedWinner(this.state);
    this.renderScene();
    this.emitStatus();

    if (this.mode === "multiplayer_online" && this.onPlayerMove) {
      this.onPlayerMove({
        from: payload.from,
        to: payload.to,
        resultingState: {
          board: cloneBoard(payload.resultingState.board),
          turn: payload.resultingState.turn,
          selected: payload.resultingState.selected
            ? { ...payload.resultingState.selected }
            : null,
        },
      });
    }
  }

  private emitStatus(): void {
    if (!this.onStatusChange) {
      return;
    }

    const counts = getPieceCounts(this.state.board);
    this.onStatusChange(
      this.winner ? "game_over" : "playing",
      this.state.turn,
      {
        winner: this.winner,
        whitePieces: counts.white,
        blackPieces: counts.black,
        multiplayer: this.mode === "multiplayer_online",
      }
    );
  }

  private getAllowedMovesForSelection(selected: Position): MoveOption[] {
    const forcedMoveGroups = getAllMoves(this.state.board, this.state.turn);
    const match = forcedMoveGroups.find(
      (group) => group.from.x === selected.x && group.from.y === selected.y
    );
    return match?.moves ?? [];
  }

  private isLocalPlayersTurn(): boolean {
    if (this.mode !== "multiplayer_online") {
      return true;
    }

    return this.canInteract && this.state.turn === this.playerColor;
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
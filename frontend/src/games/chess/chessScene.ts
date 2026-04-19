import Phaser from "phaser";
import { createInitialBoard } from "./rules";
import { chessReducer } from "./reducer";
import type { ChessState, Player, Position } from "./types";

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
export const CHESS_SCENE_WIDTH = 512;
export const CHESS_SCENE_HEIGHT = 512;

export type MovePayload = {
  from: Position;
  to: Position;
  resultingState: ChessState;
};

type MoveCallback = (payload: MovePayload) => void;
export type SceneMode = "local" | "multiplayer_online";

export interface ChessSceneConfig {
  mode?: SceneMode;
  initialState?: ChessState;
  playerColor?: Player;
  canInteract?: boolean;
  onPlayerMove?: MoveCallback | null;
}

function cloneState(state: ChessState): ChessState {
  return {
    board: state.board.map((row) => row.map((piece) => (piece ? { ...piece } : null))),
    turn: state.turn,
    selected: state.selected ? { ...state.selected } : null,
  };
}

function getInitialState(): ChessState {
  return {
    board: createInitialBoard().map((row) => row.map((piece) => (piece ? { ...piece } : null))),
    turn: "white",
    selected: null,
  };
}

export class ChessScene extends Phaser.Scene {
  private state: ChessState;
  private mode: SceneMode;
  private playerColor: Player;
  private canInteract: boolean;
  private onPlayerMove: MoveCallback | null;

  constructor(config?: ChessSceneConfig) {
    super("ChessScene");
    this.state = cloneState(config?.initialState ?? getInitialState());
    this.mode = config?.mode ?? "local";
    this.playerColor = config?.playerColor ?? "white";
    this.canInteract = config?.canInteract ?? true;
    this.onPlayerMove = config?.onPlayerMove ?? null;
  }

  preload() {
    this.load.image("b_bishop", black_bishop);
    this.load.image("b_king", black_king);
    this.load.image("b_knight", black_knight);
    this.load.image("b_pawn", black_pawn);
    this.load.image("b_queen", black_queen);
    this.load.image("b_rook", black_rook);
    this.load.image("w_bishop", white_bishop);
    this.load.image("w_king", white_king);
    this.load.image("w_knight", white_knight);
    this.load.image("w_pawn", white_pawn);
    this.load.image("w_queen", white_queen);
    this.load.image("w_rook", white_rook);
  }

  create() {
    this.drawBoard();
    this.input.on("pointerdown", this.handleClick, this);
  }

  configureSession(config: {
    mode?: SceneMode;
    playerColor?: Player;
    canInteract?: boolean;
    onPlayerMove?: MoveCallback | null;
  }) {
    if (config.mode) this.mode = config.mode;
    if (config.playerColor) this.playerColor = config.playerColor;
    if (typeof config.canInteract === "boolean") this.canInteract = config.canInteract;
    if (config.onPlayerMove !== undefined) this.onPlayerMove = config.onPlayerMove;
  }

  syncState(state: ChessState) {
    this.state = cloneState(state);
    this.drawBoard();
  }

  private drawBoard() {
    this.children.removeAll();

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const isLight = (x + y) % 2 === 0;
        const color = isLight ? 0xf0d9b5 : 0xb58863;
        this.add.rectangle(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, color).setOrigin(0);

        if (this.state.selected && this.state.selected.x === x && this.state.selected.y === y) {
          this.add.rectangle(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0xffff00, 0.3).setOrigin(0);
        }

        const piece = this.state.board?.[y]?.[x];
        if (piece?.type && piece?.color) {
          const textureKey = piece.color === "white" ? `w_${piece.type}` : `b_${piece.type}`;
          if (this.textures.exists(textureKey)) {
            this.add.image(x * TILE_SIZE + 32, y * TILE_SIZE + 32, textureKey);
          } else {
            console.warn("[chess] missing texture", textureKey, piece);
          }
        }
      }
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    if (!this.canInteract) return;

    const x = Math.floor(pointer.x / TILE_SIZE);
    const y = Math.floor(pointer.y / TILE_SIZE);
    if (x < 0 || x > 7 || y < 0 || y > 7) return;

    const previous = cloneState(this.state);
    const currentPiece = this.state.board[y][x];

    if (this.mode === "multiplayer_online") {
      if (!this.state.selected) {
        if (!currentPiece || currentPiece.color !== this.playerColor || this.state.turn !== this.playerColor) {
          return;
        }
      }
    }

    const next = !this.state.selected
      ? chessReducer(this.state, { type: "SELECT", x, y })
      : chessReducer(this.state, { type: "MOVE", x, y });

    const moved =
      previous.selected !== null &&
      next.selected === null &&
      (JSON.stringify(previous.board) !== JSON.stringify(next.board) || previous.turn !== next.turn);

    this.state = next;
    this.drawBoard();

    if (moved && this.mode === "multiplayer_online" && this.onPlayerMove && previous.selected) {
      this.onPlayerMove({
        from: previous.selected,
        to: { x, y },
        resultingState: cloneState(next),
      });
    }
  }
}
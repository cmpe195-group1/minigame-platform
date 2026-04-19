import { useEffect, useRef } from "react";
import Phaser from "phaser";
import {
  CHESS_SCENE_HEIGHT,
  CHESS_SCENE_WIDTH,
  ChessScene,
  type MovePayload,
  type SceneMode,
} from "./chessScene";
import type { ChessState, Player } from "./types";

interface Props {
  mode?: SceneMode;
  state?: ChessState | null;
  playerColor?: Player;
  canInteract?: boolean;
  onPlayerMove?: (payload: MovePayload) => void;
  wrapperClassName?: string;
  boardClassName?: string;
}

export default function ChessGameWrapper({
  mode = "local",
  state,
  playerColor = "white",
  canInteract = true,
  onPlayerMove,
  wrapperClassName,
  boardClassName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ChessScene | null>(null);
  const initialConfigRef = useRef({ mode, state, playerColor, canInteract, onPlayerMove });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const initialConfig = initialConfigRef.current;
    const scene = new ChessScene({
      mode: initialConfig.mode,
      initialState: initialConfig.state ?? undefined,
      playerColor: initialConfig.playerColor,
      canInteract: initialConfig.canInteract,
      onPlayerMove: initialConfig.onPlayerMove ?? null,
    });

    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: CHESS_SCENE_WIDTH,
      height: CHESS_SCENE_HEIGHT,
      parent: containerRef.current,
      scene,
      backgroundColor: "#000",
    });

    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      sceneRef.current?.configureSession({
        mode,
        playerColor,
        canInteract,
        onPlayerMove: onPlayerMove ?? null,
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [mode, playerColor, canInteract, onPlayerMove]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (state) sceneRef.current?.syncState(state);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div className={wrapperClassName}>
      <div
        ref={containerRef}
        style={{ width: CHESS_SCENE_WIDTH, height: CHESS_SCENE_HEIGHT }}
        className={
          boardClassName ??
          "rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950/60"
        }
      />
    </div>
  );
}

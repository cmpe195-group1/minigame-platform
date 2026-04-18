import { useEffect, useRef } from "react";
import Phaser from "phaser";
import {
  CHECKERS_SCENE_HEIGHT,
  CHECKERS_SCENE_WIDTH,
  CheckersScene,
  type CheckersSceneStatusExtra,
  type MovePayload,
  type SceneMode,
} from "./checkersScene";
import type { CheckersState, Player } from "./types";

interface Props {
  mode?: SceneMode;
  state?: CheckersState | null;
  playerColor?: Player;
  canInteract?: boolean;
  winnerOverride?: Player | null;
  onStatusChange?: (
    status: "playing" | "game_over",
    turn: Player,
    extra?: CheckersSceneStatusExtra
  ) => void;
  onPlayerMove?: (payload: MovePayload) => void;
  wrapperClassName?: string;
  boardClassName?: string;
}

export default function CheckersGameWrapper({
  mode = "local",
  state,
  playerColor = "white",
  canInteract = true,
  winnerOverride,
  onStatusChange,
  onPlayerMove,
  wrapperClassName,
  boardClassName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<CheckersScene | null>(null);
  const initialConfigRef = useRef({
    mode,
    state,
    playerColor,
    canInteract,
    winnerOverride,
    onStatusChange,
    onPlayerMove,
  });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    const initialConfig = initialConfigRef.current;
    const scene = new CheckersScene({
      mode: initialConfig.mode,
      initialState: initialConfig.state ?? undefined,
      playerColor: initialConfig.playerColor,
      canInteract: initialConfig.canInteract,
      winnerOverride: initialConfig.winnerOverride,
      onStatusChange: initialConfig.onStatusChange ?? null,
      onPlayerMove: initialConfig.onPlayerMove ?? null,
    });

    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: CHECKERS_SCENE_WIDTH,
      height: CHECKERS_SCENE_HEIGHT,
      parent: containerRef.current,
      backgroundColor: "#101722",
      scene,
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    gameRef.current = game;

    return () => {
      gameRef.current?.destroy(true);
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
        winnerOverride,
        onStatusChange: onStatusChange ?? null,
        onPlayerMove: onPlayerMove ?? null,
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [mode, playerColor, canInteract, winnerOverride, onStatusChange, onPlayerMove]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (state) {
        sceneRef.current?.syncState(state);
      }
    }, 50);

    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div className={wrapperClassName}>
      <div
        ref={containerRef}
        style={{ width: CHECKERS_SCENE_WIDTH, height: CHECKERS_SCENE_HEIGHT }}
        className={
          boardClassName ??
          "rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950/60"
        }
      />
    </div>
  );
}

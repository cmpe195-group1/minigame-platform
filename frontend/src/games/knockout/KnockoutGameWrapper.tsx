import { useEffect, useMemo, useRef } from "react";
import Phaser from "phaser";

import {
  KnockoutScene,
  type KnockoutSceneConfig,
  type SceneMode,
} from "./knockoutScene";
import type {
  KnockoutGameState,
  LocalShotPayload,
  ShotReplayPayload,
  Player,
  KnockoutStatus,
} from "./types";

interface Props {
  mode?: SceneMode;
  state?: KnockoutGameState;
  playerSide?: Player;
  canInteract?: boolean;
  shotReplay?: ShotReplayPayload | null;
  onStatusChange?: (status: KnockoutStatus) => void;
  onShotTaken?: (payload: LocalShotPayload) => void;
  onTurnResolved?: (payload: { resultingState: KnockoutGameState }) => void;
}

export default function KnockoutGameWrapper({
  mode = "local",
  state,
  playerSide = "A",
  canInteract = true,
  shotReplay = null,
  onStatusChange,
  onShotTaken,
  onTurnResolved,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<KnockoutScene | null>(null);
  const lastReplayKeyRef = useRef<string | null>(null);
  const lastStateSignatureRef = useRef<string | null>(null);

  const stateSignature = useMemo(() => {
    return state ? JSON.stringify(state) : null;
  }, [state]);

  useEffect(() => {
    if (!rootRef.current || gameRef.current) return;

    const sceneConfig: KnockoutSceneConfig = {
      mode,
      initialState: state,
      playerSide,
      canInteract,
      onStatusChange,
      onShotTaken,
      onTurnResolved,
    };

    const scene = new KnockoutScene(sceneConfig);
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: rootRef.current,
      backgroundColor: "#0f172a",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene,
    });

    gameRef.current = game;

    return () => {
      sceneRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    scene.configureSession({
      mode,
      playerSide,
      canInteract,
      onStatusChange,
      onShotTaken,
      onTurnResolved,
    });
  }, [mode, playerSide, canInteract, onStatusChange, onShotTaken, onTurnResolved]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !state || !scene.getReady() || !stateSignature) return;

    // If the scene is still animating the current turn locally,
    // do not overwrite it with a server snapshot from that same turn.
    if (
      mode === "multiplayer_online" &&
      scene.isBusyAnimatingTurn() &&
      state.turnNumber === scene.getTurnNumber()
    ) {
      return;
    }

    if (lastStateSignatureRef.current === stateSignature) {
      return;
    }

    lastStateSignatureRef.current = stateSignature;
    scene.syncState(state);
  }, [mode, state, stateSignature]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !shotReplay) return;

    const replayKey = `${shotReplay.turnNumber}:${shotReplay.puckId}:${shotReplay.impulseX}:${shotReplay.impulseY}:${shotReplay.shooterClientId}`;
    if (lastReplayKeyRef.current === replayKey) return;

    lastReplayKeyRef.current = replayKey;
    scene.applyRemoteShot(shotReplay);
  }, [shotReplay]);

  return (
    <div className="w-full max-w-[800px]">
      <div ref={rootRef} data-testid="knockout-phaser-root" />
    </div>
  );
}
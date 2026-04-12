/**
 * GameCanvas.tsx - React component that hosts the Phaser game
 *
 * Creates a Phaser game instance and manages it.
 * Exposes a ref for the parent to access the Phaser scene
 * (needed for online multiplayer to push attack results into Phaser).
 */

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Phaser from "phaser";
import { BattleshipScene } from "../phaser/scenes/BattleshipScene";
import { GameLogic, type GameMode, is4PlayerMode } from "../game/GameLogic";

/** Props for the GameCanvas component */
interface GameCanvasProps {
  mode: GameMode;
  gameLogic: GameLogic;
  playerRole?: "host" | "guest";
  myPlayerIndex?: number;
  onStatusChange: (
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
  onPlayerAttack?: (col: number, row: number) => void;
}

/** Ref handle to interact with the Phaser scene from React */
export interface GameCanvasHandle {
  getScene: () => BattleshipScene | null;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ mode, gameLogic, playerRole, myPlayerIndex, onStatusChange, onPlayerAttack }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<BattleshipScene | null>(null);

    const is4P = is4PlayerMode(mode);
    const canvasHeight = is4P ? 920 : 560;

    // Expose scene access to parent
    useImperativeHandle(ref, () => ({
      getScene: () => sceneRef.current,
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 960,
        height: canvasHeight,
        parent: containerRef.current,
        backgroundColor: "#050e1a",
        scene: [BattleshipScene],
        callbacks: {
          postBoot: (game: Phaser.Game) => {
            // Store reference to the scene once it's created
            game.events.on("step", () => {
              if (!sceneRef.current) {
                const scene = game.scene.getScene("BattleshipScene") as BattleshipScene;
                if (scene) {
                  sceneRef.current = scene;
                }
              }
            });
          },
        },
      };

      // Share data with Phaser via registry
      const game = new Phaser.Game(config);
      game.registry.set("gameLogic", gameLogic);
      game.registry.set("mode", mode);
      game.registry.set("onStatusChange", onStatusChange);
      game.registry.set("onPlayerAttack", onPlayerAttack || null);
      game.registry.set("playerRole", playerRole || "host");
      game.registry.set("myPlayerIndex", myPlayerIndex ?? 0);
      gameRef.current = game;

      return () => {
        sceneRef.current = null;
        game.destroy(true);
        gameRef.current = null;
      };
    }, [mode, gameLogic, onStatusChange, onPlayerAttack, playerRole, myPlayerIndex, canvasHeight]);

    return (
      <div
        ref={containerRef}
        style={{ width: 960, height: canvasHeight }}
        className="rounded-xl overflow-hidden shadow-2xl border border-blue-900/50"
      />
    );
  }
);

GameCanvas.displayName = "GameCanvas";


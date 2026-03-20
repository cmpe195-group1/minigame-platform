import { useEffect, useRef } from "react";
import Phaser from "phaser";
import SudokuScene, { CANVAS_SIZE } from "../phaser/SudokuScene";
import type { Board } from "../game/SudokuBoard";
import type { Player } from "../game/Player";

interface Props {
  board: Board;
  players: Player[];
  currentPlayerIndex: number;
  onCellClick: (row: number, col: number) => void;
  sceneRef: React.MutableRefObject<SudokuScene | null>;
}

export default function GameCanvas({
  board,
  players,
  currentPlayerIndex,
  onCellClick,
  sceneRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Boot Phaser once on mount
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new SudokuScene();
    sceneRef.current = scene;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: "#f8fafc",
      parent: containerRef.current,
      scene: scene,
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push board/player state into Phaser every time it changes
  useEffect(() => {
    if (!sceneRef.current || !board || board.length === 0) return;

    // Use a small timeout to allow Phaser's create() to finish
    // if this effect runs right after the game boots
    const push = () => {
      sceneRef.current?.updateBoard(board, players, currentPlayerIndex);
      sceneRef.current?.setOnCellClick(onCellClick);
    };

    // If scene is already ready, push immediately; otherwise wait one frame
    const timer = setTimeout(push, 50);
    return () => clearTimeout(timer);
  }, [board, players, currentPlayerIndex, onCellClick, sceneRef]);

  return (
    <div
      ref={containerRef}
      style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      className="rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-200"
    />
  );
}

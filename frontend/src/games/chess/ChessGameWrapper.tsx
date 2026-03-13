import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { ChessScene } from "./chessScene";

export default function ChessGameWrapper() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 512,
      height: 512,
      parent: ref.current!,
      scene: ChessScene,
    });

    return () => game.destroy(true);
  }, []);

  return <div ref={ref} />;
}
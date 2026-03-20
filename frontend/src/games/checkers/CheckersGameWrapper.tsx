import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { CheckersScene } from "./checkersScene";

export default function CheckersGameWrapper() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 512,
      height: 512,
      parent: ref.current,
      scene: CheckersScene,
    });

    return () => game.destroy(true);
  }, []);

  return <div ref={ref} />;
}
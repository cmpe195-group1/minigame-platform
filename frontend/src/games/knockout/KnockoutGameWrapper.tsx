import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { KnockoutScene } from "./knockoutScene";

export default function KnockoutGameWrapper() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: ref.current!,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: KnockoutScene,
    });

    return () => game.destroy(true);
  }, []);

  return (
    <div
      style={{
        marginTop: "100px",
        marginLeft: "128px",
        width: "calc(100% - 128px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0 }}>Knockout</h1>
        <p style={{ margin: "8px 0 0" }}>
          Dodge, move, and outlast your opponent in this fast-paced arena
          brawler.
        </p>
      </div>
      <div ref={ref} />
    </div>
  );
}

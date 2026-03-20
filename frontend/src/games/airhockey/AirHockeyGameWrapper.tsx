import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { AirHockeyScene } from "./AirHockeyScene";

export default function AirHockeyGameWrapper() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 600,
      height: 400,
      parent: ref.current!,
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
      scene: AirHockeyScene,
      backgroundColor: "#000",
    });

    return () => game.destroy(true);
  }, []);

  return (
    <div
      style={{
        marginTop: "100px",           // below header
        marginLeft: "128px",          // right of sidebar
        width: "calc(100% - 128px)",  // remaining space
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div ref={ref} />
    </div>
  );
}
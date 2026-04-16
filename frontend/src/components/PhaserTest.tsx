import { useEffect } from "react";
import Phaser from "phaser";

export default function PhaserTest() {

  useEffect(() => {

    class MainScene extends Phaser.Scene {
      constructor() {
        super("main");
      }

      preload() {}

      create() {
        this.add.text(100, 100, "Phaser is working!", {
          fontSize: "32px",
          color: "#ffffff"
        });
      }
    }

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      backgroundColor: "#2d2d2d",
      parent: "phaser-container",
      scene: [MainScene]
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };

  }, []);

  return <div id="phaser-container"></div>;
}
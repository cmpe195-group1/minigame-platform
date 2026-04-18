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
        backgroundColor: "#000",
      });
  
      return () => game.destroy(true);
    }, []);
  
    return (
      <div
        style={{
          marginTop: "100px",          // pushes below header
          marginLeft: "128px",         // pushes right of sidebar
          width: "calc(100% - 128px)",// remaining width after sidebar
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div ref={ref} />
      </div>
    );
}
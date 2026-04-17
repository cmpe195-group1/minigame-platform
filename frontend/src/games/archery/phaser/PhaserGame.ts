/**
 * PhaserGame.ts
 * Factory that creates the Phaser.Game instance.
 * Supports multiplayer: each client knows its own slot.
 */

import Phaser from 'phaser';
import ArcheryScene, { type SceneInitData } from './scenes/ArcheryScene';
import type { ArrowShotSubmission, RoomSnapshot } from '../network/useGameSocket';

export interface PhaserCallbacks {
  onArrowLanded: (shot: ArrowShotSubmission) => void;
}

export function createPhaserGame(
  parent: HTMLElement,
  initData: { mySlot: number; room: RoomSnapshot },
  callbacks: PhaserCallbacks,
): Phaser.Game {

  const sceneInitData: SceneInitData = {
    mySlot: initData.mySlot,
    room  : initData.room,
  };

  const game = new Phaser.Game({
    type             : Phaser.AUTO,
    width            : 860,
    height           : 500,
    parent,
    backgroundColor  : '#87CEEB',
    physics: {
      default: 'arcade',
      arcade : { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [ArcheryScene],
    disableContextMenu: true,
    scale: {
      mode      : Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  // Seed registry BEFORE scene boots
  game.registry.set('sceneInitData', sceneInitData);
  game.registry.set('callbacks',     callbacks);
  game.registry.set('room',          initData.room);
  game.registry.set('mySlot',        initData.mySlot);

  return game;
}

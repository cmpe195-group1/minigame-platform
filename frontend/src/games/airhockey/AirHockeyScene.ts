import Phaser from "phaser";

export class AirHockeyScene extends Phaser.Scene {
  private puck!: Phaser.GameObjects.Arc;
  private player!: Phaser.GameObjects.Arc;

  constructor() {
    super("AirHockeyScene");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // table background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b6623);

    // puck
    this.puck = this.add.circle(width / 2, height / 2, 10, 0xffffff);
    this.physics.add.existing(this.puck);
    const puckBody = this.puck.body as Phaser.Physics.Arcade.Body;
    puckBody.setCollideWorldBounds(true, 1, 1);
    puckBody.setBounce(1);
    puckBody.setVelocity(200, 150);

    // player paddle
    this.player = this.add.circle(width / 2, height - 50, 15, 0x00aaff);
    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCollideWorldBounds(true);

    // collision
    this.physics.add.collider(this.player, this.puck);

    // mouse control
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.player.x = Phaser.Math.Clamp(pointer.x, 0, width);
      this.player.y = Phaser.Math.Clamp(pointer.y, height / 2, height);
    });
  }
}
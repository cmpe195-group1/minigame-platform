import Phaser from "phaser";
import {
  WIDTH,
  HEIGHT,
  PUCK_RADIUS,
  MAX_POWER,
  FRICTION,
  STOP_THRESHOLD,
} from "./constants";

type Player = "A" | "B";

export class KnockoutScene extends Phaser.Scene {
  private static readonly BOARD = new Phaser.Geom.Rectangle(70, 90, 660, 420);
  private static readonly ELIMINATION_MARGIN = 34;
  private static readonly EDGE_SLOW_ZONE = 58;
  private static readonly MAX_PUCK_SPEED = MAX_POWER * 1.2;
  private static readonly BASE_FRICTION = Math.max(FRICTION, 0.992);
  private static readonly COLLISION_SEPARATION_BIAS = 0.75;
  private static readonly MIN_COLLISION_EXIT_SPEED = 26;
  private static readonly COLLISION_REPULSION = 18;

  private currentPlayer: Player = "A";
  private phase: "aiming" | "waiting" | "finished" = "aiming";

  private pucks!: Phaser.Physics.Arcade.Group;
  private selectedPuck: Phaser.Physics.Arcade.Image | null = null;

  private aimingLine!: Phaser.GameObjects.Graphics;
  private turnBadge!: Phaser.GameObjects.Container;
  private infoText!: Phaser.GameObjects.Text;
  private handoffOverlay!: Phaser.GameObjects.Container;
  private winnerOverlay!: Phaser.GameObjects.Container;
  private handoffText!: Phaser.GameObjects.Text;
  private winnerText!: Phaser.GameObjects.Text;

  constructor() {
    super("KnockoutScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#f5efe2");
    this.drawBoard();
    this.createPuckTextures();
    this.physics.world.OVERLAP_BIAS = Math.max(this.physics.world.OVERLAP_BIAS, PUCK_RADIUS);

    this.pucks = this.physics.add.group();
    this.physics.add.collider(
      this.pucks,
      this.pucks,
      this.handlePuckCollision,
      this.shouldProcessPuckCollision,
      this
    );

    this.aimingLine = this.add.graphics().setDepth(12).setVisible(false);
    this.createUi();

    this.spawnPucks();
    this.showHandoffPopup("Player A", "Take your shot");

    this.input.on("pointerdown", this.onDown, this);
    this.input.on("pointermove", this.onMove, this);
    this.input.on("pointerup", this.onUp, this);
  }

  spawnPucks() {
    this.pucks.clear(true, true);

    const createPuck = (x: number, y: number, color: number, player: Player) => {
      const textureKey = player === "A" ? "knockout-puck-a" : "knockout-puck-b";
      const puck = this.physics.add.image(x, y, textureKey);
      const body = puck.body as Phaser.Physics.Arcade.Body;

      puck.setCircle(PUCK_RADIUS);
      puck.setBounce(1.02);
      puck.setDrag(1.2, 1.2);
      puck.setCollideWorldBounds(false);
      puck.setMaxVelocity(KnockoutScene.MAX_PUCK_SPEED, KnockoutScene.MAX_PUCK_SPEED);
      puck.setDepth(5);
      body.setAllowGravity(false);
      body.setMass(1);
      body.pushable = true;

      puck.setTexture(textureKey);

      puck.setData("player", player);
      puck.setData("baseColor", color);

      this.pucks.add(puck);
      return puck;
    };

    for (let i = 0; i < 6; i++) {
      createPuck(170, 140 + i * 58, 0x2d8cff, "A");
    }

    for (let i = 0; i < 6; i++) {
      createPuck(630, 140 + i * 58, 0xff6b57, "B");
    }
  }

  onDown(pointer: Phaser.Input.Pointer) {
    if (this.phase !== "aiming" || this.handoffOverlay.visible || this.winnerOverlay.visible) return;

    const bodies = this.physics.overlapRect(pointer.x, pointer.y, 1, 1);

    if (!bodies.length) return;

    const puck = bodies[0].gameObject as Phaser.Physics.Arcade.Image;

    if (puck.getData("player") !== this.currentPlayer) return;
    if (this.isPuckMoving(puck)) return;

    this.selectedPuck = puck;
    this.aimingLine.setVisible(true);
    this.drawAimGuide(pointer);
  }

  onMove(pointer: Phaser.Input.Pointer) {
    if (!this.selectedPuck) return;

    this.drawAimGuide(pointer);
  }

  onUp(pointer: Phaser.Input.Pointer) {
    if (!this.selectedPuck) return;

    const dx = this.selectedPuck.x - pointer.x;
    const dy = this.selectedPuck.y - pointer.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 2.2, MAX_POWER);

    if (power > 10) {
      this.selectedPuck.setVelocity(
        (dx / Math.max(1, Math.sqrt(dx * dx + dy * dy))) * power,
        (dy / Math.max(1, Math.sqrt(dx * dx + dy * dy))) * power
      );
      this.phase = "waiting";
      this.setTurnUi(`${this.playerName(this.currentPlayer)} shooting...`);
    }

    this.selectedPuck = null;
    this.clearAimGuide();
  }

  update() {
    let moving = false;

    this.pucks.getChildren().forEach((obj) => {
      const puck = obj as Phaser.Physics.Arcade.Image;

      if (!puck.body) return;

      this.applyBoardForces(puck);
      const eliminated = this.checkElimination(puck);
      if (eliminated) return;

      if (puck.body.velocity.length() > STOP_THRESHOLD) {
        moving = true;
      } else {
        puck.setVelocity(0, 0);
      }
    });

    if (this.phase === "waiting" && !moving) {
      this.endRound();
    }
  }

  endRound() {
    const winner = this.getWinner();
    if (winner) {
      this.showWinner(winner);
      return;
    }

    this.phase = "aiming";
    this.currentPlayer = this.currentPlayer === "A" ? "B" : "A";
    this.setTurnUi(`${this.playerName(this.currentPlayer)}: drag to shoot`);
    this.showHandoffPopup(this.playerName(this.currentPlayer), "Hand over device");
  }

  private createPuckTextures() {
    this.createPuckTexture("knockout-puck-a", 0x2d8cff);
    this.createPuckTexture("knockout-puck-b", 0xff6b57);
  }

  private createPuckTexture(key: string, color: number) {
    if (this.textures.exists(key)) return;

    const size = PUCK_RADIUS * 2 + 8;
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(size / 2, size / 2, PUCK_RADIUS + 2);
    gfx.fillStyle(color, 1);
    gfx.fillCircle(size / 2, size / 2, PUCK_RADIUS);
    gfx.lineStyle(2, 0x16324f, 0.22);
    gfx.strokeCircle(size / 2, size / 2, PUCK_RADIUS);
    gfx.generateTexture(key, size, size);
    gfx.destroy();
  }

  private drawBoard() {
    const board = this.add.graphics();
    board.fillStyle(0xd2b48c, 1);
    board.fillRoundedRect(40, 60, WIDTH - 80, HEIGHT - 120, 28);
    board.fillStyle(0x2a8f62, 1);
    board.fillRoundedRect(
      KnockoutScene.BOARD.x,
      KnockoutScene.BOARD.y,
      KnockoutScene.BOARD.width,
      KnockoutScene.BOARD.height,
      22
    );
    board.lineStyle(4, 0xf4e6bd, 0.85);
    board.strokeRoundedRect(
      KnockoutScene.BOARD.x,
      KnockoutScene.BOARD.y,
      KnockoutScene.BOARD.width,
      KnockoutScene.BOARD.height,
      22
    );
    board.fillStyle(0xffffff, 0.1);
    board.fillRoundedRect(
      KnockoutScene.BOARD.x + 16,
      KnockoutScene.BOARD.y + 16,
      KnockoutScene.BOARD.width - 32,
      48,
      16
    );
    board.lineStyle(20, 0xf4e6bd, 0.08);
    board.strokeRoundedRect(
      KnockoutScene.BOARD.x + 6,
      KnockoutScene.BOARD.y + 6,
      KnockoutScene.BOARD.width - 12,
      KnockoutScene.BOARD.height - 12,
      20
    );
  }

  private createUi() {
    const badgeBg = this.add.rectangle(130, 34, 220, 44, 0x17324d, 0.92).setOrigin(0, 0);
    const badgeDot = this.add.circle(156, 56, 10, 0x2d8cff);
    this.infoText = this.add.text(176, 43, "", {
      color: "#ffffff",
      fontSize: "22px",
      fontStyle: "bold",
    });
    this.turnBadge = this.add.container(0, 0, [badgeBg, badgeDot, this.infoText]).setDepth(15);

    const overlayBg = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0f1723, 0.5);
    const overlayCard = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 320, 170, 0xfff6e5, 1);
    overlayCard.setStrokeStyle(4, 0x17324d, 0.9);
    const overlayTitle = this.add.text(WIDTH / 2, HEIGHT / 2 - 34, "Hand over device", {
      color: "#17324d",
      fontSize: "28px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.handoffText = this.add.text(WIDTH / 2, HEIGHT / 2 + 2, "", {
      color: "#17324d",
      fontSize: "20px",
      align: "center",
    }).setOrigin(0.5);
    const overlayHint = this.add.text(WIDTH / 2, HEIGHT / 2 + 52, "Tap anywhere to continue", {
      color: "#6b7280",
      fontSize: "16px",
    }).setOrigin(0.5);
    this.handoffOverlay = this.add
      .container(0, 0, [overlayBg, overlayCard, overlayTitle, this.handoffText, overlayHint])
      .setDepth(30)
      .setVisible(false);

    const winnerBg = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0f1723, 0.58);
    const winnerCard = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 340, 180, 0xfff6e5, 1);
    winnerCard.setStrokeStyle(4, 0x17324d, 0.9);
    this.winnerText = this.add.text(WIDTH / 2, HEIGHT / 2 - 12, "", {
      color: "#17324d",
      fontSize: "30px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    const winnerHint = this.add.text(WIDTH / 2, HEIGHT / 2 + 48, "Refresh to play again", {
      color: "#6b7280",
      fontSize: "16px",
    }).setOrigin(0.5);
    this.winnerOverlay = this.add
      .container(0, 0, [winnerBg, winnerCard, this.winnerText, winnerHint])
      .setDepth(35)
      .setVisible(false);

    this.setTurnUi("Player A: drag to shoot");
    this.input.on("pointerdown", () => {
      if (this.handoffOverlay.visible) {
        this.handoffOverlay.setVisible(false);
      }
    });
  }

  private setTurnUi(message: string) {
    const dot = this.turnBadge.list[1] as Phaser.GameObjects.Arc;
    dot.setFillStyle(this.currentPlayer === "A" ? 0x2d8cff : 0xff6b57, 1);
    this.infoText.setText(message);
  }

  private drawAimGuide(pointer: Phaser.Input.Pointer) {
    if (!this.selectedPuck) return;

    const dx = this.selectedPuck.x - pointer.x;
    const dy = this.selectedPuck.y - pointer.y;
    const length = Math.min(Math.sqrt(dx * dx + dy * dy) * 1.15, MAX_POWER);
    const baseAngle = Math.atan2(dy, dx);
    const endX = this.selectedPuck.x + Math.cos(baseAngle) * length;
    const endY = this.selectedPuck.y + Math.sin(baseAngle) * length;

    this.aimingLine.clear();
    this.aimingLine.lineStyle(4, 0xffffff, 0.95);
    this.aimingLine.strokeLineShape(new Phaser.Geom.Line(this.selectedPuck.x, this.selectedPuck.y, endX, endY));
    this.aimingLine.fillStyle(0xffffff, 0.95);
    this.aimingLine.fillCircle(endX, endY, 6);
    this.aimingLine.lineStyle(2, 0x17324d, 0.35);
    this.aimingLine.strokeCircle(endX, endY, 6);
    this.aimingLine.setVisible(true);
  }

  private clearAimGuide() {
    this.aimingLine.clear();
    this.aimingLine.setVisible(false);
  }

  private playerName(player: Player) {
    return `Player ${player}`;
  }

  private isPuckMoving(puck: Phaser.Physics.Arcade.Image) {
    return Boolean(puck.body && puck.body.velocity.length() > STOP_THRESHOLD);
  }

  private shouldProcessPuckCollision(
    firstObj: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    secondObj: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ) {
    const first = (firstObj as any).gameObject as Phaser.Physics.Arcade.Image;
    const second = (secondObj as any).gameObject as Phaser.Physics.Arcade.Image;

    if (!first || !first.body || !second || !second.body) return false;
    return first.active && second.active;
  }

  private handlePuckCollision(
    firstObj: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    secondObj: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ) {
    const first = (firstObj as Phaser.Physics.Arcade.Body).gameObject as Phaser.Physics.Arcade.Image;
    const second = (secondObj as Phaser.Physics.Arcade.Body).gameObject as Phaser.Physics.Arcade.Image;
    const firstBody = first.body as Phaser.Physics.Arcade.Body | undefined;
    const secondBody = second.body as Phaser.Physics.Arcade.Body | undefined;
    if (!firstBody || !secondBody) return;

    const dx = second.x - first.x;
    const dy = second.y - first.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = PUCK_RADIUS * 2;
    const nx = distance > 0.0001 ? dx / distance : 1;
    const ny = distance > 0.0001 ? dy / distance : 0;

    if (distance < minDistance) {
      const separation = ((minDistance - distance) * 0.5) + KnockoutScene.COLLISION_SEPARATION_BIAS;
      first.x -= nx * separation;
      first.y -= ny * separation;
      second.x += nx * separation;
      second.y += ny * separation;
      firstBody.position.x -= nx * separation;
      firstBody.position.y -= ny * separation;
      secondBody.position.x += nx * separation;
      secondBody.position.y += ny * separation;
    }

    const relativeVelocityX = secondBody.velocity.x - firstBody.velocity.x;
    const relativeVelocityY = secondBody.velocity.y - firstBody.velocity.y;
    const relativeNormalSpeed = relativeVelocityX * nx + relativeVelocityY * ny;
    const repulsionBoost = Math.max(
      KnockoutScene.MIN_COLLISION_EXIT_SPEED - relativeNormalSpeed,
      0
    ) + KnockoutScene.COLLISION_REPULSION;

    if (repulsionBoost > 0) {
      const impulse = repulsionBoost * 0.5;
      firstBody.velocity.x -= nx * impulse;
      firstBody.velocity.y -= ny * impulse;
      secondBody.velocity.x += nx * impulse;
      secondBody.velocity.y += ny * impulse;
    }

    firstBody.velocity.setLength(
      Math.min(firstBody.velocity.length(), KnockoutScene.MAX_PUCK_SPEED)
    );
    secondBody.velocity.setLength(
      Math.min(secondBody.velocity.length(), KnockoutScene.MAX_PUCK_SPEED)
    );

    const impactSpeed = Phaser.Math.Clamp(
      firstBody.velocity.clone().subtract(secondBody.velocity).length(),
      0,
      KnockoutScene.MAX_PUCK_SPEED
    );

    if (impactSpeed > STOP_THRESHOLD * 3) {
      const hitX = (first.x + second.x) / 2;
      const hitY = (first.y + second.y) / 2;
      this.emitCollisionParticles(hitX, hitY, impactSpeed);
      this.playImpactSound(impactSpeed);
    }
  }

  private applyBoardForces(puck: Phaser.Physics.Arcade.Image) {
    if (!puck.body) return;

    const body = puck.body as Phaser.Physics.Arcade.Body;
    const bounds = KnockoutScene.BOARD;
    const edgeZone = KnockoutScene.EDGE_SLOW_ZONE;

    let vx = body.velocity.x * KnockoutScene.BASE_FRICTION;
    let vy = body.velocity.y * KnockoutScene.BASE_FRICTION;

    const leftDist = puck.x - bounds.left;
    const rightDist = bounds.right - puck.x;
    const topDist = puck.y - bounds.top;
    const bottomDist = bounds.bottom - puck.y;
    const edgeDistance = Math.min(leftDist, rightDist, topDist, bottomDist);

    if (edgeDistance < edgeZone) {
      const edgeFactor = Phaser.Math.Clamp(edgeDistance / edgeZone, 0.7, 1);
      vx *= edgeFactor;
      vy *= edgeFactor;
    }

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > KnockoutScene.MAX_PUCK_SPEED) {
      const cap = KnockoutScene.MAX_PUCK_SPEED / speed;
      vx *= cap;
      vy *= cap;
    }

    puck.setVelocity(vx, vy);
  }

  private checkElimination(puck: Phaser.Physics.Arcade.Image) {
    const bounds = KnockoutScene.BOARD;
    const margin = KnockoutScene.ELIMINATION_MARGIN;
    const inside =
      puck.x >= bounds.left - margin &&
      puck.x <= bounds.right + margin &&
      puck.y >= bounds.top - margin &&
      puck.y <= bounds.bottom + margin;

    if (!inside) {
      this.emitEliminationParticles(puck.x, puck.y, puck.getData("baseColor") as number);
      this.playEliminationSound();
      puck.destroy();
      return true;
    }

    return false;
  }

  private getWinner(): Player | null {
    let aCount = 0;
    let bCount = 0;

    this.pucks.getChildren().forEach((obj) => {
      const puck = obj as Phaser.Physics.Arcade.Image;
      if (!puck.active) return;
      if (puck.getData("player") === "A") {
        aCount += 1;
      } else {
        bCount += 1;
      }
    });

    if (aCount === 0) return "B";
    if (bCount === 0) return "A";
    return null;
  }

  private showHandoffPopup(playerLabel: string, subtitle: string) {
    this.handoffText.setText(`${playerLabel}\n${subtitle}`);
    this.handoffOverlay.setVisible(true);
  }

  private showWinner(winner: Player) {
    this.phase = "finished";
    this.winnerText.setText(`${this.playerName(winner)} wins!`);
    this.setTurnUi(`${this.playerName(winner)} wins`);
    this.winnerOverlay.setVisible(true);
  }

  private emitCollisionParticles(x: number, y: number, impactSpeed: number) {
    const count = Phaser.Math.Clamp(Math.round(impactSpeed / 140), 3, 8);

    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(10, 26);
      const particle = this.add.circle(x, y, Phaser.Math.FloatBetween(2, 4), 0xffffff, 0.85).setDepth(11);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.4,
        duration: 170,
        ease: "Quad.out",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private emitEliminationParticles(x: number, y: number, color: number) {
    for (let i = 0; i < 12; i++) {
      const angle = Phaser.Math.FloatBetween(-2.5, -0.6);
      const distance = Phaser.Math.FloatBetween(18, 48);
      const particle = this.add.circle(x, y, Phaser.Math.FloatBetween(3, 5), color, 0.9).setDepth(11);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 320,
        ease: "Cubic.out",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private playImpactSound(impactSpeed: number) {
    const context = (this.sound as Phaser.Sound.WebAudioSoundManager).context;
    if (!context) return;

    const now = context.currentTime;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(Phaser.Math.Linear(180, 420, impactSpeed / KnockoutScene.MAX_PUCK_SPEED), now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }

  private playEliminationSound() {
    const context = (this.sound as Phaser.Sound.WebAudioSoundManager).context;
    if (!context) return;

    const now = context.currentTime;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.22);
  }
}

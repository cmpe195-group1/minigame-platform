import Phaser from "phaser";

import { WIDTH, HEIGHT, PUCK_RADIUS, MAX_POWER, STOP_THRESHOLD, BASE_FRICTION } from "./constants";
import type {
  KnockoutGameState,
  KnockoutStatus,
  Player,
  PuckState,
  LocalShotPayload,
  ShotReplayPayload,
} from "./types";

const BOARD = new Phaser.Geom.Rectangle(70, 90, 660, 420);
const ELIMINATION_MARGIN = PUCK_RADIUS;
const MAX_PUCK_SPEED = MAX_POWER * 1.2;
const MIN_POST_COLLISION_SPEED = 36;

type TurnResolvedPayload = {
  resultingState: KnockoutGameState;
};

export type SceneMode = "local" | "multiplayer_online";

export interface KnockoutSceneConfig {
  mode?: SceneMode;
  initialState?: KnockoutGameState;
  playerSide?: Player;
  canInteract?: boolean;
  onStatusChange?: (status: KnockoutStatus) => void;
  onShotTaken?: (payload: LocalShotPayload) => void;
  onTurnResolved?: (payload: TurnResolvedPayload) => void;
}

function buildInitialPucks(): PuckState[] {
  const pucks: PuckState[] = [];
  for (let i = 0; i < 6; i += 1) {
    pucks.push({ id: `A-${i + 1}`, player: "A", x: 170, y: 140 + i * 58, active: true });
  }
  for (let i = 0; i < 6; i += 1) {
    pucks.push({ id: `B-${i + 1}`, player: "B", x: 630, y: 140 + i * 58, active: true });
  }
  return pucks;
}

export function getInitialKnockoutState(): KnockoutGameState {
  return {
    currentPlayer: "A",
    phase: "aiming",
    winner: null,
    turnNumber: 1,
    pucks: buildInitialPucks(),
  };
}

function cloneState(state: KnockoutGameState): KnockoutGameState {
  return {
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    winner: state.winner,
    turnNumber: state.turnNumber,
    pucks: state.pucks.map((puck) => ({ ...puck })),
  };
}

export class KnockoutScene extends Phaser.Scene {
  private state: KnockoutGameState;
  private mode: SceneMode;
  private playerSide: Player;
  private canInteract: boolean;
  private onStatusChange: ((status: KnockoutStatus) => void) | null;
  private onShotTaken: ((payload: LocalShotPayload) => void) | null;
  private onTurnResolved: ((payload: TurnResolvedPayload) => void) | null;

  private replayingRemoteShot = false;

  private pucks!: Phaser.Physics.Arcade.Group;
  private selectedPuck: Phaser.Physics.Arcade.Image | null = null;
  private aimingLine!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private badgeDot!: Phaser.GameObjects.Arc;
  private scoreText!: Phaser.GameObjects.Text;
  private handoffOverlay!: Phaser.GameObjects.Container;
  private winnerOverlay!: Phaser.GameObjects.Container;
  private handoffText!: Phaser.GameObjects.Text;
  private winnerText!: Phaser.GameObjects.Text;
  private syncPending = false;
  private isReady = false;

  constructor(config?: KnockoutSceneConfig) {
    super("KnockoutScene");
    this.state = cloneState(config?.initialState ?? getInitialKnockoutState());
    this.mode = config?.mode ?? "local";
    this.playerSide = config?.playerSide ?? "A";
    this.canInteract = config?.canInteract ?? true;
    this.onStatusChange = config?.onStatusChange ?? null;
    this.onShotTaken = config?.onShotTaken ?? null;
    this.onTurnResolved = config?.onTurnResolved ?? null;
  }

    public getTurnNumber() {
      return this.state.turnNumber;
    }

  public isBusyAnimatingTurn() {
    return this.state.phase === "waiting";
  }

  create() {
    this.cameras.main.setBackgroundColor("#f5efe2");
    this.drawBoard();
    this.createPuckTextures();
    this.physics.world.OVERLAP_BIAS = Math.max(this.physics.world.OVERLAP_BIAS, PUCK_RADIUS);

    this.pucks = this.physics.add.group({
      collideWorldBounds: false,
      bounceX: 1,
      bounceY: 1,
      maxVelocityX: MAX_PUCK_SPEED,
      maxVelocityY: MAX_PUCK_SPEED,
    });

    this.physics.add.collider(
      this.pucks,
      this.pucks,
      this.handlePuckCollision as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.aimingLine = this.add.graphics().setDepth(12).setVisible(false);
    this.createUi();
    this.renderState(true);

    this.input.on("pointerdown", this.onDown, this);
    this.input.on("pointermove", this.onMove, this);
    this.input.on("pointerup", this.onUp, this);
    
    this.isReady = true;
  }

  configureSession(config: {
    mode?: SceneMode;
    playerSide?: Player;
    canInteract?: boolean;
    onStatusChange?: ((status: KnockoutStatus) => void) | null;
    onShotTaken?: ((payload: LocalShotPayload) => void) | null;
    onTurnResolved?: ((payload: TurnResolvedPayload) => void) | null;
  }) {
    if (config.mode) this.mode = config.mode;
    if (config.playerSide) this.playerSide = config.playerSide;
    if (typeof config.canInteract === "boolean") this.canInteract = config.canInteract;
    if (config.onStatusChange !== undefined) this.onStatusChange = config.onStatusChange;
    if (config.onShotTaken !== undefined) this.onShotTaken = config.onShotTaken;
    if (config.onTurnResolved !== undefined) this.onTurnResolved = config.onTurnResolved;
    this.refreshUi();
    this.emitStatus();
  }

  syncState(state: KnockoutGameState) {
    this.syncPending = false;
    this.replayingRemoteShot = false;
    this.state = cloneState(state);
    this.selectedPuck = null;

    if (!this.isReady) return;

    this.clearAimGuide();
    this.renderState(false);
  }

  public getReady() {
    return this.isReady;
  }

  applyRemoteShot(payload: ShotReplayPayload) {
    if (payload.turnNumber !== this.state.turnNumber) return;

    const puck = this.findPuckById(payload.puckId);
    if (!puck) return;

    this.replayingRemoteShot = true;
    this.syncPending = false;
    this.selectedPuck = null;
    this.clearAimGuide();

    puck.setVelocity(payload.impulseX, payload.impulseY);
    this.state.phase = "waiting";
    this.refreshUi();
    this.emitStatus();
  }

  private emitStatus() {
    if (!this.onStatusChange) return;
    this.onStatusChange({
      currentPlayer: this.state.currentPlayer,
      phase: this.state.phase,
      aRemaining: this.countRemaining("A"),
      bRemaining: this.countRemaining("B"),
      winner: this.state.winner,
    });
  }

  private countRemaining(player: Player) {
    return this.state.pucks.filter((puck) => puck.active && puck.player === player).length;
  }

  private refreshUi() {
    this.infoText?.setText(
      this.state.winner
        ? `Player ${this.state.winner} wins`
        : this.state.phase === "waiting"
          ? `Resolving turn ${this.state.turnNumber}...`
          : `Player ${this.state.currentPlayer}: drag to shoot`
    );

    //arc.setFillStyle(0xff0000, 1); // Sets color to red (0xff0000)
    this.badgeDot?.setFillStyle((this.state.currentPlayer === "A") ? 0x2d8cff : 0xff6b57, 1);
    this.scoreText?.setText(`A: ${this.countRemaining("A")}   B: ${this.countRemaining("B")}`);
  }

  private renderState(showHandoff: boolean) {
    this.pucks.clear(true, true);

    for (const puckState of this.state.pucks) {
      if (!puckState.active) continue;
      this.createPuckSprite(puckState);
    }

    if (this.state.winner) {
      this.showWinner(this.state.winner);
    } else if (this.mode === "local" && showHandoff && this.state.phase === "aiming") {
      this.showHandoffPopup(`Player ${this.state.currentPlayer}`, "Take your shot");
    } else {
      this.handoffOverlay?.setVisible(false);
      this.winnerOverlay?.setVisible(false);
    }

    this.refreshUi();
    this.emitStatus();
  }

  private createPuckSprite(puckState: PuckState) {
    const textureKey = puckState.player === "A" ? "knockout-puck-a" : "knockout-puck-b";
    const puck = this.physics.add.image(puckState.x, puckState.y, textureKey);
    const body = puck.body as Phaser.Physics.Arcade.Body;
    const textureSize = PUCK_RADIUS * 2 + 8;
    const offset = (textureSize - PUCK_RADIUS * 2) / 2;

    body.setCircle(PUCK_RADIUS, offset, offset);
    body.setAllowGravity(false);
    body.setBounce(1, 1);
    body.setMass(1);
    body.setMaxVelocity(MAX_PUCK_SPEED, MAX_PUCK_SPEED);
    body.setDrag(0, 0);
    body.pushable = true;
    body.immovable = false;

    puck.setDepth(5);
    puck.setCollideWorldBounds(false);
    puck.setData("player", puckState.player);
    puck.setData("puckId", puckState.id);
    this.pucks.add(puck);
  }

  onDown(pointer: Phaser.Input.Pointer) {
    if (
      this.state.phase !== "aiming" ||
      !this.canInteract ||
      this.syncPending ||
      this.handoffOverlay.visible ||
      this.winnerOverlay.visible
    ) {
      return;
    }

    let selected: Phaser.Physics.Arcade.Image | null = null;
    this.pucks.getChildren().forEach((obj) => {
      if (selected) return;
      const puck = obj as Phaser.Physics.Arcade.Image;
      if (!puck.active) return;
      if (puck.getData("player") !== this.state.currentPlayer) return;
      if (this.isPuckMoving(puck)) return;
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, puck.x, puck.y) <= PUCK_RADIUS + 4) {
        selected = puck;
      }
    });

    if (!selected) return;
    this.selectedPuck = selected;
    this.aimingLine.setVisible(true);
    this.drawAimGuide(pointer);
  }

  onMove(pointer: Phaser.Input.Pointer) {
    if (!this.selectedPuck) return;
    this.drawAimGuide(pointer);
  }

  onUp(pointer: Phaser.Input.Pointer) {
    if (!this.selectedPuck) return;

    if (this.mode === "multiplayer_online" && this.playerSide !== this.state.currentPlayer) {
      this.selectedPuck = null;
      this.clearAimGuide();
      return;
    }

    const dx = this.selectedPuck.x - pointer.x;
    const dy = this.selectedPuck.y - pointer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(distance * 2.2, MAX_POWER);

    if (power > 10) {
      const nx = dx / Math.max(1, distance);
      const ny = dy / Math.max(1, distance);
      const impulseX = nx * power;
      const impulseY = ny * power;

      this.selectedPuck.setVelocity(impulseX, impulseY);
      this.state.phase = "waiting";
      this.refreshUi();
      this.emitStatus();
      this.onShotTaken?.({
        puckId: String(this.selectedPuck.getData("puckId")),
        impulseX,
        impulseY,
        turnNumber: this.state.turnNumber,
      });
    }

    this.selectedPuck = null;
    this.clearAimGuide();
  }

  update() {
    let moving = false;

    this.pucks.getChildren().forEach((obj) => {
      const puck = obj as Phaser.Physics.Arcade.Image;
      if (!puck.body || !puck.active) return;

      this.applyFriction(puck);
      if (this.checkElimination(puck)) return;

      const speed = (puck.body as Phaser.Physics.Arcade.Body).velocity.length();
      if (speed > STOP_THRESHOLD) {
        moving = true;
      } else {
        puck.setVelocity(0, 0);
      }
    });

    if (this.state.phase === "waiting" && !moving) {
      this.endRound();
    }
  }

  private endRound() {
    const resultingState = this.captureStateAfterResolution();

    if (this.mode === "multiplayer_online") {
      if (this.replayingRemoteShot) {
        // This client is only replaying someone else's shot.
        // Do NOT resolve the turn and do NOT block input waiting for itself.
        this.replayingRemoteShot = false;
        this.syncPending = false;
        this.state = cloneState(resultingState);
        this.refreshUi();
        this.emitStatus();
        return;
      }

      // This is the acting client; it owns the resolved turn result.
      this.syncPending = true;
      this.onTurnResolved?.({ resultingState });
      this.state = cloneState(resultingState);
      this.refreshUi();
      this.emitStatus();
      return;
    }

    this.state = cloneState(resultingState);
    if (this.state.winner) {
      this.showWinner(this.state.winner);
      return;
    }

    this.refreshUi();
    this.showHandoffPopup(`Player ${this.state.currentPlayer}`, "Hand over device");
    this.emitStatus();
  }

  private captureStateAfterResolution(): KnockoutGameState {
    const pucks: PuckState[] = this.pucks.getChildren().map((obj) => {
      const puck = obj as Phaser.Physics.Arcade.Image;
      return {
        id: String(puck.getData("puckId")),
        player: puck.getData("player") as Player,
        x: puck.x,
        y: puck.y,
        active: puck.active,
      };
    });

    const aRemaining = pucks.filter((puck) => puck.active && puck.player === "A").length;
    const bRemaining = pucks.filter((puck) => puck.active && puck.player === "B").length;
    const winner = aRemaining === 0 ? "B" : bRemaining === 0 ? "A" : null;

    return {
      currentPlayer: winner ? this.state.currentPlayer : this.state.currentPlayer === "A" ? "B" : "A",
      phase: winner ? "finished" : "aiming",
      winner,
      turnNumber: this.state.turnNumber + (winner ? 0 : 1),
      pucks,
    };
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
    board.fillRoundedRect(BOARD.x, BOARD.y, BOARD.width, BOARD.height, 22);
    board.lineStyle(4, 0xf4e6bd, 0.85);
    board.strokeRoundedRect(BOARD.x, BOARD.y, BOARD.width, BOARD.height, 22);
    board.fillStyle(0xffffff, 0.1);
    board.fillRoundedRect(BOARD.x + 16, BOARD.y + 16, BOARD.width - 32, 48, 16);
    board.lineStyle(20, 0xf4e6bd, 0.08);
    board.strokeRoundedRect(BOARD.x + 6, BOARD.y + 6, BOARD.width - 12, BOARD.height - 12, 20);
  }

  private createUi() {
    const badgeBg = this.add.rectangle(130, 34, 220, 44, 0x17324d, 0.92).setOrigin(0, 0);
    this.badgeDot = this.add.circle(156, 56, 10, 0x2d8cff);
    this.infoText = this.add.text(176, 43, "", {
      color: "#ffffff",
      fontSize: "22px",
      fontStyle: "bold",
    });
    this.add.container(0, 0, [badgeBg, this.badgeDot, this.infoText]).setDepth(15);

    this.scoreText = this.add.text(WIDTH - 170, 44, "A: 6   B: 6", {
      color: "#17324d",
      fontSize: "24px",
      fontStyle: "bold",
    }).setDepth(15);

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

    this.input.on("pointerdown", () => {
      if (this.mode === "local" && this.handoffOverlay.visible) {
        this.handoffOverlay.setVisible(false);
      }
    });

    this.refreshUi();
  }

  private drawAimGuide(pointer: Phaser.Input.Pointer) {
    if (!this.selectedPuck) return;

    const dx = this.selectedPuck.x - pointer.x;
    const dy = this.selectedPuck.y - pointer.y;
    const length = Math.min(Math.sqrt(dx * dx + dy * dy) * 1.15, MAX_POWER);
    const angle = Math.atan2(dy, dx);
    const endX = this.selectedPuck.x + Math.cos(angle) * length;
    const endY = this.selectedPuck.y + Math.sin(angle) * length;

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
    if (!this.aimingLine) return;
    this.aimingLine.clear();
    this.aimingLine.setVisible(false);
  }

  private isPuckMoving(puck: Phaser.Physics.Arcade.Image) {
    return Boolean(puck.body && (puck.body as Phaser.Physics.Arcade.Body).velocity.length() > STOP_THRESHOLD);
  }

  private findPuckById(puckId: string) {
    return this.pucks.getChildren().find((obj) => {
      const puck = obj as Phaser.Physics.Arcade.Image;
      return puck.active && String(puck.getData("puckId")) === puckId;
    }) as Phaser.Physics.Arcade.Image | undefined;
  }

  private handlePuckCollision(firstObj: Phaser.GameObjects.GameObject, secondObj: Phaser.GameObjects.GameObject) {
    const first = firstObj as Phaser.Physics.Arcade.Image;
    const second = secondObj as Phaser.Physics.Arcade.Image;
    const firstBody = first.body as Phaser.Physics.Arcade.Body | undefined;
    const secondBody = second.body as Phaser.Physics.Arcade.Body | undefined;

    if (!firstBody || !secondBody) return;

    const dx = second.x - first.x;
    const dy = second.y - first.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const minDistance = PUCK_RADIUS * 2;

    const nx = dx / distance;
    const ny = dy / distance;

    if (distance < minDistance) {
      const overlap = (minDistance - distance) / 2 + 0.5;
      first.x -= nx * overlap;
      first.y -= ny * overlap;
      second.x += nx * overlap;
      second.y += ny * overlap;
      firstBody.position.set(first.x - firstBody.halfWidth, first.y - firstBody.halfHeight);
      secondBody.position.set(second.x - secondBody.halfWidth, second.y - secondBody.halfHeight);
    }

    const rvx = secondBody.velocity.x - firstBody.velocity.x;
    const rvy = secondBody.velocity.y - firstBody.velocity.y;
    const velAlongNormal = rvx * nx + rvy * ny;

    if (velAlongNormal > 0) return;

    const restitution = 1;
    const impulse = -(1 + restitution) * velAlongNormal / 2;
    const impulseX = impulse * nx;
    const impulseY = impulse * ny;

    firstBody.velocity.x -= impulseX;
    firstBody.velocity.y -= impulseY;
    secondBody.velocity.x += impulseX;
    secondBody.velocity.y += impulseY;

    const impactSpeed = Math.abs(velAlongNormal);
    if (impactSpeed > 40) {
      this.emitCollisionParticles((first.x + second.x) / 2, (first.y + second.y) / 2, impactSpeed);
    }

    const firstSpeed = firstBody.velocity.length();
    const secondSpeed = secondBody.velocity.length();

    if (firstSpeed > 0 && firstSpeed < MIN_POST_COLLISION_SPEED) {
      firstBody.velocity.scale(MIN_POST_COLLISION_SPEED / firstSpeed);
    }
    if (secondSpeed > 0 && secondSpeed < MIN_POST_COLLISION_SPEED) {
      secondBody.velocity.scale(MIN_POST_COLLISION_SPEED / secondSpeed);
    }

    firstBody.velocity.limit(MAX_PUCK_SPEED);
    secondBody.velocity.limit(MAX_PUCK_SPEED);
  }

  private applyFriction(puck: Phaser.Physics.Arcade.Image) {
    if (!puck.body) return;

    const body = puck.body as Phaser.Physics.Arcade.Body;
    let vx = body.velocity.x * BASE_FRICTION;
    let vy = body.velocity.y * BASE_FRICTION;

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > MAX_PUCK_SPEED) {
      const cap = MAX_PUCK_SPEED / speed;
      vx *= cap;
      vy *= cap;
    }

    body.setVelocity(vx, vy);
  }

  private checkElimination(puck: Phaser.Physics.Arcade.Image) {
    const outside =
      puck.x < BOARD.left - ELIMINATION_MARGIN ||
      puck.x > BOARD.right + ELIMINATION_MARGIN ||
      puck.y < BOARD.top - ELIMINATION_MARGIN ||
      puck.y > BOARD.bottom + ELIMINATION_MARGIN;

    if (!outside) return false;

    this.emitEliminationParticles(puck.x, puck.y, puck.getData("player") === "A" ? 0x2d8cff : 0xff6b57);
    puck.destroy();
    this.refreshUi();
    this.emitStatus();
    return true;
  }

  private showHandoffPopup(playerLabel: string, subtitle: string) {
    this.handoffText.setText(`${playerLabel}\n${subtitle}`);
    this.handoffOverlay.setVisible(true);
  }

  private showWinner(winner: Player) {
    this.winnerText.setText(`Player ${winner} wins!`);
    this.winnerOverlay.setVisible(true);
    this.refreshUi();
    this.emitStatus();
  }

  private emitCollisionParticles(x: number, y: number, impactSpeed: number) {
    const count = Phaser.Math.Clamp(Math.round(impactSpeed / 140), 3, 8);

    for (let i = 0; i < count; i += 1) {
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
    for (let i = 0; i < 12; i += 1) {
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
}

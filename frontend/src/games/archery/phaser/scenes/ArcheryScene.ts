/**
 * ArcheryScene.ts
 * Multiplayer-aware Phaser scene.
 *
 * Architecture:
 *  - Each device renders ALL archers but only CONTROLS its own (mySlot).
 *  - Arrow physics run locally → score computed → sent to server via callback.
 *  - Server broadcasts result → React forwards `roomUpdated` event → scene reacts.
 *
 * Layout:
 *   Archers line up on the LEFT (stacked vertically if > 1)
 *   Target on the RIGHT
 */

import Phaser from 'phaser';
import type { RoomSnapshot } from '../../network/useGameSocket';
import { TARGET_RADIUS, SCORE_RINGS, distanceToScore, scoreLabel } from '../../game/ScoreSystem';
import { dragToVelocity, clampDrag, distance, type Vector2 } from '../../game/Physics';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SceneInitData {
  mySlot: number;
  room  : RoomSnapshot;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const W            = 860;
const H            = 500;
const TARGET_X     = W - 140;
const TARGET_Y     = H / 2;
const GROUND_Y     = H - 40;
const GRAVITY_Y    = 280;
const MAX_PULL     = 110;
const MIN_PULL     = 18;

// Archer slots: up to 4 vertical positions on the left
const ARCHER_SLOTS: Array<{ x: number; y: number }> = [
  { x: 130, y: H / 2 - 60 },
  { x: 130, y: H / 2 + 60 },
  { x: 80,  y: H / 2 - 80 },
  { x: 80,  y: H / 2 + 80 },
];

// ─── Scene ────────────────────────────────────────────────────────────────────

export default class ArcheryScene extends Phaser.Scene {

  // Config
  private mySlot      = 0;
  private room!       : RoomSnapshot;

  // Graphics layers
  private bgGfx!      : Phaser.GameObjects.Graphics;
  private groundGfx!  : Phaser.GameObjects.Graphics;
  private targetGfx!  : Phaser.GameObjects.Graphics;
  private archerGfx!  : Phaser.GameObjects.Graphics;
  private aimGfx!     : Phaser.GameObjects.Graphics;
  private arrowLayer! : Phaser.GameObjects.Container;

  // Flying arrow (physics-driven)
  private flyObj      : Phaser.Physics.Arcade.Image | null = null;
  private flyGfx      : Phaser.GameObjects.Graphics | null = null;
  private flyBody     : Phaser.Physics.Arcade.Body | null  = null;
  private isInFlight  = false;
  private isAiming    = false;
  private canShoot    = false;

  // Drag state
  private dragStart   : Vector2 = { x: 0, y: 0 };
  private dragCurrent : Vector2 = { x: 0, y: 0 };

  // Wind
  private windForce   = 0;

  // HUD texts
  private windLabel!  : Phaser.GameObjects.Text;
  private popup!      : Phaser.GameObjects.Text;
  private turnBanner! : Phaser.GameObjects.Text;

  // Callbacks from React
  private onArrowLanded!: (score: number, dist: number) => void;

  // ── Constructor ──────────────────────────────────────────────────────────────

  constructor() { super({ key: 'ArcheryScene' }); }

  // ── init ────────────────────────────────────────────────────────────────────

  init() {
    const data = this.registry.get('sceneInitData') as SceneInitData;
    this.mySlot = data.mySlot;
    this.room   = data.room;

    const cbs = this.registry.get('callbacks') as { onArrowLanded: (s: number, d: number) => void };
    this.onArrowLanded = cbs.onArrowLanded;

    this.isInFlight = false;
    this.isAiming   = false;
    this.canShoot   = false;
  }

  // ── create ──────────────────────────────────────────────────────────────────

  create() {
    // Layers (order matters for depth)
    this.bgGfx      = this.add.graphics();
    this.groundGfx  = this.add.graphics();
    this.targetGfx  = this.add.graphics();
    this.arrowLayer = this.add.container(0, 0);
    this.archerGfx  = this.add.graphics();
    this.aimGfx     = this.add.graphics();

    this.drawBackground();
    this.drawGround();
    this.drawTarget();
    this.drawAllArchers(0);

    // HUD
    this.windLabel = this.add.text(W / 2, 12, '', {
      fontSize: '13px', color: '#aaeeff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(20);

    this.turnBanner = this.add.text(W / 2, H - 22, '', {
      fontSize: '15px', fontStyle: 'bold', color: '#FFD700',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(20);

    this.popup = this.add.text(TARGET_X, TARGET_Y - TARGET_RADIUS - 20, '', {
      fontSize: '24px', fontStyle: 'bold', color: '#FFD700',
      stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(30);

    // Physics world bounds
    this.physics.world.setBounds(-300, -300, W + 600, H + 600);

    // Input
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup',   this.onPointerUp,   this);

    // Listen for room updates pushed from React
    this.registry.events.on('roomUpdated', this.onRoomUpdated, this);

    this.syncFromRoom();
  }

  // ── shutdown (called when scene stops) ──────────────────────────────────────

  shutdown() {
    this.registry.events.off('roomUpdated', this.onRoomUpdated, this);
  }

  // ── update loop ─────────────────────────────────────────────────────────────

  update(_t: number, _dt: number) {
    if (!this.isInFlight || !this.flyObj || !this.flyBody) return;

    // Wind nudge
    this.flyBody.setVelocityX(this.flyBody.velocity.x + this.windForce * 0.018);

    // Rotate to velocity
    if (this.flyBody.velocity.length() > 0) {
      this.flyObj.setRotation(Math.atan2(this.flyBody.velocity.y, this.flyBody.velocity.x));
    }

    // Draw flying arrow
    this.drawFlyingArrow();

    if (this.flyObj.x >= TARGET_X && !this.flyObj.getData('pastTargetPlane')) {
      this.flyObj.setData('pastTargetPlane', true);

      let exactY = this.flyObj.y;
      if (this.flyBody.velocity.x > 0) {
        exactY -= this.flyBody.velocity.y * ((this.flyObj.x - TARGET_X) / this.flyBody.velocity.x);
      }

      const distFromCenter = Math.abs(exactY - TARGET_Y);

      if (distFromCenter <= TARGET_RADIUS) {
        this.resolveHit(distFromCenter, TARGET_X, exactY);
        return;
      }
    }

    // Left the scene
    if (
      this.flyObj.x > W + 80 ||
      this.flyObj.y > GROUND_Y + 60 ||
      this.flyObj.x < -80
    ) {
      this.resolveHit(TARGET_RADIUS + 9999, this.flyObj.x, this.flyObj.y);
    }
  }

  // ─── Room sync ───────────────────────────────────────────────────────────────

  private onRoomUpdated(room: RoomSnapshot) {
    this.room = room;
    this.syncFromRoom();
  }

  private syncFromRoom() {
    const { room, mySlot } = this;
    this.windForce = room.windForce;

    const windDir    = this.windForce > 0 ? '→' : '←';
    const windAbs    = Math.abs(this.windForce);
    const windLabel  = windAbs < 15 ? 'Calm 🍃' : windAbs < 50 ? `Breeze ${windDir} 🌬️` : `Wind ${windDir} 💨`;
    this.windLabel?.setText(`${windLabel}  (${windAbs.toFixed(0)} mph)`);

    // Can only shoot if it's my turn AND game is playing AND not already flying
    this.canShoot = (
      room.state === 'playing' &&
      room.currentSlot === mySlot &&
      !this.isInFlight
    );

    // Redraw archers
    this.drawAllArchers(0);

    // Update turn banner
    if (this.turnBanner) {
      if (room.state === 'playing') {
        const currentPlayer = room.players[room.currentSlot];
        if (room.currentSlot === mySlot) {
          this.turnBanner.setText(`🎯 YOUR turn! Arrow ${room.arrowsFired + 1} / ${room.arrowsPerRound}`).setColor('#FFD700');
        } else {
          this.turnBanner.setText(`⏳ ${currentPlayer?.name ?? '…'} is shooting…`).setColor('#aaaaaa');
        }
      } else if (room.state === 'waiting') {
        this.turnBanner.setText('Waiting for game to start…').setColor('#aaaaaa');
      } else {
        this.turnBanner.setText('🏆 Game Over!').setColor('#FFD700');
      }
    }
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private drawBackground() {
    const g = this.bgGfx;
    g.clear();

    // Sky gradient bands
    const bands = [0x87CEEB, 0x72bede, 0x5db0d0, 0x4da2c2];
    bands.forEach((c, i) => {
      g.fillStyle(c);
      g.fillRect(0, i * (GROUND_Y / bands.length), W, GROUND_Y / bands.length + 2);
    });

    // Clouds
    g.fillStyle(0xffffff, 0.7);
    const clouds = [[90,60,90,28],[270,45,110,30],[460,70,80,24],[620,50,100,28],[790,75,75,22]] as const;
    clouds.forEach(([cx,cy,w,h]) => {
      g.fillEllipse(cx, cy, w, h);
      g.fillEllipse(cx - w*0.3, cy+7, w*0.55, h*0.65);
      g.fillEllipse(cx + w*0.3, cy+5, w*0.55, h*0.65);
    });

    // Pine tree silhouette
    g.fillStyle(0x2d5c2d, 0.5);
    for (let tx = 5; tx < W; tx += 35) {
      const th = 50 + Math.sin(tx*0.08)*16 + Math.cos(tx*0.05)*10;
      g.fillTriangle(tx, GROUND_Y-5, tx-15, GROUND_Y-5, tx-7, GROUND_Y-5-th);
    }
  }

  private drawGround() {
    const g = this.groundGfx;
    g.clear();
    g.fillStyle(0x7a5230); g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    g.fillStyle(0x3d8c3d); g.fillRect(0, GROUND_Y - 8, W, 14);
    g.fillStyle(0x2d7a2d, 0.65);
    for (let gx = 20; gx < W; gx += 28) {
      g.fillTriangle(gx, GROUND_Y-8, gx-6, GROUND_Y-8, gx-3, GROUND_Y-20);
      g.fillTriangle(gx+7, GROUND_Y-8, gx+2, GROUND_Y-8, gx+4, GROUND_Y-15);
    }
    // shooting lane
    g.lineStyle(1.5, 0xffffff, 0.18);
    g.lineBetween(ARCHER_SLOTS[0].x, GROUND_Y - 8, TARGET_X, GROUND_Y - 8);
  }

  private drawTarget() {
    const g = this.targetGfx;
    g.clear();

    // Stand post
    g.fillStyle(0x8B4513);
    g.fillRect(TARGET_X - 10, TARGET_Y + TARGET_RADIUS - 10, 20, GROUND_Y - TARGET_Y - TARGET_RADIUS + 18);
    g.fillStyle(0x6B3410);
    g.fillRect(TARGET_X - 20, GROUND_Y - 18, 40, 18);

    // Rings (outer → inner)
    const ringColors = [0x1a2535, 0x1a5fa8, 0xad1f25, 0xe74c3c, 0xFFD700];
    const radii = [...SCORE_RINGS].reverse().map(r => r.maxRadius);
    radii.forEach((r, i) => { g.fillStyle(ringColors[i]); g.fillCircle(TARGET_X, TARGET_Y, r); });

    // Ring separators
    g.lineStyle(1.5, 0xffffff, 0.5);
    SCORE_RINGS.forEach(r => g.strokeCircle(TARGET_X, TARGET_Y, r.maxRadius));

    // Cross-hair
    g.lineStyle(1, 0x000000, 0.2);
    g.lineBetween(TARGET_X - TARGET_RADIUS, TARGET_Y, TARGET_X + TARGET_RADIUS, TARGET_Y);
    g.lineBetween(TARGET_X, TARGET_Y - TARGET_RADIUS, TARGET_X, TARGET_Y + TARGET_RADIUS);

    // Score labels
    [{ r: 14, s: '10' }, { r: 42, s: '8' }, { r: 70, s: '6' }, { r: 98, s: '4' }, { r: 126, s: '2' }]
      .forEach(({ r, s }) => {
        this.add.text(TARGET_X + r + 4, TARGET_Y - 8, s, {
          fontSize: '10px', color: '#ffffff', stroke: '#000', strokeThickness: 2,
        }).setAlpha(0.85).setDepth(5);
      });
  }

  /** Draw all archer figures; highlight the active one */
  private drawAllArchers(pullPx: number) {
    const g = this.archerGfx;
    g.clear();

    const { room, mySlot } = this;
    const playerCount = room.players.length;
    const activeSlot  = room.currentSlot;

    for (let i = 0; i < playerCount; i++) {
      const slot    = ARCHER_SLOTS[i] ?? ARCHER_SLOTS[0];
      const player  = room.players[i];
      const color   = player?.color ?? '#ffffff';
      const hexColor= Phaser.Display.Color.HexStringToColor(color).color;
      const isActive= i === activeSlot;
      const isMe    = i === mySlot;
      const pull    = isActive && isMe ? pullPx : 0;
      const alpha   = isActive ? 1 : 0.5;

      this.drawSingleArcher(g, slot.x, slot.y, hexColor, pull, alpha, isActive);

      // Name label
      if (i < playerCount) {
        // Use a temporary text (destroy old ones first via tag approach)
        // We'll use the archerGfx for label lines instead
        // Draw a simple name flag above archer
        g.fillStyle(0x000000, 0.5);
        g.fillRoundedRect(slot.x - 28, slot.y - 80, 56, 16, 4);
        // (text rendered separately via scene.add.text would need refs, skip for simplicity)
      }
    }
  }

  private drawSingleArcher(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    colorHex: number,
    pullPx: number,
    alpha: number,
    isActive: boolean,
  ) {
    g.setAlpha(alpha);

    // Shadow
    g.fillStyle(0x000000, 0.12 * alpha);
    g.fillEllipse(x + 8, GROUND_Y - 2, 50, 10);

    // Legs
    g.fillStyle(colorHex, alpha);
    g.fillRect(x,    y - 2, 8, 28);
    g.fillRect(x+10, y - 2, 8, 28);

    // Feet
    g.fillStyle(0x333333, alpha);
    g.fillRect(x - 2, y + 26, 11, 6);
    g.fillRect(x + 9, y + 26, 11, 6);

    // Body
    g.fillStyle(colorHex, alpha);
    g.fillRect(x, y - 42, 18, 42);

    // Head
    g.fillStyle(0xffe0bd, alpha);
    g.fillCircle(x + 9, y - 52, 11);

    // Hair
    g.fillStyle(0x3d2b1a, alpha);
    g.fillRect(x, y - 64, 19, 10);

    // Bow arc
    const bx = x - 5;
    const by = y - 20;
    const arcR = 28;
    g.lineStyle(4, 0x8B4513, alpha);
    const segs = 12;
    const a0   = -Math.PI * 0.45;
    const a1   =  Math.PI * 0.45;
    for (let s = 0; s < segs; s++) {
      const t0 = a0 + (a1 - a0) * (s     / segs);
      const t1 = a0 + (a1 - a0) * ((s+1) / segs);
      g.lineBetween(
        bx + Math.cos(t0)*arcR, by + Math.sin(t0)*arcR,
        bx + Math.cos(t1)*arcR, by + Math.sin(t1)*arcR,
      );
    }

    // Bow tips
    g.fillStyle(0x5c2f0a, alpha);
    g.fillCircle(bx + Math.cos(a0)*arcR, by + Math.sin(a0)*arcR, 3);
    g.fillCircle(bx + Math.cos(a1)*arcR, by + Math.sin(a1)*arcR, 3);

    // Bowstring
    const tipT = { x: bx + Math.cos(a0)*arcR, y: by + Math.sin(a0)*arcR };
    const tipB = { x: bx + Math.cos(a1)*arcR, y: by + Math.sin(a1)*arcR };
    const midX = bx - pullPx * 0.4;
    g.lineStyle(2, 0xd4c49a, alpha);
    g.lineBetween(tipT.x, tipT.y, midX, by);
    g.lineBetween(tipB.x, tipB.y, midX, by);

    // Nocked arrow (only active archer, when aiming)
    if (isActive && pullPx > 0 && !this.isInFlight) {
      g.lineStyle(3, colorHex, alpha);
      g.lineBetween(midX - 4, by, midX + 44, by);
      g.fillStyle(0xcccccc, alpha);
      g.fillTriangle(midX+44, by-4, midX+44, by+4, midX+56, by);
      g.fillStyle(0xffffff, 0.7 * alpha);
      g.fillTriangle(midX-4, by, midX+8, by-5, midX+6, by);
      g.fillTriangle(midX-4, by, midX+8, by+5, midX+6, by);
    }

    // Active glow ring
    if (isActive) {
      g.lineStyle(2, colorHex, 0.4);
      g.strokeCircle(x + 9, y - 14, 40);
    }

    g.setAlpha(1); // reset for next iteration
  }

  // ─── Aim guide ───────────────────────────────────────────────────────────────

  private drawAimGuide() {
    this.aimGfx.clear();
    const from    = this.dragStart;
    const to      = this.dragCurrent;
    const vel     = dragToVelocity(from, to);
    const pullPx  = distance(from, to);
    const power   = Math.min(pullPx / MAX_PULL, 1);

    const mySlotPos = ARCHER_SLOTS[this.mySlot] ?? ARCHER_SLOTS[0];
    const originY   = mySlotPos.y - 18;
    const originX   = mySlotPos.x - 5;

    // Trajectory preview
    const steps = 18, dt = 0.065;
    let px = originX, py = originY, vy = vel.y;
    this.aimGfx.lineStyle(2, 0xffffff, 0.3);
    for (let i = 0; i < steps; i++) {
      const nx = px + vel.x * dt;
      const ny = py + vy * dt;
      vy += GRAVITY_Y * dt;
      if (i % 2 === 0) this.aimGfx.lineBetween(px, py, nx, ny);
      px = nx; py = ny;
      if (px > TARGET_X || py > GROUND_Y) break;
    }

    // Power ring
    const ringColor = power < 0.4 ? 0x44ff44 : power < 0.75 ? 0xffaa00 : 0xff4444;
    this.aimGfx.lineStyle(2, ringColor, 0.5 + 0.4 * power);
    this.aimGfx.strokeCircle(originX, mySlotPos.y, 16 + power * 40);
  }

  // ─── Flying arrow rendering ──────────────────────────────────────────────────

  private drawFlyingArrow() {
    if (!this.flyObj || !this.flyBody) return;

    if (!this.flyGfx) this.flyGfx = this.add.graphics().setDepth(15);

    const angle     = Math.atan2(this.flyBody.velocity.y, this.flyBody.velocity.x);
    const player    = this.room.players[this.mySlot];
    const colorHex  = Phaser.Display.Color.HexStringToColor(player?.color ?? '#ffffff').color;

    this.flyGfx.clear();
    this.flyGfx.setPosition(this.flyObj.x, this.flyObj.y);
    this.flyGfx.setRotation(angle);

    this.flyGfx.lineStyle(3, colorHex);
    this.flyGfx.lineBetween(-16, 0, 16, 0);
    this.flyGfx.fillStyle(0xdddddd);
    this.flyGfx.fillTriangle(16, -4, 16, 4, 28, 0);
    this.flyGfx.fillStyle(0xffffff, 0.85);
    this.flyGfx.fillTriangle(-16, 0, -5, -6, -7, 0);
    this.flyGfx.fillTriangle(-16, 0, -5,  6, -7, 0);
  }

  // ─── Stuck arrow ─────────────────────────────────────────────────────────────

  private stickArrow(hx: number, hy: number, slot: number) {
    const player   = this.room.players[slot];
    const colorHex = Phaser.Display.Color.HexStringToColor(player?.color ?? '#ffffff').color;
    const angle    = Math.atan2(TARGET_Y - (ARCHER_SLOTS[slot]?.y ?? H/2), TARGET_X - (ARCHER_SLOTS[slot]?.x ?? 130));

    const g = this.add.graphics().setDepth(8);
    g.setPosition(hx, hy);
    g.setRotation(angle);
    g.lineStyle(3, colorHex); g.lineBetween(-18, 0, 14, 0);
    g.fillStyle(0xdddddd);    g.fillTriangle(14, -4, 14, 4, 26, 0);
    g.fillStyle(0xffffff, 0.8);
    g.fillTriangle(-18, 0, -6, -5, -8, 0);
    g.fillTriangle(-18, 0, -6,  5, -8, 0);
    this.arrowLayer.add(g);
  }

  // ─── Input handlers ──────────────────────────────────────────────────────────

  private onPointerDown(ptr: Phaser.Input.Pointer) {
    if (!this.canShoot || this.isInFlight || this.isAiming) return;

    const myPos = ARCHER_SLOTS[this.mySlot] ?? ARCHER_SLOTS[0];
    const dist  = distance({ x: ptr.x, y: ptr.y }, { x: myPos.x, y: myPos.y });
    if (dist > 120) return;

    this.isAiming    = true;
    this.dragStart   = { x: myPos.x - 5, y: myPos.y - 20 };
    this.dragCurrent = { x: ptr.x, y: ptr.y };
  }

  private onPointerMove(ptr: Phaser.Input.Pointer) {
    if (!this.isAiming) return;
    this.dragCurrent = clampDrag(this.dragStart, { x: ptr.x, y: ptr.y }, MAX_PULL);
    const pull = distance(this.dragStart, this.dragCurrent);
    this.drawAllArchers(pull);
    this.drawAimGuide();
  }

  private onPointerUp() {
    if (!this.isAiming) return;
    this.isAiming = false;
    this.aimGfx.clear();

    const pull = distance(this.dragStart, this.dragCurrent);
    if (pull < MIN_PULL) { this.drawAllArchers(0); return; }

    const vel = dragToVelocity(this.dragStart, this.dragCurrent);
    this.launchArrow(vel);
  }

  private launchArrow(vel: Vector2) {
    const myPos = ARCHER_SLOTS[this.mySlot] ?? ARCHER_SLOTS[0];
    const originX = myPos.x - 5;
    const originY = myPos.y - 20;

    // Invisible physics carrier
    const rect = this.add.rectangle(originX, originY, 32, 6, 0x000000, 0) as unknown as Phaser.Physics.Arcade.Image;
    this.physics.add.existing(rect);

    const body = rect.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(vel.x, vel.y);
    body.setGravityY(GRAVITY_Y);
    body.setCollideWorldBounds(false);
    body.setMaxVelocity(2000, 2000);

    this.flyObj    = rect as unknown as Phaser.Physics.Arcade.Image;
    this.flyBody   = body;
    this.isInFlight = true;
    this.canShoot   = false;

    this.drawAllArchers(0);
  }

  // ─── Hit resolution ──────────────────────────────────────────────────────────

  private resolveHit(dist: number, hx: number, hy: number) {
    this.isInFlight = false;

    // Clean up physics object
    if (this.flyBody) {
      this.flyBody.setVelocity(0, 0);
      this.flyBody.setGravityY(0);
    }
    if (this.flyGfx)  { this.flyGfx.destroy(); this.flyGfx = null; }
    if (this.flyObj)  { this.flyObj.destroy();  this.flyObj  = null; }
    this.flyBody = null;

    // Score calculation
    const score = distanceToScore(dist);

    // Stick arrow in target
    if (dist <= TARGET_RADIUS + 5) {
      this.stickArrow(
        Phaser.Math.Clamp(hx, TARGET_X - TARGET_RADIUS, TARGET_X + TARGET_RADIUS),
        Phaser.Math.Clamp(hy, TARGET_Y - TARGET_RADIUS, TARGET_Y + TARGET_RADIUS),
        this.mySlot,
      );
    }

    // Particle burst
    this.spawnParticles(hx, hy, score);

    // Score popup
    this.showPopup(score);

    // Notify React/server (only this device's arrow)
    this.onArrowLanded(score, dist);

    // Redraw archers
    this.drawAllArchers(0);
  }

  // ─── Effects ─────────────────────────────────────────────────────────────────

  private showPopup(score: number) {
    const label = scoreLabel(score);
    const color = score >= 8 ? '#FFD700' : score >= 4 ? '#ffffff' : '#ff8888';
    this.popup
      .setText(`${label}\n+${score} pts`)
      .setColor(color)
      .setAlpha(1)
      .setY(TARGET_Y - TARGET_RADIUS - 24);

    this.tweens.add({
      targets : this.popup,
      y       : TARGET_Y - TARGET_RADIUS - 80,
      alpha   : 0,
      duration: 1400,
      ease    : 'Power2',
    });
  }

  private spawnParticles(hx: number, hy: number, score: number) {
    const player   = this.room.players[this.mySlot];
    const colorHex = Phaser.Display.Color.HexStringToColor(player?.color ?? '#ffffff').color;
    const count    = score === 10 ? 20 : score > 0 ? 12 : 6;

    for (let i = 0; i < count; i++) {
      const g = this.add.graphics().setDepth(25);
      g.fillStyle(colorHex);
      g.fillCircle(0, 0, 2 + Math.random() * 4);
      g.setPosition(hx, hy);

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      this.tweens.add({
        targets  : g,
        x        : hx + Math.cos(angle) * speed,
        y        : hy + Math.sin(angle) * speed,
        alpha    : 0, scaleX: 0, scaleY: 0,
        duration : 400 + Math.random() * 400,
        ease     : 'Power2',
        onComplete: () => g.destroy(),
      });
    }
  }
}

/* Spielfigur: der gehetzte Fahrgast. Lauf-/Sprungphysik + achsenweise AABB-Kollision. */

import { TILE } from './level.js';

const MOVE_SPEED = 245;     // px/s
const ACCEL = 1900;
const FRICTION = 1800;
const GRAVITY = 1850;       // etwas geringer -> floatiger, leichter steuerbar
const JUMP_VELOCITY = -905; // hoch genug, um Hindernisse zu überspringen
const MAX_FALL = 980;
const COYOTE_TIME = 0.12;   // großzügige Sprung-Toleranz nach Kantenabgang
const JUMP_BUFFER = 0.14;

export class Player {
  constructor(spawn) {
    this.w = 52;
    this.h = 96;
    this.reset(spawn);
  }

  reset(spawn) {
    this.x = spawn.x + (TILE - this.w) / 2;
    this.y = spawn.y + TILE - this.h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.invuln = 0;       // Unverwundbarkeit nach Treffer
    this.powerTime = 0;    // BahnCard-Powerup
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.alive = true;
    this.walkPhase = 0;
    this.slip = 0; // rutschiger Boden (nasser Boden / Kaffee)
  }

  get powered() { return this.powerTime > 0; }

  update(dt, level, input, speedFactor) {
    // Rutschiger Boden senkt Beschleunigung & Reibung (man schlittert)
    if (this.slip > 0) this.slip -= dt;
    const slippery = this.slip > 0;
    const accel = slippery ? ACCEL * 0.4 : ACCEL;
    const fric = slippery ? FRICTION * 0.12 : FRICTION;

    // Horizontale Steuerung (durch Überfüllung gebremst)
    const targetDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const maxSpeed = MOVE_SPEED * speedFactor;
    if (targetDir !== 0) {
      this.vx += targetDir * accel * dt;
      this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
      this.facing = targetDir;
    } else {
      const sign = Math.sign(this.vx);
      this.vx -= sign * fric * dt;
      if (Math.sign(this.vx) !== sign) this.vx = 0;
    }

    // Sprung mit Coyote-Time + Jump-Buffer
    this.coyote = this.onGround ? COYOTE_TIME : Math.max(0, this.coyote - dt);
    this.jumpBuffer = input.jump ? JUMP_BUFFER : Math.max(0, this.jumpBuffer - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }
    // Variable Sprunghöhe: Loslassen kappt Aufwärtsbewegung (kurzer Tipp = kleiner Hüpfer)
    if (!input.jump && this.vy < -320) this.vy = -320;

    // Schwerkraft
    this.vy = Math.min(MAX_FALL, this.vy + GRAVITY * dt);

    // Bewegung achsenweise auflösen
    this._moveAxis(level, this.vx * dt, 0);
    this.onGround = false;
    this._moveAxis(level, 0, this.vy * dt);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.powerTime > 0) this.powerTime -= dt;
    if (Math.abs(this.vx) > 10) this.walkPhase += dt * 12; else this.walkPhase = 0;
  }

  _moveAxis(level, dx, dy) {
    this.x += dx;
    this.y += dy;

    const left = Math.floor(this.x / TILE);
    const right = Math.floor((this.x + this.w - 1) / TILE);
    const top = Math.floor(this.y / TILE);
    const bottom = Math.floor((this.y + this.h - 1) / TILE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (!level.isSolid(tx, ty)) continue;
        const tileLeft = tx * TILE;
        const tileTop = ty * TILE;
        if (dx > 0) this.x = tileLeft - this.w, this.vx = 0;
        else if (dx < 0) this.x = tileLeft + TILE, this.vx = 0;
        else if (dy > 0) { this.y = tileTop - this.h; this.vy = 0; this.onGround = true; }
        else if (dy < 0) { this.y = tileTop + TILE; this.vy = 0; }
      }
    }
  }

  hit() {
    // Treffer: ein Leben verlieren, sofern nicht gerade unverwundbar/gepowert.
    if (this.invuln > 0 || this.powered) return false;
    this.invuln = 1.5;
    this.vy = -380;
    return true;
  }

  bounce() { this.vy = -480; } // nach erfolgreichem "Stomp"

  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);
    // Blinken bei Unverwundbarkeit
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    const w = this.w, h = this.h;
    const moving = this.onGround && Math.abs(this.vx) > 12;
    const bob = this.onGround ? Math.sin(this.walkPhase) * 2 : 0;
    const step = moving ? Math.sin(this.walkPhase) * h * 0.06 : 0;
    const legH = h * 0.26, legW = w * 0.22;

    // Beine (laufend versetzt)
    ctx.fillStyle = '#26354a';
    ctx.fillRect(x + w * 0.18, y + h - legH + step, legW, legH - step);
    ctx.fillRect(x + w * 0.6, y + h - legH - step, legW, legH + step);
    // Reisemantel / Körper
    ctx.fillStyle = this.powered ? '#ffd60a' : '#1f6fb2';
    ctx.fillRect(x + w * 0.08, y + h * 0.28 + bob, w * 0.84, h * 0.5);
    // Schal
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x + w * 0.18, y + h * 0.26 + bob, w * 0.64, h * 0.06);
    // Kopf
    ctx.fillStyle = '#f1c79b';
    ctx.fillRect(x + w * 0.26, y + h * 0.04 + bob, w * 0.48, h * 0.22);
    // Haar
    ctx.fillStyle = '#3a2d22';
    ctx.fillRect(x + w * 0.24, y + h * 0.03 + bob, w * 0.52, h * 0.07);
    // Rucksack hinten
    ctx.fillStyle = '#9a3b3b';
    const bx = this.facing > 0 ? x - w * 0.12 : x + w - w * 0.02;
    ctx.fillRect(bx, y + h * 0.32 + bob, w * 0.14, h * 0.3);
    // Auge in Laufrichtung
    ctx.fillStyle = '#222';
    const ex = this.facing > 0 ? x + w * 0.6 : x + w * 0.28;
    ctx.fillRect(ex, y + h * 0.12 + bob, 4, 5);
  }
}

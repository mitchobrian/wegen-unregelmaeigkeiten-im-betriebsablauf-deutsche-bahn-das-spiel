/* Game-Loop, Eingabe, Kollisionsauflösung, Scoring, Sieg/Niederlage. */

import { Level, TILE } from './level.js';
import { Player } from './player.js';
import { Hazards } from './hazards.js';
import { buildEntities } from './entities.js';

const STEP = 1 / 120; // fixe Physikschrittweite
const COIN_VALUE = 100;
const STOMP_VALUE = 150;

export class Game {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks; // { onWin, onGameOver, onHud }
    this.input = { left: false, right: false, jump: false };
    this.running = false;
    this.paused = false;
    this._raf = null;
    this._last = 0;
    this._acc = 0;
    this._loop = this._loop.bind(this);
    this._bindKeys();
  }

  _bindKeys() {
    const set = (e, val) => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': this.input.left = val; break;
        case 'ArrowRight': case 'KeyD': this.input.right = val; break;
        case 'ArrowUp': case 'KeyW': case 'Space': this.input.jump = val; break;
        default: return;
      }
      e.preventDefault();
    };
    this._onDown = (e) => { if (this.running) set(e, true); };
    this._onUp = (e) => set(e, false);
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
  }

  setInput(key, val) {
    if (key === 'left') this.input.left = val;
    else if (key === 'right') this.input.right = val;
    else if (key === 'jump') this.input.jump = val;
  }

  start(levelDef) {
    this.levelDef = levelDef;
    this.level = new Level(levelDef);
    this.player = new Player(this.level.spawn);
    this.entities = buildEntities(this.level.entitySpecs);
    this.hazards = new Hazards(this.level.theme);
    this.cam = { x: 0, y: 0 };
    this.lives = 3;
    this.coins = 0;
    this.score = 0;
    this.elapsed = 0;
    this.finished = false;
    this.particles = [];
    this.popups = [];
    this.celebrating = false;
    this._celebrateT = 0;
    this._lastFw = -1;
    this.input.left = this.input.right = this.input.jump = false;
    this.running = true;
    this.paused = false;
    this._last = 0;
    this._acc = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }
  pause() { this.paused = true; }
  resume() { if (this.running) { this.paused = false; this._last = 0; } }

  _loop(ts) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._loop);
    if (!this._last) this._last = ts;
    let dt = (ts - this._last) / 1000;
    this._last = ts;
    if (dt > 0.1) dt = 0.1; // Tab-Wechsel abfedern

    if (!this.paused) {
      this._acc += dt;
      let guard = 0;
      while (this._acc >= STEP && guard < 8) { this._step(STEP); this._acc -= STEP; guard++; }
    }
    this._draw();
    if (this.cb.onHud) this.cb.onHud(this._hudState());
  }

  _step(dt) {
    if (this.finished) return;

    // Ziel-Feier: Spiel eingefroren, nur Feuerwerk läuft.
    if (this.celebrating) {
      this._celebrateT += dt;
      this._updateFx(dt);
      const slot = Math.floor(this._celebrateT * 5);
      if (this._celebrateT < 1.2 && slot !== this._lastFw) {
        this._lastFw = slot;
        this._spawnFireworks(this.cam.x + Math.random() * this.canvas.width, 80 + Math.random() * 220);
      }
      if (this._celebrateT >= 1.5) this._finishWin();
      return;
    }

    this.elapsed += dt;

    this.player.update(dt, this.level, this.input, 1);

    for (const e of this.entities) { if (!e.dead) e.update(dt, this.level); }
    this._resolveEntities();

    // Temperatur/Verspätung
    const { overheat } = this.hazards.update(dt, false);
    if (overheat) { this._damage(); this.hazards.temp = this.hazards.cfg.start; }

    // Absturz unter die Strecke (Sicherheitsnetz)
    if (this.player.y > this.level.pixelHeight + 60) this._fall();

    // Ziel erreicht?
    if (this.level.goal && this._rectsOverlap(this.player.rect, this.level.goal)) this._win();

    this._updateFx(dt);
    this._updateCamera();
  }

  _resolveEntities() {
    const p = this.player;
    for (const e of this.entities) {
      if (e.dead || !e.overlaps(p.rect)) continue;
      switch (e.kind) {
        case 'coin': {
          e.dead = true; this.coins++; this.score += COIN_VALUE; this._sfx('coin');
          const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          this._spawnBurst(cx, cy, 14, ['#ffd60a', '#ffe97a', '#caa106']);
          this._spawnPopup(cx, cy, `+${COIN_VALUE} €`, '#ffd60a');
          break;
        }
        case 'relief': {
          e.dead = true; this.hazards.relieve(e.relief, 45); this._sfx('relief');
          const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          if (e.relief === 'cool') { this._spawnBurst(cx, cy, 16, ['#bfe6ff', '#7fd0ff', '#ffffff']); this._spawnPopup(cx, cy, '❄️ kühler!', '#7fd0ff'); }
          else { this._spawnBurst(cx, cy, 16, ['#ffb469', '#ff8a00', '#ffd9a8']); this._spawnPopup(cx, cy, '☕ wärmer!', '#ff9a3c'); }
          break;
        }
        case 'bahncard': {
          e.dead = true; p.powerTime = 6; p.invuln = Math.max(p.invuln, 0.2); this._sfx('power');
          const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          this._spawnFireworks(cx, cy);
          this._spawnPopup(cx, cy - 10, 'BahnCard! 6s unverwundbar', '#ff5566');
          break;
        }
        case 'crowd': { // echtes Hindernis: nicht durchlaufen – drüberspringen
          const p = this.player;
          if (p.y + p.h > e.y + 18) { // Spieler nicht klar oberhalb -> blockieren
            if (p.x + p.w / 2 < e.x + e.w / 2) p.x = e.x - p.w - 1; else p.x = e.x + e.w + 1;
            p.vx = 0;
          }
          break;
        }
        case 'slip': this.player.slip = 0.6; break; // rutschiger Boden
        case 'announce':
          if (!e.triggered) { e.triggered = true; this.hazards.delaySec += 9; this._sfx('hit'); }
          break; // Verspätungs-Malus statt Lebensverlust
        case 'door':
          if (e.closed) { // geschlossene Tür = weiche Wand: zurückhalten statt Treffer
            const p = this.player;
            if (p.x + p.w / 2 < e.x + e.w / 2) p.x = e.x - p.w - 1;
            else p.x = e.x + e.w + 1;
            p.vx = 0;
          }
          break;
        case 'walker': case 'trolley': case 'inspector':
        case 'sleeper': case 'dog': case 'cleaner': case 'stroller': case 'luggage':
          this._enemyHit(e); break;
        default: break;
      }
    }
    this.entities = this.entities.filter((e) => !e.dead);
  }

  _enemyHit(e) {
    const p = this.player;
    const stomp = e.stompable && p.vy > 0 && (p.y + p.h) - e.y < 14;
    if (stomp || p.powered) {
      e.dead = true;
      if (stomp) p.bounce();
      this.score += STOMP_VALUE;
      this._sfx('stomp');
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      this._spawnBurst(cx, cy, 12, ['#ffd60a', '#fff', '#9aa1ab']);
      this._spawnPopup(cx, cy, `+${STOMP_VALUE}`, '#ffd60a');
    } else if (this._damage()) {
      this._sfx('hit');
      this._spawnPopup(p.x + p.w / 2, p.y, '−1 ❤', '#EC0016');
    }
  }

  _touchesHazardTile() {
    const p = this.player;
    const pts = [
      [p.x + 2, p.y + p.h - 2], [p.x + p.w - 2, p.y + p.h - 2],
      [p.x + p.w / 2, p.y + p.h - 2],
    ];
    return pts.some(([px, py]) => this.level.isHazardPixel(px, py));
  }

  // Allgemeiner Schaden (Gegner/Gefahr/Überhitzung). Gibt true zurück, wenn er wirkte.
  _damage() {
    if (this.player.hit()) {
      this.lives--;
      this._sfx('hit');
      if (this.lives <= 0) this._gameOver();
      return true;
    }
    return false;
  }

  // Absturz: immer ein Leben, Respawn am Start.
  _fall() {
    this.lives--;
    this._sfx('hit');
    if (this.lives <= 0) { this._gameOver(); return; }
    this.player.reset(this.level.spawn);
    this.player.invuln = 1.4;
    this.hazards.temp = this.hazards.cfg.start;
    this.hazards.crowd = 0;
  }

  _win() {
    if (this.finished || this.celebrating) return;
    const timeBonus = Math.max(0, Math.round(this.levelDef.par - this.elapsed)) * 10;
    const lifeBonus = this.lives * 250;
    const total = this.score + timeBonus + lifeBonus;
    this._winData = {
      levelId: this.levelDef.id, coins: this.coins, coinScore: this.score,
      timeBonus, lifeBonus, delayMinutes: this.hazards.delayMinutes, total,
    };
    // Feier mit Feuerwerk, dann Ergebnis-Screen
    this.celebrating = true;
    this._celebrateT = 0; this._lastFw = -1;
    this.input.left = this.input.right = this.input.jump = false;
    const g = this.level.goal;
    this._spawnFireworks(g.x + g.w / 2, g.y + 10);
    this._spawnPopup(g.x + g.w / 2, g.y - 20, 'ZIEL erreicht! 🎉', '#ffd60a');
    this._sfx('win');
  }

  _finishWin() {
    this.finished = true;
    this.running = false;
    if (this.cb.onWin) this.cb.onWin(this._winData);
  }

  /* ---------- Effekte: Konfetti, Feuerwerk, Text-Popups ---------- */
  _spawnBurst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 170;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90, life: 0.8 + Math.random() * 0.6, max: 1.4, size: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, color: colors[(Math.random() * colors.length) | 0] });
    }
  }
  _spawnFireworks(x, y) {
    const cols = ['#ffd60a', '#EC0016', '#7fd0ff', '#5bff8a', '#ff7ad0', '#ffffff'];
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, sp = 120 + Math.random() * 130;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9 + Math.random() * 0.6, max: 1.5, size: 3 + Math.random() * 4, rot: 0, vr: 0, color: cols[(Math.random() * cols.length) | 0], spark: true });
    }
  }
  _spawnPopup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 1.2, max: 1.2 });
  }
  _updateFx(dt) {
    for (const p of this.particles) {
      p.vy += (p.spark ? 220 : 640) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt;
    }
    if (this.particles.length) this.particles = this.particles.filter((p) => p.life > 0);
    for (const u of this.popups) { u.y -= 38 * dt; u.life -= dt; }
    if (this.popups.length) this.popups = this.popups.filter((u) => u.life > 0);
  }
  _drawFx(ctx) {
    const cam = this.cam;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.translate(Math.round(p.x - cam.x), Math.round(p.y - cam.y));
      ctx.fillStyle = p.color;
      if (p.spark) { ctx.beginPath(); ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const u of this.popups) {
      const sx = Math.round(u.x - cam.x), sy = Math.round(u.y - cam.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, u.life / u.max));
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillText(u.text, sx + 1, sy + 1);
      ctx.fillStyle = u.color; ctx.fillText(u.text, sx, sy);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'start';
  }

  _gameOver() {
    this.finished = true;
    this.running = false;
    this._sfx('gameover');
    if (this.cb.onGameOver) this.cb.onGameOver({
      levelId: this.levelDef.id,
      coins: this.coins,
      score: this.score,
    });
  }

  _updateCamera() {
    const w = this.canvas.width, h = this.canvas.height;
    const targetX = this.player.x + this.player.w / 2 - w / 2;
    this.cam.x = Math.max(0, Math.min(this.level.pixelWidth - w, targetX));
    this.cam.y = Math.max(0, Math.min(this.level.pixelHeight - h, 0));
  }

  _rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  _hudState() {
    const hs = this.hazards.hudState;
    const goalX = this.level.goal ? this.level.goal.x : this.level.pixelWidth;
    const progress = Math.max(0, Math.min(1, this.player.x / goalX));
    return {
      lives: this.lives, score: this.score,
      temp: hs.temp, tempLabel: hs.tempLabel, tempColor: hs.tempColor,
      delayMinutes: hs.delayMinutes, progress,
    };
  }

  _sfx(name) { if (this.cb.onSfx) this.cb.onSfx(name); }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.level.draw(ctx, this.cam, this.elapsed);
    for (const e of this.entities) e.draw(ctx, this.cam);
    this.player.draw(ctx, this.cam);
    this.hazards.drawOverlay(ctx);
    this._drawFx(ctx);
  }
}

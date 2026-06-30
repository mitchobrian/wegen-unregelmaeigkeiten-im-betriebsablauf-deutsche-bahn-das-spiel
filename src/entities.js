/* Collectibles und Hindernisse. Alle teilen eine schlichte AABB-Box.
   Anker: s.y ist die SURFACE-Reihe; der Boden liegt bei s.y + TILE (= floorY). */

import { TILE } from './level.js';

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

class Entity {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; this.dead = false; this.t = 0; }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  overlaps(r) { return aabb(this.rect, r); }
  update(dt) { this.t += dt; }
  draw() {}
}

// Stehende Fahrgast-Figur, skaliert auf w/h.
function drawPerson(ctx, x, y, w, h, coat, hair) {
  const legH = h * 0.26, legW = w * 0.22;
  ctx.fillStyle = '#26354a';
  ctx.fillRect(x + w * 0.2, y + h - legH, legW, legH);
  ctx.fillRect(x + w * 0.58, y + h - legH, legW, legH);
  ctx.fillStyle = coat;
  ctx.fillRect(x + w * 0.08, y + h * 0.3, w * 0.84, h * 0.48);
  ctx.fillStyle = '#e8c9a0';
  ctx.fillRect(x + w * 0.28, y + h * 0.06, w * 0.44, h * 0.24);
  if (hair) { ctx.fillStyle = hair; ctx.fillRect(x + w * 0.26, y + h * 0.05, w * 0.48, h * 0.08); }
}

/* ---------- Collectibles ---------- */

export class Coin extends Entity {
  constructor(x, y) { super(x - 1, y - 6, 34, 42); this.kind = 'coin'; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const s = Math.abs(Math.sin(this.t * 4));
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath(); ctx.ellipse(x + 17, y + 21, 15 * (0.4 + 0.6 * s), 19, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#caa106'; ctx.font = 'bold 22px Arial'; ctx.fillText('€', x + 8, y + 29);
  }
}

export class ReliefItem extends Entity {
  constructor(x, y, relief) { super(x - 8, y - 12, 52, 54); this.kind = 'relief'; this.relief = relief; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const bob = Math.sin(this.t * 3) * 2;
    ctx.font = '48px Arial';
    ctx.fillText(this.relief === 'cool' ? '🧊' : '☕', x, y + 46 + bob);
  }
}

export class BahnCard extends Entity {
  constructor(x, y) { super(x - 10, y - 6, 92, 56); this.kind = 'bahncard'; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const bob = Math.sin(this.t * 4) * 2;
    // Karte (Rahmen klar größer als die Schrift)
    ctx.fillStyle = '#EC0016'; this._rr(ctx, x, y + bob, 92, 52, 8); ctx.fill();
    ctx.fillStyle = '#b8000f'; this._rr(ctx, x + 4, y + 4 + bob, 84, 44, 6); ctx.fill();
    ctx.fillStyle = '#ffd60a'; ctx.fillRect(x + 10, y + 14 + bob, 16, 12); // Chip
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial';
    ctx.fillText('BahnCard', x + 12, y + 40 + bob);
  }
  _rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); }
}

/* ---------- Hindernisse ---------- */

// Herrenloser Koffer, rollt hin und her. Stompbar.
export class Walker extends Entity {
  constructor(x, y) { super(x - 8, (y + TILE) - 52, 52, 52); this.kind = 'walker'; this.vx = -55; this.stompable = true; }
  update(dt, level) {
    this.t += dt; this.x += this.vx * dt;
    const ahead = this.vx < 0 ? this.x : this.x + this.w;
    const tx = Math.floor((this.vx < 0 ? ahead - 2 : ahead + 2) / TILE);
    const tyMid = Math.floor((this.y + this.h / 2) / TILE);
    const tyFoot = Math.floor((this.y + this.h + 2) / TILE);
    if (level.isSolid(tx, tyMid) || !level.isSolid(tx, tyFoot)) this.vx *= -1;
  }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), w = this.w, h = this.h;
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3f2a17'; ctx.lineWidth = 3; ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = '#caa472'; ctx.fillRect(x + 5, y + h / 2 - 2, w - 10, 4);
    ctx.fillStyle = '#3f2a17'; ctx.fillRect(x + w / 2 - 8, y - 7, 16, 8);
  }
}

// Statische Rollkoffer (für Sprung-Kombos). Stompbar.
export class Luggage extends Walker {
  constructor(x, y) { super(x, y); this.kind = 'luggage'; this.vx = 0; }
  update(dt) { this.t += dt; }
}

// Menschenmenge: lockere Gruppe – echtes Hindernis (drüberspringen, nicht durchlaufen).
export class Crowd extends Entity {
  constructor(x, y) { super(x - 14, (y + TILE) - 108, 168, 108); this.kind = 'crowd'; this.base = this.x; this.stompable = false; }
  update(dt) { this.t += dt; this.x = this.base + Math.sin(this.t * 0.6) * 14; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const coats = ['#2b3a55', '#6b4a2b', '#3a5540'];
    const hairs = ['#2a2018', '#5a4632', '#1a1a1a'];
    for (let i = 0; i < 3; i++) {
      const px = x + i * 56 + Math.sin(this.t * 2 + i) * 2;
      const py = y + (i === 1 ? -6 : 2);
      drawPerson(ctx, px, py, 54, this.h - (i === 1 ? -6 : 2), coats[i], hairs[i]);
    }
  }
}

// Getränkewagen (Bordbistro-Trolley): rollt langsam, stompbar.
export class Trolley extends Entity {
  constructor(x, y) { super(x, (y + TILE) - 96, 72, 96); this.kind = 'trolley'; this.vx = -45; this.base = x; this.range = TILE * 4; this.stompable = true; }
  update(dt) { this.t += dt; this.x += this.vx * dt; if (this.x < this.base - this.range || this.x > this.base) this.vx *= -1; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), w = this.w, h = this.h;
    ctx.fillStyle = '#c8ccd2'; ctx.fillRect(x, y + h * 0.18, w, h * 0.74);
    ctx.strokeStyle = '#8b9098'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + h * 0.18 + 1, w - 2, h * 0.74 - 2);
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x, y + h * 0.18 + i * h * 0.18); ctx.lineTo(x + w, y + h * 0.18 + i * h * 0.18); ctx.stroke(); }
    ctx.fillStyle = '#9aa1ab'; ctx.fillRect(x - 3, y + h * 0.12, w + 6, 6);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 15, y, 9, 11);
    ctx.strokeStyle = '#5b636e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + w, y + h * 0.22); ctx.lineTo(x + w + 11, y + h * 0.22); ctx.stroke();
    ctx.fillStyle = '#1a1d22'; ctx.beginPath(); ctx.arc(x + 13, y + h - 6, 6, 0, Math.PI * 2); ctx.arc(x + w - 13, y + h - 6, 6, 0, Math.PI * 2); ctx.fill();
  }
}

// Kontrolleur: steht im Gang. Nicht stompbar – drüberspringen.
export class Inspector extends Entity {
  constructor(x, y) { super(x + 2, (y + TILE) - 96, 46, 96); this.kind = 'inspector'; this.stompable = false; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), w = this.w, h = this.h;
    drawPerson(ctx, x, y, w, h, '#23406e');
    ctx.fillStyle = '#d8b400'; ctx.fillRect(x + w * 0.45, y + h * 0.32, 3, h * 0.42); // Tresse
    const sway = Math.sin(this.t * 2) * 2;
    ctx.fillStyle = '#eef1f4'; ctx.fillRect(x + w * 0.74 + sway, y + h * 0.4, 12, 9);   // Fahrkarte
    ctx.fillStyle = '#EC0016'; ctx.fillRect(x + w * 0.26, y + h * 0.04, w * 0.48, h * 0.07); // Mütze
    ctx.fillStyle = '#222'; ctx.fillRect(x + w * 0.26, y + h * 0.1, w * 0.48, 3);
  }
}

// Reinigungskraft mit Wischmopp – blockt, nicht stompbar.
export class Cleaner extends Entity {
  constructor(x, y) { super(x + 2, (y + TILE) - 96, 46, 96); this.kind = 'cleaner'; this.stompable = false; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), w = this.w, h = this.h;
    const mop = Math.sin(this.t * 3) * 6;
    drawPerson(ctx, x, y, w, h, '#2e7d4f', '#3a2d22');
    ctx.fillStyle = '#d8e000'; ctx.fillRect(x + w * 0.08, y + h * 0.34, w * 0.84, 7); // Warnstreifen
    ctx.strokeStyle = '#9a6b3f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + w * 0.8, y + h * 0.38); ctx.lineTo(x + w + 14 + mop, y + h - 4); ctx.stroke();
    ctx.fillStyle = '#dfe6ef'; ctx.fillRect(x + w + 6 + mop, y + h - 10, 18, 8);
  }
}

// Reisender mit Kinderwagen – breites, langsames Hindernis. Stompbar.
export class Stroller extends Entity {
  constructor(x, y) { super(x, (y + TILE) - 92, 92, 92); this.kind = 'stroller'; this.vx = -30; this.base = x; this.range = TILE * 3; this.stompable = true; }
  update(dt) { this.t += dt; this.x += this.vx * dt; if (this.x < this.base - this.range || this.x > this.base) this.vx *= -1; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), h = this.h;
    drawPerson(ctx, x, y, 42, h, '#534b8a', '#2a2018');
    ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 36, y + h * 0.34); ctx.lineTo(x + 60, y + h * 0.26); ctx.stroke();
    ctx.fillStyle = '#3a6ea5'; this._rr(ctx, x + 52, y + h * 0.26, 36, 34, 12); ctx.fill();
    ctx.fillStyle = '#cfe0f0'; ctx.fillRect(x + 58, y + h * 0.3, 24, 10);
    ctx.fillStyle = '#1a1d22'; ctx.beginPath(); ctx.arc(x + 60, y + h - 6, 7, 0, Math.PI * 2); ctx.arc(x + 84, y + h - 6, 7, 0, Math.PI * 2); ctx.fill();
  }
  _rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); }
}

// Hund an der Leine – flink, quert den Gang. Stompbar.
export class Dog extends Entity {
  constructor(x, y) { super(x, (y + TILE) - 44, 64, 44); this.kind = 'dog'; this.vx = -120; this.base = x; this.range = TILE * 3; this.stompable = true; }
  update(dt) { this.t += dt; this.x += this.vx * dt; if (this.x < this.base - this.range || this.x > this.base) this.vx *= -1; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const dir = this.vx < 0 ? -1 : 1;
    const lp = Math.sin(this.t * 14) * 3;
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(x + 12, y + 12, 42, 20);                       // Körper
    ctx.fillRect(x + 16, y + 30, 6, 12 + lp); ctx.fillRect(x + 44, y + 30, 6, 12 - lp); // Beine
    const hx = dir < 0 ? x : x + 42;
    ctx.fillRect(hx, y + 2, 20, 18);                            // Kopf
    ctx.fillStyle = '#5a3c22'; ctx.fillRect(hx + (dir < 0 ? -2 : 14), y - 2, 8, 9);     // Ohr
    ctx.fillStyle = '#3a2718'; ctx.fillRect(dir < 0 ? hx + 2 : hx + 13, y + 9, 4, 4);   // Auge/Nase
    ctx.fillStyle = '#7a5230'; ctx.fillRect(dir < 0 ? x + 52 : x - 8, y + 8, 12, 5);    // Rute
  }
}

// Schlafender Fahrgast quer im Gang – statisch, niedrig, drüberspringen.
export class Sleeper extends Entity {
  constructor(x, y) { super(x - 20, (y + TILE) - 40, 108, 40); this.kind = 'sleeper'; this.stompable = false; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), w = this.w, h = this.h;
    ctx.fillStyle = '#4a5568'; this._rr(ctx, x, y + 12, w, h - 12, 12);       // Körper liegend
    ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.arc(x + w - 12, y + 22, 13, 0, Math.PI * 2); ctx.fill(); // Kopf
    ctx.fillStyle = '#2a2018'; ctx.fillRect(x + w - 22, y + 9, 20, 7);        // Haar
    ctx.fillStyle = '#888'; ctx.font = '16px Arial'; ctx.fillText('z z', x + w - 8, y + 6);
  }
  _rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); }
}

// Verschütteter Kaffee / nasser Boden – rutschig, kein Schaden.
export class SlipPatch extends Entity {
  constructor(x, y) { super(x - 8, (y + TILE) - 12, 96, 14); this.kind = 'slip'; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), w = this.w;
    ctx.fillStyle = 'rgba(120,90,50,.5)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 9, w / 2, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x + w * 0.4, y + 7, w * 0.18, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '20px Arial'; ctx.fillText('☕', x + w / 2 - 8, y + 2);
  }
}

// Sich schließende Schiebetür zwischen den Wagen – nur durch, wenn offen.
export class ClosingDoor extends Entity {
  constructor(x, y) { super(x + 1, (y + TILE) - 300, 46, 300); this.kind = 'door'; this.period = 4; this.shut = 2.5; }
  _openAmt() {
    const ph = this.t % this.period, t0 = this.shut, P = this.period;
    if (ph < t0 - 0.5) return 1;
    if (ph < t0) return (t0 - ph) / 0.5;
    if (ph < P - 0.5) return 0;
    return (ph - (P - 0.5)) / 0.5;
  }
  get closed() { return this._openAmt() < 0.4; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), w = this.w, h = this.h;
    const open = this._openAmt(), slide = (w / 2) * open;
    ctx.fillStyle = '#7e858f'; ctx.fillRect(x - 5, y, 6, h); ctx.fillRect(x + w - 1, y, 6, h);
    ctx.fillStyle = '#9aa1ab'; ctx.fillRect(x - 5, y, w + 11, 7);
    ctx.fillStyle = this.closed ? '#cdd2d8' : '#e7eaee';
    ctx.fillRect(x - slide, y + 7, w / 2, h - 7);
    ctx.fillRect(x + w / 2 + slide, y + 7, w / 2, h - 7);
    ctx.fillStyle = '#0f2f57';
    ctx.fillRect(x - slide + 5, y + 24, w / 2 - 10, 64);
    ctx.fillRect(x + w / 2 + slide + 5, y + 24, w / 2 - 10, 64);
    if (this.closed) { ctx.fillStyle = '#EC0016'; ctx.fillRect(x + w / 2 - 2, y + 7, 4, h - 7); }
  }
}

// „Wir bitten um Verständnis"-Durchsage – Verspätungs-Malus, kein Treffer.
export class Announce extends Entity {
  constructor(x, y) { super(x, (y + TILE) - 240, TILE, 240); this.kind = 'announce'; this.triggered = false; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), w = this.w;
    ctx.fillStyle = this.triggered ? '#5b636e' : '#2b2f36'; ctx.fillRect(x + w / 2 - 11, y, 22, 14);
    ctx.fillStyle = '#9aa1ab'; ctx.beginPath(); ctx.arc(x + w / 2, y + 14, 9, 0, Math.PI); ctx.fill();
    if (!this.triggered) {
      const a = 0.4 + Math.abs(Math.sin(this.t * 4)) * 0.5;
      ctx.strokeStyle = `rgba(236,0,22,${a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + w / 2, y + 16, 16, -0.5, 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w / 2, y + 16, 23, -0.5, 0.5); ctx.stroke();
    }
  }
}

const FACTORY = {
  coin: (s) => new Coin(s.x, s.y),
  cool: (s) => new ReliefItem(s.x, s.y, 'cool'),
  warm: (s) => new ReliefItem(s.x, s.y, 'warm'),
  bahncard: (s) => new BahnCard(s.x, s.y),
  walker: (s) => new Walker(s.x, s.y),
  luggage: (s) => new Luggage(s.x, s.y),
  crowd: (s) => new Crowd(s.x, s.y),
  trolley: (s) => new Trolley(s.x, s.y),
  inspector: (s) => new Inspector(s.x, s.y),
  cleaner: (s) => new Cleaner(s.x, s.y),
  stroller: (s) => new Stroller(s.x, s.y),
  dog: (s) => new Dog(s.x, s.y),
  sleeper: (s) => new Sleeper(s.x, s.y),
  slip: (s) => new SlipPatch(s.x, s.y),
  door: (s) => new ClosingDoor(s.x, s.y),
  announce: (s) => new Announce(s.x, s.y),
};

export function buildEntities(specs) {
  return specs.map((s) => FACTORY[s.type] && FACTORY[s.type](s)).filter(Boolean);
}

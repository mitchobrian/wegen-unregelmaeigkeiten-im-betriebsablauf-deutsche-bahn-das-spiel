/* Tilemap-Parsing, Kollisionsabfrage und Rendering eines Levels. */

export const TILE = 32;

// Zug-Identitäten je Level (Backdrop + Ziel-Zug).
const TRAINS = {
  RB:  { label: 'RB',  body: '#EC0016', text: '#ffffff', stripe: '#ffffff', win: '#1b2230' },
  S:   { label: 'S',   body: '#ffffff', text: '#0a6b3b', stripe: '#008D4F', win: '#243044' },
  ICE: { label: 'ICE', body: '#eef1f4', text: '#EC0016', stripe: '#EC0016', win: '#1b2230' },
};

// Solide (begehbare/blockierende) Tile-Zeichen.
const SOLID = new Set(['#', 'B', '|']);

// Zeichen, die als Entity interpretiert werden (nicht im Terrain-Grid landen).
const ENTITY_CHARS = {
  o: 'coin',
  c: 'cool',
  w: 'warm',
  k: 'bahncard',
  x: 'walker',
  m: 'crowd',
  v: 'trolley',
  i: 'inspector',
  l: 'luggage',
  r: 'cleaner',
  b: 'stroller',
  d: 'dog',
  s: 'sleeper',
  n: 'slip',
  D: 'door',
  a: 'announce',
};

export class Level {
  constructor(def) {
    this.def = def;
    this.theme = def.theme; // 'heat' | 'cold' | 'mixed'
    this.train = TRAINS[def.trainType] || TRAINS.RB;
    this.trainName = def.trainName || 'Endstation';
    this.rows = def.map;
    this.height = this.rows.length;
    this.width = Math.max(...this.rows.map((r) => r.length));
    this.spawn = { x: TILE, y: TILE };
    this.goal = null;
    this.entitySpecs = [];

    // Grid mit Solid-Flags + Render-Zeichen aufbauen.
    this.grid = [];
    for (let ty = 0; ty < this.height; ty++) {
      const row = [];
      const line = this.rows[ty];
      for (let tx = 0; tx < this.width; tx++) {
        const ch = line[tx] || ' ';
        if (ch === 'p') {
          this.spawn = { x: tx * TILE, y: ty * TILE };
          row.push(' ');
        } else if (ch === 'G') {
          // Ziel (Zug) markiert eine 2x3-Region ab diesem Tile.
          if (!this.goal) this.goal = { x: tx * TILE, y: (ty - 2) * TILE, w: TILE * 2, h: TILE * 3 };
          row.push(' ');
        } else if (ch === '^') {
          row.push('^'); // statische Gefahr (Gleis/Oberleitung) – nicht solide, aber Schaden
        } else if (ENTITY_CHARS[ch]) {
          this.entitySpecs.push({ type: ENTITY_CHARS[ch], x: tx * TILE, y: ty * TILE });
          row.push(' ');
        } else {
          row.push(SOLID.has(ch) ? ch : ' ');
        }
      }
      this.grid.push(row);
    }

    this.pixelWidth = this.width * TILE;
    this.pixelHeight = this.height * TILE;
  }

  tileAt(tx, ty) {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) return ' ';
    return this.grid[ty][tx];
  }

  isSolid(tx, ty) {
    return SOLID.has(this.tileAt(tx, ty));
  }

  // Gefahr-Tiles, die bei Berührung Schaden verursachen (Gleisbett/Oberleitung).
  isHazardPixel(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    return this.tileAt(tx, ty) === '^';
  }

  // ---------- Rendering ----------
  draw(ctx, cam, t) {
    this._drawBackground(ctx, cam, t);

    const startTx = Math.max(0, Math.floor(cam.x / TILE));
    const endTx = Math.min(this.width, Math.ceil((cam.x + ctx.canvas.width) / TILE) + 1);
    const startTy = Math.max(0, Math.floor(cam.y / TILE));
    const endTy = Math.min(this.height, Math.ceil((cam.y + ctx.canvas.height) / TILE) + 1);

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const ch = this.grid[ty][tx];
        if (ch === ' ') continue;
        const x = Math.round(tx * TILE - cam.x);
        const y = Math.round(ty * TILE - cam.y);
        this._drawTile(ctx, ch, x, y, tx, ty);
      }
    }

    if (this.goal) this._drawGoal(ctx, cam);
  }

  _drawTile(ctx, ch, x, y, tx, ty) {
    if (ch === '^') {
      // Gefahr: Schienenbett / Stromschiene
      ctx.fillStyle = '#5a5f6a';
      ctx.fillRect(x, y + TILE - 8, TILE, 8);
      ctx.fillStyle = '#ffcc00';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 8 + 4, y + TILE - 8);
        ctx.lineTo(x + i * 8, y + TILE);
        ctx.lineTo(x + i * 8 + 8, y + TILE);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }

    // Boden/Block – Bahnsteig-Optik
    const top = this.tileAt(tx, ty - 1);
    const isSurface = !SOLID.has(top);
    if (ch === 'B') {
      ctx.fillStyle = '#9a6b3f';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.fillRect(x, y + TILE / 2 - 1, TILE, 2);
      ctx.fillRect(x + TILE / 2 - 1, y, 2, TILE);
    } else if (ch === '|') {
      ctx.fillStyle = '#646973';
      ctx.fillRect(x + TILE / 2 - 4, y, 8, TILE);
    } else {
      // Bahnsteigplatte
      ctx.fillStyle = isSurface ? '#7d8794' : '#5b636e';
      ctx.fillRect(x, y, TILE, TILE);
      if (isSurface) {
        ctx.fillStyle = '#ffd60a'; // taktile Bahnsteigkante
        ctx.fillRect(x, y, TILE, 4);
      }
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }

  _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Das Ziel: die Wagentür zum Ausstieg, mit Zugzielanzeige darüber.
  _drawGoal(ctx, cam) {
    const g = this.goal;
    const T = this.train;
    const x = Math.round(g.x - cam.x);
    const y = Math.round(g.y - cam.y);
    const dw = g.w + 36;
    const dy = y - 24;
    const dh = g.h + 24;
    const leafW = dw / 2 - 5;

    // Türnische
    ctx.fillStyle = '#9aa1ab';
    this._rr(ctx, x - 14, dy, dw + 28, dh, 8); ctx.fill();
    ctx.fillStyle = '#7e858f';
    ctx.fillRect(x - 14, dy, dw + 28, 6);
    // Zwei Türblätter
    ctx.fillStyle = '#eef1f4';
    this._rr(ctx, x - 8, dy + 10, leafW, dh - 18, 4); ctx.fill();
    this._rr(ctx, x + dw / 2 + 8, dy + 10, leafW, dh - 18, 4); ctx.fill();
    // Türfenster
    ctx.fillStyle = '#0f2f57';
    ctx.fillRect(x, dy + 18, leafW - 12, 44);
    ctx.fillRect(x + dw / 2 + 14, dy + 18, leafW - 12, 44);
    // Mittelspalt + Akzent-Türkante
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.fillRect(x + dw / 2 - 1, dy + 10, 4, dh - 18);
    ctx.fillStyle = T.stripe;
    ctx.fillRect(x - 8, dy + dh - 22, dw - 2, 5);

    // Zugzielanzeige über der Tür
    const sw = dw + 28, sh = 30, sx = x - 14, sy = dy - 40;
    ctx.fillStyle = '#0b0e14';
    this._rr(ctx, sx, sy, sw, sh, 5); ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd60a'; ctx.font = 'bold 14px Arial';
    ctx.fillText(`» ${this.trainName}`, sx + 10, sy + sh / 2);
    ctx.fillStyle = '#7fd0ff'; ctx.font = '10px Arial';
    ctx.fillText(T.label, sx + sw - 34, sy + sh / 2);

    // Ausstieg-Hinweis
    ctx.fillStyle = '#EC0016'; ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('AUSSTIEG ▸', x + dw / 2 - 6, dy + dh - 9);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // === Innenansicht: Du sitzt im Zug ===

  // Decke mit Lichtband, Gepäckablage und Haltegriff-Schlaufen.
  _drawCeiling(ctx, cam) {
    const w = ctx.canvas.width;
    ctx.fillStyle = '#e7eaee'; ctx.fillRect(0, 0, w, 46);          // Deckenpaneel
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(0, 10, w, 11); // Lichtband
    ctx.fillStyle = '#9aa1ab'; ctx.fillRect(0, 46, w, 9);          // Gepäckablage
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(0, 55, w, 3);
    ctx.strokeStyle = '#aab0ba'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 72); ctx.lineTo(w, 72); ctx.stroke();
    // Halteschlaufen – Welt-verankert, scrollen mit
    ctx.strokeStyle = '#7e858f'; ctx.lineWidth = 3;
    const STEP = 104;
    for (let k = Math.floor((cam.x - 50) / STEP); k * STEP + 50 < cam.x + w; k++) {
      const hx = Math.round(k * STEP + 50 - cam.x);
      ctx.beginPath(); ctx.moveTo(hx, 72); ctx.lineTo(hx, 100); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, 100, 9, 0, Math.PI); ctx.stroke();
    }
  }

  // Hügelform-Helfer für die Landschaft.
  _hill(ctx, cx, baseY, wd, ht) {
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.quadraticCurveTo(cx + wd / 2, baseY - ht, cx + wd, baseY);
    ctx.lineTo(cx + wd, baseY + 260);
    ctx.lineTo(cx, baseY + 260);
    ctx.closePath();
    ctx.fill();
  }
  _tree(ctx, x, baseY) {
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x + 11, baseY - 30); ctx.lineTo(x + 22, baseY); ctx.closePath(); ctx.fill();
  }

  // Landschaft hinter einem Fenster (geclippt). Welt-verankert über phase; Schnee/Hitze über t.
  _drawSceneInWindow(ctx, x, y, w, h, t, phase = 0) {
    const off = ((phase * 0.5) % 340 + 340) % 340;
    const horizon = y + h * 0.62;

    if (this.theme === 'cold') {
      const sg = ctx.createLinearGradient(0, y, 0, y + h);
      sg.addColorStop(0, '#a9bcd0'); sg.addColorStop(1, '#eaf2f9');
      ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#9fb3c8'; for (let i = -1; i < 3; i++) this._hill(ctx, x + i * 160 - off * 0.5, horizon, 170, 78);     // ferne Berge
      ctx.fillStyle = '#f3f8fc'; for (let i = -1; i < 3; i++) this._hill(ctx, x + i * 130 + 50 - off, horizon + 16, 140, 34);   // Schneehügel
      ctx.fillStyle = '#fbfdff'; ctx.fillRect(x, horizon + 14, w, h);
      ctx.fillStyle = '#cfe0ee'; for (let i = 0; i < 3; i++) this._tree(ctx, x + (((i * 90 - off) % (w + 40)) + w + 40) % (w + 40) - 20, horizon + 12);
      // dichter Schneefall (übertrieben)
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const sz = 1 + (i % 4);
        const fx = x + (((i * 61 + Math.sin(t * 1.5 + i) * 16) % w) + w) % w;
        const fy = y + ((i * 43 + t * (70 + (i % 4) * 45)) % h);
        ctx.globalAlpha = 0.65 + (i % 3) * 0.12;
        ctx.beginPath(); ctx.arc(fx, fy, sz, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x, y + h - 9, w, 9); // angewehter Schnee unten
    } else if (this.theme === 'heat') {
      const sg = ctx.createLinearGradient(0, y, 0, y + h);
      sg.addColorStop(0, '#36a0e8'); sg.addColorStop(1, '#e3f2ff');
      ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
      const cx = x + w * 0.7, cy = y + h * 0.26, R = Math.min(w, h) * 0.55;
      const gl = ctx.createRadialGradient(cx, cy, 3, cx, cy, R);
      gl.addColorStop(0, 'rgba(255,250,205,1)'); gl.addColorStop(0.35, 'rgba(255,240,150,.9)'); gl.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = gl; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#fff7c0'; ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8cae54'; for (let i = -1; i < 3; i++) this._hill(ctx, x + i * 160 - off, horizon, 170, 38);
      ctx.fillStyle = '#cdb95a'; ctx.fillRect(x, horizon + 4, w, h); // dürrer Boden
      ctx.fillStyle = 'rgba(255,255,255,.14)';                       // Hitzeflimmern
      for (let i = 0; i < 7; i++) ctx.fillRect(x, y + h * 0.5 + i * 9 + Math.sin(t * 4 + i) * 3, w, 2);
    } else {
      const sg = ctx.createLinearGradient(0, y, 0, y + h);
      sg.addColorStop(0, '#6b7a93'); sg.addColorStop(1, '#c2b09a');  // Stadt-Dämmerung
      ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
      const hz = y + h * 0.72;
      ctx.fillStyle = '#4a5568';
      for (let i = 0; i < 7; i++) { const bx = x + ((((i * 48 - off) % (w + 80)) + w + 80) % (w + 80)) - 40; const bh = 36 + (i * 17 % 60); ctx.fillRect(bx, hz - bh, 28, bh); }
      ctx.fillStyle = '#5a6678'; ctx.fillRect(x, hz, w, h);
    }
    // Geschwindigkeitsstreifen (Bewegungsunschärfe)
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    for (let i = 0; i < 5; i++) ctx.fillRect(x, y + 22 + i * 34, w, 2);
  }

  // Große Fensterreihe – Welt-verankert (man geht daran vorbei).
  _drawWindows(ctx, cam, t) {
    const w = ctx.canvas.width;
    const winY = 138, winH = 234, WIN = 154, STEP = 202;
    for (let k = Math.floor((cam.x - 22 - WIN) / STEP); ; k++) {
      const wx = k * STEP + 22;
      const x = Math.round(wx - cam.x);
      if (x > w) break;
      if (x + WIN < -20) continue;
      ctx.fillStyle = '#9aa1ab';                                   // Rahmen
      this._rr(ctx, x - 7, winY - 7, WIN + 14, winH + 14, 11); ctx.fill();
      ctx.save();
      this._rr(ctx, x, winY, WIN, winH, 8); ctx.clip();
      this._drawSceneInWindow(ctx, x, winY, WIN, winH, t, wx);
      ctx.fillStyle = 'rgba(255,255,255,.08)';                     // Glanz
      ctx.fillRect(x, winY, WIN, 18);
      if (this.theme === 'cold') {                                 // Frost an den Ecken
        const fr = ctx.createRadialGradient(x + WIN / 2, winY + winH / 2, winH * 0.3, x + WIN / 2, winY + winH / 2, winH * 0.75);
        fr.addColorStop(0, 'rgba(255,255,255,0)');
        fr.addColorStop(1, 'rgba(255,255,255,.5)');
        ctx.fillStyle = fr; ctx.fillRect(x, winY, WIN, winH);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2;
      this._rr(ctx, x, winY, WIN, winH, 8); ctx.stroke();
      ctx.fillStyle = '#aab0ba'; ctx.fillRect(x - 7, winY + winH + 3, WIN + 14, 5); // Fensterbank
    }
  }

  // Sitzreihe (DB-blau) auf dem Boden – Welt-verankert (man geht daran vorbei).
  _drawSeats(ctx, cam) {
    const w = ctx.canvas.width;
    const top = 376, h = 104, SEAT = 116, sw = 96;
    for (let k = Math.floor((cam.x - 8 - sw) / SEAT); ; k++) {
      const wx = k * SEAT + 8;
      const x = Math.round(wx - cam.x);
      if (x > w) break;
      if (x + sw < -20) continue;
      ctx.fillStyle = '#1d3252';                                   // Kopfstütze
      this._rr(ctx, x + 16, top - 14, 66, 30, 10); ctx.fill();
      ctx.fillStyle = '#27406a';                                   // Lehne
      this._rr(ctx, x, top, sw, h, 13); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      this._rr(ctx, x + 8, top + 10, sw - 16, 24, 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.16)';                     // Punktmuster
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 5; dx++) ctx.fillRect(x + 20 + dx * 16, top + 36 + dy * 16, 3, 3);
      ctx.fillStyle = '#3a3f47'; ctx.fillRect(x + sw + 4, top + 14, 11, h - 14); // Armlehne
    }
  }

  _drawBackground(ctx, cam, t) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    // Innenwand als Grundfläche
    const wall = ctx.createLinearGradient(0, 0, 0, h);
    wall.addColorStop(0, '#d7dbe1');
    wall.addColorStop(0.55, '#c2c7cf');
    wall.addColorStop(1, '#aeb4bd');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h);

    this._drawCeiling(ctx, cam);
    this._drawWindows(ctx, cam, t);
    this._drawSeats(ctx, cam);

    // Theme-Tönung – Hitze warm, Kälte kühl (dezent, Spielfeld bleibt lesbar)
    if (this.theme === 'heat') { ctx.fillStyle = 'rgba(255,196,90,.12)'; ctx.fillRect(0, 0, w, h); }
    else if (this.theme === 'cold') { ctx.fillStyle = 'rgba(150,200,255,.14)'; ctx.fillRect(0, 0, w, h); }
  }
}

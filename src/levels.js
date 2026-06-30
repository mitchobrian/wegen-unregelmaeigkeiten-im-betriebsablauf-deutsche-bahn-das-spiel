/*
 * Drei Level-Definitionen. Der Boden ist DURCHGEHEND (keine Löcher) – du läufst
 * durch den Zug und wirst immer wieder von Hindernissen aufgehalten.
 * Plattformen, Münzen und Items oben sind optionale Boni.
 *
 * Zeichen: '#' Boden · 'B' Plattform · 'p' Start · 'G' Ziel(Ausstiegstür)
 *          'o' €-Münze · 'c' Eis/Ventilator · 'w' Kaffee/Glühwein · 'k' BahnCard
 *          Hindernisse: 'x' Koffer · 'm' Menschenmenge · 'i' Kontrolleur · 'v' Getränkewagen
 */

const H = 17;
const FLOOR_TOP = 15; // Bodenreihen 15 & 16
const SURFACE = 14;   // Reihe, auf der Dinge "stehen"

function blank(w) {
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(w).fill(' '));
  return g;
}
// Durchgehender Boden – keine Löcher.
function makeFloor(g, w) {
  for (let x = 0; x < w; x++) { g[FLOOR_TOP][x] = '#'; g[FLOOR_TOP + 1][x] = '#'; }
}
function put(g, x, y, ch) { if (g[y] && x >= 0 && x < g[y].length) g[y][x] = ch; }
function platform(g, x, y, len) { for (let i = 0; i < len; i++) put(g, x + i, y, 'B'); }
function coinRow(g, x, y, n) { for (let i = 0; i < n; i++) put(g, x + i, y, 'o'); }
function toRows(g) { return g.map((r) => r.join('')); }

/* ---------- Level 1: Sommerchaos (Hitze) ---------- */
function buildLevel1() {
  const w = 120;
  const g = blank(w);
  makeFloor(g, w);
  // Schwebende Münzbögen (Bonus, durch Springen) + Bodennähe
  coinRow(g, 14, 9, 3); coinRow(g, 40, 10, 3); coinRow(g, 72, 9, 3); coinRow(g, 98, 10, 3);
  coinRow(g, 6, 13, 2); coinRow(g, 52, 13, 2);
  // Abkühlung (Eis/Ventilator)
  put(g, 20, 12, 'c'); put(g, 56, 11, 'c'); put(g, 82, 12, 'c'); put(g, 104, 11, 'c');
  put(g, 64, 9, 'k'); // BahnCard
  // Hindernisse im Gang – immer wieder aufgehalten
  put(g, 12, SURFACE, 'x'); put(g, 24, SURFACE, 'm'); put(g, 38, SURFACE, 'i');
  put(g, 46, SURFACE, 'l'); put(g, 48, SURFACE, 'l'); put(g, 50, SURFACE, 'l'); // Rollkoffer-Reihe
  put(g, 60, SURFACE, 'n'); put(g, 64, SURFACE, 'r');  // nasser Boden + Reinigungskraft
  put(g, 74, SURFACE, 'v'); put(g, 84, SURFACE, 's'); put(g, 92, SURFACE, 'd');
  put(g, 100, SURFACE, 'a'); put(g, 108, SURFACE, 'b');
  // Start / Ziel
  put(g, 2, SURFACE, 'p');
  put(g, 116, SURFACE, 'G');
  return {
    id: 1,
    theme: 'heat',
    name: 'Sommerchaos im Regionalexpress',
    subtitle: 'Klimaanlage defekt – die Hitze steigt. Halte dich mit Eis & Ventilatoren kühl.',
    icon: '🥵',
    par: 45,
    trainType: 'RB',
    trainName: 'Bummelheim',
    map: toRows(g),
  };
}

/* ---------- Level 2: Winterfahrt (Kälte) ---------- */
function buildLevel2() {
  const w = 130;
  const g = blank(w);
  makeFloor(g, w);
  coinRow(g, 18, 9, 3); coinRow(g, 44, 10, 3); coinRow(g, 70, 9, 3); coinRow(g, 100, 10, 3);
  coinRow(g, 8, 13, 3); coinRow(g, 52, 13, 2); coinRow(g, 120, 13, 2);
  // Aufwärmung (Kaffee/Glühwein)
  put(g, 16, 12, 'w'); put(g, 40, 11, 'w'); put(g, 72, 12, 'w'); put(g, 104, 11, 'w'); put(g, 118, 12, 'w');
  put(g, 86, 9, 'k'); // BahnCard
  // Hindernisse (dichter) – inkl. Schiebetür
  put(g, 12, SURFACE, 'x'); put(g, 22, SURFACE, 'm'); put(g, 34, SURFACE, 'D'); // Schiebetür
  put(g, 46, SURFACE, 'i'); put(g, 56, SURFACE, 'n'); put(g, 58, SURFACE, 'r');
  put(g, 68, SURFACE, 'v'); put(g, 78, SURFACE, 'l'); put(g, 80, SURFACE, 'l'); put(g, 82, SURFACE, 'l');
  put(g, 92, SURFACE, 'd'); put(g, 100, SURFACE, 's'); put(g, 108, SURFACE, 'a'); put(g, 116, SURFACE, 'b');
  put(g, 2, SURFACE, 'p');
  put(g, 126, SURFACE, 'G');
  return {
    id: 2,
    theme: 'cold',
    name: 'Winterfahrt ohne Heizung',
    subtitle: 'Heizung ausgefallen – es wird eisig. Wärm dich an Kaffee & Glühwein.',
    icon: '🥶',
    par: 55,
    trainType: 'S',
    trainName: 'Frosthausen',
    map: toRows(g),
  };
}

/* ---------- Level 3: Hauptbahnhof-Endspurt (alles) ---------- */
function buildLevel3() {
  const w = 150;
  const g = blank(w);
  makeFloor(g, w);
  coinRow(g, 16, 9, 3); coinRow(g, 40, 10, 3); coinRow(g, 66, 9, 3); coinRow(g, 92, 10, 3); coinRow(g, 116, 9, 3);
  coinRow(g, 6, 13, 3); coinRow(g, 52, 13, 2); coinRow(g, 134, 13, 3);
  // Beide Erleichterungen, weil das Klima pendelt
  put(g, 14, 12, 'c'); put(g, 36, 11, 'w'); put(g, 72, 12, 'c'); put(g, 100, 11, 'w'); put(g, 130, 12, 'c');
  put(g, 68, 9, 'k'); put(g, 118, 9, 'k'); // zwei BahnCards
  // Volles Programm: alles, was den Betriebsablauf stört
  put(g, 10, SURFACE, 'x'); put(g, 20, SURFACE, 'm'); put(g, 32, SURFACE, 'D'); // Schiebetür
  put(g, 42, SURFACE, 'i'); put(g, 52, SURFACE, 'n'); put(g, 54, SURFACE, 'r');
  put(g, 64, SURFACE, 'v'); put(g, 74, SURFACE, 'l'); put(g, 76, SURFACE, 'l'); put(g, 78, SURFACE, 'l');
  put(g, 88, SURFACE, 'b'); put(g, 96, SURFACE, 'd'); put(g, 104, SURFACE, 's');
  put(g, 112, SURFACE, 'a'); put(g, 122, SURFACE, 'm'); put(g, 132, SURFACE, 'i'); put(g, 140, SURFACE, 'x');
  put(g, 2, SURFACE, 'p');
  put(g, 146, SURFACE, 'G');
  return {
    id: 3,
    theme: 'mixed',
    name: 'Hauptbahnhof-Endspurt',
    subtitle: 'Verspätung, Überfüllung, Kontrolleure, Getränkewagen – und das Klima dreht durch.',
    icon: '🎯',
    par: 70,
    trainType: 'ICE',
    trainName: 'Pünktlichkeitshausen',
    map: toRows(g),
  };
}

export const LEVELS = [buildLevel1(), buildLevel2(), buildLevel3()];

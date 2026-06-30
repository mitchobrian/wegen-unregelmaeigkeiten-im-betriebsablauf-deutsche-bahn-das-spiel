/* Bootstrap + Screen-State-Machine: verbindet Engine, HUD, Storage, Bestenliste und UI. */

import { Game } from './engine.js';
import { LEVELS } from './levels.js';
import { hud } from './hud.js';
import { storage } from './storage.js';
import { leaderboard } from './leaderboard.js';
import { validateName } from './blacklist.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');

const SCREENS = ['screen-start', 'screen-name', 'screen-levels', 'screen-help', 'screen-board', 'screen-pause', 'screen-result'];
function showScreen(id) {
  SCREENS.forEach((s) => $(s).classList.toggle('hidden', s !== id));
  if (id) { hud.hide(); $('touch-controls').classList.add('hidden'); $('ingame-controls').classList.add('hidden'); $('goal-toast').classList.add('hidden'); }
}

// Kurzer Ziel-Hinweis beim Levelstart.
function showGoalToast(def) {
  const t = $('goal-toast');
  const tempHint = def.theme === 'cold' ? 'Heizung defekt – wärm dich an <strong>☕/🍷</strong>'
    : def.theme === 'heat' ? 'Klima defekt – kühl dich mit <strong>🧊/Ventilator</strong>'
    : 'Klima dreht durch – <strong>🧊</strong> und <strong>☕</strong> helfen';
  t.innerHTML = `<strong>Level ${def.id}: ${def.name}</strong><br>` +
    `Lauf nach rechts zum <strong>Ausstieg →</strong> · sammle <strong>€</strong> für Punkte · ${tempHint}`;
  t.classList.remove('hidden');
  void t.offsetWidth; // reflow → Übergang greift
  t.classList.add('show');
  clearTimeout(showGoalToast._t);
  showGoalToast._t = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.classList.add('hidden'), 400);
  }, 3800);
}
function hideAllScreens() { SCREENS.forEach((s) => $(s).classList.add('hidden')); }

const isTouch = window.matchMedia('(pointer: coarse)').matches;

// HUD + passende Steuerungsanzeige einblenden (Touch-Buttons bzw. Desktop-Hilfe).
function showGameUI() {
  hud.show();
  if (isTouch) $('touch-controls').classList.remove('hidden');
  else $('ingame-controls').classList.remove('hidden');
}

let lastResult = null; // { outcome:'win'|'over', def, result }

const game = new Game(canvas, {
  onHud: (state) => hud.update(state),
  onSfx: (name) => audio.play(name),
  onWin: (result) => handleWin(result),
  onGameOver: (result) => handleGameOver(result),
});

/* ---------- Spielstart pro Level ---------- */
function startLevel(def) {
  hideAllScreens();
  showGameUI();
  showGoalToast(def);
  game.start(def);
}

/* ---------- Sieg / Niederlage ---------- */
async function handleWin(result) {
  const def = LEVELS.find((l) => l.id === result.levelId);
  storage.recordResult(result.levelId, result.total);
  lastResult = { outcome: 'win', def, result };

  $('result-title').textContent = '🎉 Zug erreicht!';
  $('result-text').innerHTML =
    `Trotz <strong>+${result.delayMinutes} Min</strong> Verspätung geschafft.<br>` +
    `Entschädigung: ${result.coins} × € · Zeitbonus ${result.timeBonus} · Leben ${result.lifeBonus}`;
  $('result-score').textContent = `${result.total} €`;
  const next = LEVELS.find((l) => l.id === result.levelId + 1);
  $('btn-result-next').textContent = next ? 'Nächste Verbindung' : 'Zur Bestenliste';

  showScreen('screen-result');
  await submitScore(result.total, result.levelId);
}

function handleGameOver(result) {
  const def = LEVELS.find((l) => l.id === result.levelId);
  lastResult = { outcome: 'over', def, result };
  $('result-title').textContent = '🚫 Reise gescheitert';
  $('result-text').innerHTML = 'Fahrt endet hier wegen <strong>Unregelmäßigkeiten im Betriebsablauf</strong>. Wir bitten um Verständnis.';
  $('result-score').textContent = `${result.score} €`;
  $('result-board-note').textContent = '';
  $('btn-result-next').textContent = 'Erneut versuchen';
  showScreen('screen-result');
}

async function submitScore(total, levelId) {
  const note = $('result-board-note');
  note.textContent = 'Trage Ergebnis in die Bestenliste ein …';
  try {
    const name = storage.getName() || 'Fahrgast';
    const finalName = await leaderboard.submit(name, total, levelId);
    note.textContent = `Eingetragen als „${finalName}" · ${leaderboard.modeLabel()}`;
  } catch {
    note.textContent = 'Bestenliste momentan nicht erreichbar.';
  }
}

/* ---------- Levelauswahl rendern ---------- */
function renderLevels() {
  $('levels-playername').textContent = storage.getName() || '—';
  const unlocked = storage.getUnlocked();
  const list = $('level-list');
  list.innerHTML = '';
  for (const def of LEVELS) {
    const locked = def.id > unlocked;
    const best = storage.getBest(def.id);
    const card = document.createElement('button');
    card.className = 'level-card' + (locked ? ' locked' : '');
    card.disabled = locked;
    card.innerHTML =
      `<span class="lc-icon">${def.icon}</span>` +
      `<span class="lc-body">` +
        `<span class="lc-title">${def.id}. ${def.name}</span>` +
        `<span class="lc-sub">${def.subtitle}</span>` +
        (best ? `<span class="lc-best">Bestwert: ${best} €</span>` : '') +
      `</span>` +
      (locked ? `<span class="lc-lock">🔒</span>` : `<span class="lc-lock">▶</span>`);
    if (!locked) card.addEventListener('click', () => startLevel(def));
    list.appendChild(card);
  }
}

/* ---------- Bestenliste rendern ---------- */
async function renderBoard(targetScreen = 'screen-board') {
  $('board-mode').textContent = leaderboard.modeLabel();
  const listEl = $('board-list');
  listEl.innerHTML = '<li class="board-empty">Lade …</li>';
  showScreen(targetScreen);
  const rows = await leaderboard.getTop(10);
  if (!rows.length) { listEl.innerHTML = '<li class="board-empty">Noch keine Einträge – sei die/der Erste!</li>'; return; }
  listEl.innerHTML = '';
  for (const r of rows) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="b-name">${escapeHtml(r.name)}</span><span class="b-score">${r.score} €</span>`;
    listEl.appendChild(li);
  }
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Name-Registrierung ---------- */
async function confirmName() {
  const raw = $('input-name').value;
  const errEl = $('name-error');
  const result = validateName(raw);
  if (!result.ok) {
    errEl.textContent = result.reason;
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');
  const btn = $('btn-name-confirm');
  btn.disabled = true; btn.textContent = 'Prüfe Namen …';
  const unique = await leaderboard.resolveName(result.value, storage.getName());
  storage.setName(unique);
  btn.disabled = false; btn.textContent = 'Weiter';
  if (unique !== result.value) {
    errEl.textContent = `Name bereits vergeben – du spielst als „${unique}".`;
    errEl.classList.remove('hidden');
  }
  renderLevels();
  showScreen('screen-levels');
}

/* ---------- Pause-Handling ---------- */
function togglePause() {
  if (!game.running) return;
  if (game.paused) { game.resume(); showScreen(null); showGameUI(); }
  else { game.pause(); showScreen('screen-pause'); }
}

/* ---------- Event-Wiring ---------- */
function wire() {
  // erste Interaktion entsperrt Audio
  const unlock = () => { if (storage.getSound()) audio.unlock(); };

  $('btn-start').addEventListener('click', () => {
    unlock();
    if (storage.getName()) { renderLevels(); showScreen('screen-levels'); }
    else { $('input-name').value = ''; showScreen('screen-name'); $('input-name').focus(); }
  });
  $('btn-show-board').addEventListener('click', () => renderBoard('screen-board'));
  $('btn-show-help').addEventListener('click', () => showScreen('screen-help'));

  $('btn-name-confirm').addEventListener('click', confirmName);
  $('input-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmName(); });
  $('btn-name-back').addEventListener('click', () => showScreen('screen-start'));

  $('btn-levels-back').addEventListener('click', () => showScreen('screen-start'));
  $('btn-help-back').addEventListener('click', () => showScreen('screen-start'));
  $('btn-board-back').addEventListener('click', () => showScreen('screen-start'));

  $('btn-resume').addEventListener('click', togglePause);
  $('btn-quit').addEventListener('click', () => { game.stop(); renderLevels(); showScreen('screen-levels'); });

  $('btn-result-next').addEventListener('click', () => {
    if (!lastResult) { showScreen('screen-start'); return; }
    if (lastResult.outcome === 'over') { startLevel(lastResult.def); return; }
    const next = LEVELS.find((l) => l.id === lastResult.def.id + 1);
    if (next && next.id <= storage.getUnlocked()) startLevel(next);
    else renderBoard('screen-board');
  });
  $('btn-result-menu').addEventListener('click', () => { renderLevels(); showScreen('screen-levels'); });

  // Pause per Tastatur
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' || e.code === 'Escape') { if (game.running) { e.preventDefault(); togglePause(); } }
  });

  // Touch-Steuerung
  const touchEl = $('touch-controls');
  touchEl.querySelectorAll('.touch-btn').forEach((btn) => {
    const key = btn.dataset.key;
    const press = (v) => (e) => { e.preventDefault(); game.setInput(key, v); };
    btn.addEventListener('pointerdown', press(true));
    btn.addEventListener('pointerup', press(false));
    btn.addEventListener('pointerleave', press(false));
    btn.addEventListener('pointercancel', press(false));
  });

  // Steuerungs-Hilfe ein-/ausklappen
  $('ic-toggle').addEventListener('click', () => {
    const box = $('ingame-controls');
    const collapsed = box.classList.toggle('collapsed');
    $('ic-toggle').setAttribute('aria-expanded', String(!collapsed));
  });

  // Prefill Name
  if (storage.getName()) $('input-name').value = storage.getName();
}

wire();
// Einmalig: versehentliche Nummern-Varianten des eigenen Namens lokal aufräumen.
if (storage.getName()) leaderboard.cleanupLocal(storage.getName());
showScreen('screen-start');

/* DOM-HUD: Leben, Score, Temperatur-/Überfüllungs-Meter, Verspätung. */

const el = {};
function cache() {
  if (el.cached) return;
  el.root = document.getElementById('hud');
  el.lives = document.getElementById('hud-lives');
  el.score = document.getElementById('hud-score');
  el.delay = document.getElementById('hud-delay');
  el.temp = document.getElementById('meter-temp');
  el.tempLabel = document.getElementById('meter-temp-label');
  el.progress = document.getElementById('meter-progress');
  el.cached = true;
}

export const hud = {
  show() { cache(); el.root.classList.remove('hidden'); el.root.setAttribute('aria-hidden', 'false'); },
  hide() { cache(); el.root.classList.add('hidden'); el.root.setAttribute('aria-hidden', 'true'); },

  update(state) {
    cache();
    el.lives.textContent = '❤'.repeat(Math.max(0, state.lives));
    el.score.textContent = `${state.score} €`;
    el.delay.textContent = `+${state.delayMinutes} Min`;
    el.tempLabel.textContent = state.tempLabel;
    el.temp.style.width = `${Math.min(100, state.temp)}%`;
    el.temp.style.background = state.tempColor;
    el.progress.style.width = `${Math.round((state.progress || 0) * 100)}%`;
  },
};

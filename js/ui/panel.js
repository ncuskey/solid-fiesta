import { setDaysPerSecond, TIME } from '../core/time.js';
import { emit } from '../core/events.js';

export function initPanel() {
  const statusEl = document.getElementById('status');
  const speedMinusBtn = document.getElementById('speed-minus');
  const speedPlusBtn  = document.getElementById('speed-plus');
  const speedValueEl  = document.getElementById('speed-value');
  const launchBtn     = document.getElementById('launch-btn');
  const upgradeBtn    = document.getElementById('upgrade-btn');

  function renderSpeed(){ speedValueEl.textContent = TIME.daysPerSecond.toFixed(1); }
  renderSpeed();

  speedMinusBtn.onclick = () => { setDaysPerSecond(TIME.daysPerSecond - 0.1); renderSpeed(); };
  speedPlusBtn.onclick  = () => { setDaysPerSecond(TIME.daysPerSecond + 0.1); renderSpeed(); };

  launchBtn.onclick  = () => emit('mission:launch', {});
  upgradeBtn.onclick = () => emit('upgrade:interplanetaryNav', { value: true });

  return { setStatus: (t)=>{ statusEl.textContent = t; } };
}
// panel.js - binds to #ui-panel, buttons, speed control
import { TIME } from '../core/time.js';
export function setupUI(){
  // placeholder
}

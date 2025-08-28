import * as THREE from 'three';
import { createRenderer } from './scene/renderer.js';
import { addLights } from './scene/lights.js';
import { createBodies } from './scene/bodies.js';
import { initPanel } from './ui/panel.js';
import { TIME } from './core/time.js';
import { currentAngularRates } from './math/orbits.js';
import { on, emit } from './core/events.js';
import { setupCameraModes } from './systems/cameraModes.js';
import { updateKinematics } from './systems/kinematics.js';
import { launchMission } from './systems/missions.js';

const container = document.getElementById('game-container');
const { scene, camera, renderer, controls } = createRenderer(container);
const bodies = createBodies(scene);
addLights(scene, bodies.sun);

const panel = initPanel();

on('mission:launch', () => {
  panel.setStatus('Launching Earth → Mars…');
  // start a mission and emit lifecycle events
  const m = launchMission('earth', 'mars');
  emit('mission:started', m);
  setTimeout(() => emit('mission:completed', m), m.duration);
});

function tick(dt) {
  const r = currentAngularRates(TIME.daysPerSecond, TIME.multiplier);
  // keep simple orbital rates but allow systems/kinematics to update scene state
  if (bodies.earthGroup) bodies.earthGroup.rotation.y += r.earth * dt;
  if (bodies.moon) bodies.moon.rotation.y += r.moon * dt;

  // systems-level per-frame updates (currently placeholder)
  try { updateKinematics(bodies, dt); } catch (e) { /* ignore for now */ }

  controls.update();
  renderer.render(scene, camera);
}

let last = performance.now();
function frame(now){
  const dt = (now - last) / 1000; last = now;
  tick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// main.js - thin bootstrap (was app.js’ entry)
// Placeholder bootstrap that will import modularized parts.

export function boot() {
  // Wire camera modes
  const cameraModes = setupCameraModes(camera, controls);

  // Example: focus Earth on startup (no-op if not implemented)
  cameraModes?.focusEarth?.();

  // Wire mission status to panel
  on('mission:started', (m) => panel.setStatus('Mission started'));
  on('mission:completed', (m) => panel.setStatus('Mission complete'));

  // Build a dynamic list of initialized modules
  const initialized = [];
  if (cameraModes) initialized.push('cameraModes');
  // kinematics is a function we call from the frame loop; consider it present if imported
  if (typeof updateKinematics === 'function') initialized.push('kinematics');
  if (typeof launchMission === 'function') initialized.push('missions');

  console.log(`booted modules: ${initialized.join(', ')}`);
}

// Auto-run (keeps current demo behavior until we refactor further)
boot();

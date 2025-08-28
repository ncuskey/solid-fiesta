import * as THREE from 'three';
import { createRenderer } from './scene/renderer.js';
import { addLights } from './scene/lights.js';
import { createBodies } from './scene/bodies.js';
import { initPanel } from './ui/panel.js';
import { TIME } from './core/time.js';
import { currentAngularRates } from './math/orbits.js';
import { on, emit } from './core/events.js';

const container = document.getElementById('game-container');
const { scene, camera, renderer, controls } = createRenderer(container);
const bodies = createBodies(scene);
addLights(scene, bodies.sun);

const panel = initPanel();

on('mission:launch', () => {
  panel.setStatus('Launching Earth → Mars…');
  // TODO: call into systems/missions.js for pathing/visuals
});

function tick(dt) {
  const r = currentAngularRates(TIME.daysPerSecond, TIME.multiplier);
  // simple demo motion (replace with systems/kinematics.js later)
  if (bodies.earthGroup) bodies.earthGroup.rotation.y += r.earth * dt;  // around Sun
  if (bodies.moon) bodies.moon.rotation.y += r.moon * dt;         // orbit Earth (placeholder)

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
  console.log('boot placeholder - wire modules from js/*');
}

// Auto-run (keeps current demo behavior until we refactor further)
boot();

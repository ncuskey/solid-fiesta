import * as THREE from 'three';
import { createRenderer } from './scene/renderer.js';
import { addLights } from './scene/lights.js';
import { createBodies } from './scene/bodies.js';
import { initPanel } from './ui/panel.js';
import { TIME } from './core/time.js';
import { currentAngularRates } from './math/orbits.js';
import { on, emit } from './core/events.js';
import { createParkingArc, createAscentArc, createTransferLine } from './scene/overlays.js';
import { ORBIT, HOHMANN } from './math/constants.js';
import { setupCameraModes } from './systems/cameraModes.js';
import { updateKinematics } from './systems/kinematics.js';
import { launchMission } from './systems/missions.js';

const container = document.getElementById('game-container');
const { scene, camera, renderer, controls } = createRenderer(container);
const bodies = createBodies(scene);
addLights(scene, bodies.sun);

// Overlays: parking orbit, ascent arc, and transfer ellipse
const parking = createParkingArc(scene, ORBIT.segments);
const ascent  = createAscentArc(scene, ORBIT.ascentSegments);
const xfer    = createTransferLine(scene, HOHMANN.segments);

// Helper: world-space position getter
function worldPosOf(obj) {
  const p = new THREE.Vector3();
  if (!obj) return p;
  obj.getWorldPosition(p);
  return p;
}

// Recompute overlay vertex buffers (simple visual placeholders).
// This will be called when missions request a geometry refresh.
function recomputeOverlays() {
  try {
    const earthW = worldPosOf(bodies.earth);
    const moonW  = worldPosOf(bodies.moon);

    // Parking orbit: circle around Earth in XZ
    const parkPos = parking.geometry.getAttribute('position');
    const r = ORBIT.rPark;
    const N = parkPos.count || (parkPos.array.length / 3);
    for (let i = 0; i < N; i++) {
      const a = (i / (N - 1)) * Math.PI * 2;
      const x = earthW.x + r * Math.cos(a);
      const y = earthW.y;
      const z = earthW.z + r * Math.sin(a);
      parkPos.setXYZ(i, x, y, z);
    }
    parkPos.needsUpdate = true;

    // Ascent arc: simple quadratic arc from surface -> parking radius
    const ascPos = ascent.geometry.getAttribute('position');
    const M = ascPos.count || (ascPos.array.length / 3);
    for (let i = 0; i < M; i++) {
      const t = i / (M - 1);
      // start close to Earth, end on parking radius along +X from Earth
      const sx = earthW.x + 0.5; // launch site offset
      const sy = earthW.y + 0.1; // small lift
      const sz = earthW.z;
      const ex = earthW.x + r;
      const ey = earthW.y;
      const ez = earthW.z;
      // simple ease curve and vertical bulge
      const bx = THREE.MathUtils.lerp(sx, ex, t);
      const bz = THREE.MathUtils.lerp(sz, ez, t);
      const by = THREE.MathUtils.lerp(sy, ey, t) + Math.sin(t * Math.PI) * (r * 0.25);
      ascPos.setXYZ(i, bx, by, bz);
    }
    ascPos.needsUpdate = true;

    // Transfer: simple curved line between Earth and Moon (placeholder for Hohmann)
    const xfPos = xfer.geometry.getAttribute('position');
    const K = xfPos.count || (xfPos.array.length / 3);
    for (let i = 0; i < K; i++) {
      const t = i / (K - 1);
      // quadratic interpolation with mid-point bulge
      const mx = (earthW.x + moonW.x) * 0.5;
      const my = Math.max(earthW.y, moonW.y) + 4.0; // visual lift
      const mz = (earthW.z + moonW.z) * 0.5;
      // lerp earth->moon then add bulge towards midpoint
      const lx = THREE.MathUtils.lerp(earthW.x, moonW.x, t);
      const lz = THREE.MathUtils.lerp(earthW.z, moonW.z, t);
      const ly = THREE.MathUtils.lerp(earthW.y, moonW.y, t);
      // bulge factor (peak at t=0.5)
      const bfac = Math.sin(Math.PI * t);
      const px = lx + (mx - lx) * bfac * 0.25;
      const pz = lz + (mz - lz) * bfac * 0.25;
      const py = ly + (my - ly) * bfac * 0.6;
      xfPos.setXYZ(i, px, py, pz);
    }
    xfPos.needsUpdate = true;

    // Ensure dashed line distances are recomputed if supported
    if (xfer.computeLineDistances) xfer.computeLineDistances();
  } catch (e) {
    console.warn('recomputeOverlays failed', e);
  }
}

// Initial compute
recomputeOverlays();

// Update overlays when missions change geometry
on('missions:refresh', () => recomputeOverlays());

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

// Legacy monolith (reference)
// This file preserves the previous single-file application for debugging and
// investigation. The runtime entrypoint is `js/main.js`. See TODO.md for
// migration tasks and rationale.
export function legacyInfo() {
  return {
    message: 'This is a legacy reference copy. Use js/main.js as the runtime entrypoint.',
    todo: '/TODO.md'
  };
}

/*
Paste of original monolith kept here for developers. If you need to inspect
the prior implementation, search repository history or open the archived copy
that existed before migration. The previous contents were large and have been
removed from the live module to ensure this file is syntactically valid.

If you want the full monolith reintroduced for debugging, consider loading
it as a separate 'legacy' bundle or opening it in an editor for offline
inspection.
*/
// Legacy monolith copy: preserved here for reference. Prefer `js/main.js` as the live entrypoint.
// This file intentionally preserves the older single-file app for debugging and
// reference while the app was migrated to a modular layout (see `js/main.js`).
// See TODO.md for remaining migration steps.
// NOTE: The supported camera initializer is `setupCameraModes(camera, controls, getTarget?)`.
// Legacy callers that used `initCameraModes` should migrate to `setupCameraModes`.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TAU, ORBIT, TRANSFER, ENTRY_LEAD_DEG, PARKING_SENSE, HOHMANN } from '../math/constants.js';
import { latLonToLocal } from '../math/geo.js';
import { currentAngularRates } from '../math/orbits.js';
import { TIME, setDaysPerSecond } from '../core/time.js';
import { on, emit } from '../core/events.js';
import { initPanel } from '../ui/panel.js';
import { createParkingArc, createAscentArc, createTransferLine } from '../scene/overlays.js';
import { initMissions } from '../systems/missions.js';

// --- Simulation constants & config (minimal defaults) ---
// Simulation speed: how many simulated days pass per real second
// Set to 0.1 for a slower simulation pace
const TIME = { daysPerSecond: 0.1, multiplier: 1.0 };
// Earth's sidereal day in days
const SIDEREAL_DAY = 0.99726968;

// Convert imported ENTRY_LEAD_DEG -> radians for runtime use
const ENTRY_LEAD = THREE.MathUtils.degToRad(ENTRY_LEAD_DEG);

// UI/status and mission placeholders
let mission = null;

// Initialize UI panel (wires speed controls and buttons)
const panel = initPanel();

// Initialize missions system which listens for mission:launch
const missions = initMissions();

// Route missions status messages to the panel
on('panel:status', (t) => { panel.setStatus(t); });

// When missions request a geometry refresh, call the parking/transfer updater
on('missions:refresh', () => { updateParkingOrbitAndTransfer(); });

// Return current angular rates (rad / real-second) for bodies used in the sim.
// Uses simple fixed orbital periods (days) and the global TIME scale.
// currentAngularRates provided by js/math/orbits.js

// ---------- Scene / Camera / Renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 50, 150);


  // The code above belonged to an internal helper that was split during

/*
Full archived legacy monolith (reference only).

This file contains the original monolithic `app.js` source preserved for
developer inspection. It is intentionally wrapped inside a block comment so
that it cannot accidentally execute if loaded as a module. To inspect the
original code, open this file in an editor and read the contents. If you
want to run the legacy monolith, extract the code into a standalone file
and ensure dependencies (Three.js) are available as globals or adjust the
imports accordingly.

----- BEGIN ARCHIVE -----

// Legacy monolith copy: preserved here for reference. Prefer `js/main.js` as the live entrypoint.
// TODO: see TODO.md for remaining migration steps (validate this copy and remove artifacts).
// Note: camera modes API was standardized to `setupCameraModes(camera, controls, getTarget?)`.
// Legacy comments that previously referenced `initCameraModes` were updated; callers should use `setupCameraModes`.
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

// The rest of the monolith contained many helper functions and per-frame
// geometry builders (updateParkingOrbitAndTransfer, updateHohmannArc_anchored)
// as well as geometry manipulation code. That code was migrated into
// modular systems under `js/scene/` and `js/systems/` during refactor.

----- END ARCHIVE -----

*/

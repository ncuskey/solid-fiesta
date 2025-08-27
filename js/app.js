import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';

// --- Simulation constants & config (minimal defaults) ---
const TAU = Math.PI * 2;
// Simulation speed: how many simulated days pass per real second
// Set to 0.1 for a slower simulation pace
const TIME = { daysPerSecond: 0.1, multiplier: 1.0 };
// Earth's sidereal day in days
const SIDEREAL_DAY = 0.99726968;

// Orbit/visual defaults used by the parking/transfer visuals
const ORBIT = {
  rPark: 4.0,            // two Earth radii parking orbit (scene units)
  segments: 64,
  ascentSegments: 24,
  ascentColor: 0x44ff88,
  orbitColor: 0xffffff
};

const TRANSFER = {
  color: 0x66ccff,
  dashSize: 0.6,
  gapSize: 0.4
};

// Launch insertion downrange lead: positive means downrange/prograde
const LEAD_DOWNRANGE_DEG = 30; // positive means "downrange/prograde"
const LEAD_DOWNRANGE = THREE.MathUtils.degToRad(LEAD_DOWNRANGE_DEG);

// +1 = CCW (prograde), -1 = CW (reverse)
const PARKING_SENSE = -1;

// UI/status and mission placeholders
const statusEl = document.getElementById('status');
let mission = null;

// Return current angular rates (rad / real-second) for bodies used in the sim.
// Uses simple fixed orbital periods (days) and the global TIME scale.
function currentAngularRates() {
  // Periods (days) - simple approximations for the demo
  const moonPeriodDays = 27.321661; // sidereal month
  const earthYearDays  = 365.256;   // sidereal year
  const marsYearDays   = 686.98;    // sidereal Mars year approx

  const scale = TIME.daysPerSecond * (TIME.multiplier ?? 1);
  return {
    moon: (TAU / moonPeriodDays) * scale,
    earth: (TAU / earthYearDays) * scale,
    mars: (TAU / marsYearDays) * scale
  };
}

// ---------- Scene / Camera / Renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 50, 150);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 4;
controls.maxDistance = 300;
// --- Sun + Lights (makes the colored materials actually visible) ---
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(6, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc00 }) // self-lit "glow"
);
sun.position.set(0, 0, 0);
scene.add(sun);

const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

// Bright point light at the Sun so Earth/Moon/Mars shade nicely
const sunLight = new THREE.PointLight(0xffffff, 2.0, 0, 2); // (color, intensity, distance=∞, decay)
sun.add(sunLight);
// topdown follow helpers
const TOPDOWN = { height: 40, polarMax: Math.PI * 0.2, targetLerp: 0.15, camLerp: 0.09 };
const topdownOffsetXZ = new THREE.Vector3(12, 0, 0);

// Helper: return an object's world-space position as a Vector3
function worldPosOf(obj) {
  const p = new THREE.Vector3();
  if (!obj) return p;
  obj.getWorldPosition(p);
  return p;
}

// Helper: convert lat/lon (degrees) + radius -> local Cartesian (Y up)
function latLonToLocal(latDeg, lonDeg, r) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  // latitude: 0 = equator, +90 = north pole. Convert to spherical coordinates
  const x = r * Math.cos(lat) * Math.cos(lon);
  const z = r * Math.cos(lat) * Math.sin(lon);
  const y = r * Math.sin(lat);
  return new THREE.Vector3(x, y, z);
}

// Default pinned sites (lat, lon, radius in scene units)
const EARTH_SITE = { latDeg: 28.5, lonDeg: -80.6, radius: 2.0 }; // Cape Canaveral approx
const MOON_SITE  = { latDeg: 0.67,  lonDeg: 23.47,  radius: 0.5 }; // Tranquility Base-ish

// ---------- UI elements (DOM) ----------
const launchBtn = document.getElementById('launch-btn');
const upgradeBtn = document.getElementById('upgrade-btn');

// Minimal solar system pivots and Earth mesh (created early so later code can reference them)
const solarPivot = new THREE.Object3D();
scene.add(solarPivot);

const earthPivot = new THREE.Object3D();
solarPivot.add(earthPivot);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(2.0, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x2266ff })
);
earth.position.set(30, 0, 0);
earthPivot.add(earth);

const moonPivot = new THREE.Object3D();
earth.add(moonPivot);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xcccccc })
);
moon.position.set(8, 0, 0); // move Moon to 8 (well outside the parking orbit at 4)
moonPivot.add(moon);

// --- Earth launch site marker ---
const earthSiteLocal = latLonToLocal(EARTH_SITE.latDeg, EARTH_SITE.lonDeg, EARTH_SITE.radius);
const earthSite = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0x00ff88 })
);
earthSite.position.copy(earthSiteLocal);
earth.add(earthSite);

// --- Moon landing site marker ---
const moonSiteLocal = latLonToLocal(MOON_SITE.latDeg, MOON_SITE.lonDeg, MOON_SITE.radius);
const moonSite = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xffcc66 })
);
moonSite.position.copy(moonSiteLocal);
moon.add(moonSite);
 
// --- Mars pivot & mesh (restored) ---
const marsPivot = new THREE.Object3D();
solarPivot.add(marsPivot);

const mars = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xff3300 })
);
mars.position.set(50, 0, 0);
marsPivot.add(mars);
// ---------- Hohmann (Earth-site -> Moon-site) — anchored & planar to both sites ----------
const HOHMANN = {
  shipAlt: 0.00,  // start altitude above Earth surface (0 = surface)
  segments: 128,
  color: 0x66ccff,
  dashSize: 0.6,
  gapSize: 0.4,
  moonRate: 2.2   // overwritten in animate()
};

let transferArc, transferGeom, arrivalMarker, waitLine, waitGeom;

function ensureTransferPrimitives() {
  if (!transferArc) {
    transferGeom = new THREE.BufferGeometry();
    transferGeom.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array((HOHMANN.segments + 1) * 3), 3)
    );
    const mat = new THREE.LineDashedMaterial({
      color: HOHMANN.color, dashSize: HOHMANN.dashSize, gapSize: HOHMANN.gapSize,
      transparent: true, opacity: 0.95
    });
    transferArc = new THREE.Line(transferGeom, mat);
    transferArc.computeLineDistances();
    scene.add(transferArc);

    arrivalMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: HOHMANN.color })
    );
    scene.add(arrivalMarker);

    // Optional: faint wait segment (now-site -> launch-time site)
    waitGeom = new THREE.BufferGeometry();
    waitGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    const waitMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    waitLine = new THREE.Line(waitGeom, waitMat);
    scene.add(waitLine);
  }
}

// ===== Lines/geometry for ascent, parking-arc, transfer-arc =====
let ascentLine, ascentGeom;
let waitArcLine, waitArcGeom;
let transferLine, transferGeom2, arrivalMarker2;

function ensureTrajectoryPrimitives() {
  if (!ascentLine) {
    ascentGeom = new THREE.BufferGeometry();
    ascentGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ORBIT.ascentSegments+1)*3), 3));
    const mat = new THREE.LineBasicMaterial({ color: ORBIT.ascentColor, transparent:true, opacity:0.8 });
    ascentLine = new THREE.Line(ascentGeom, mat);
    scene.add(ascentLine);
  }
  if (!waitArcLine) {
    waitArcGeom = new THREE.BufferGeometry();
    waitArcGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ORBIT.segments+1)*3), 3));
    const mat = new THREE.LineBasicMaterial({ color: ORBIT.orbitColor, transparent:true, opacity:0.45 });
    waitArcLine = new THREE.Line(waitArcGeom, mat);
    scene.add(waitArcLine);
  }
  if (!transferLine) {
    transferGeom2 = new THREE.BufferGeometry();
    transferGeom2.setAttribute('position', new THREE.BufferAttribute(new Float32Array((128+1)*3), 3));
    const mat = new THREE.LineDashedMaterial({
      color: TRANSFER.color, dashSize: TRANSFER.dashSize, gapSize: TRANSFER.gapSize,
      transparent: true, opacity: 0.95
    });
    transferLine = new THREE.Line(transferGeom2, mat);
    transferLine.computeLineDistances();
    scene.add(transferLine);

    arrivalMarker2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: TRANSFER.color })
    );
    scene.add(arrivalMarker2);
  }
}

// Parking orbit + transfer solver called every frame
// === WORK-BACKWARDS: ascent (fixed), parking (variable), transfer (fixed endpoints) ===
function updateParkingOrbitAndTransfer() {
  ensureTrajectoryPrimitives();

  // State "now"
  const earthW = worldPosOf(earth);
  const w      = currentAngularRates();
  const n_spinE = (TAU / SIDEREAL_DAY) * (TIME.daysPerSecond * TIME.multiplier);
  const n_moon  = w.moon;

  // parking / angle temporaries (declared here so outer logging can access them)
  let burnDir = null;
  let s_raw = 0, s = 0, dPhi = 0;

  // Earth site inertial angle NOW (about +Y)
  const earthSiteNowLocalRot = earthSite.position.clone().applyAxisAngle(new THREE.Vector3(0,1,0), earth.rotation.y);
  const thetaE_now = angleXZ(earthSiteNowLocalRot);

  // Moon site vector NOW from Earth's center, and its angle
  const moonOrbitLocal = moon.position.clone(); // ~ (4,0,0)
  const moonSiteLocal2  = moonSite.position.clone();
  const moonSiteNowEC  = rotY(moonOrbitLocal.clone().add(moonSiteLocal2), moonPivot.rotation.y);
  const thetaM_now     = angleXZ(moonSiteNowEC);

  // Earth-centered mu chosen to match lunar mean motion at rMoonCenter
  const r1 = ORBIT.rPark;
  const rMoonCenter = moon.position.length();
  const mu = (n_moon*n_moon) * (rMoonCenter**3);

  // Parking mean motion
  const n_park = Math.sqrt(mu / (r1*r1*r1));

  // Simple (short) ascent time (real seconds); tweak if you like
  const ascentDays = 0.02;           // ~29 minutes of sim-time
  const t_ascent   = ascentDays / (TIME.daysPerSecond); // real seconds

  // ---- Work backwards: iterate to self-consistent {wait, tof, burn-peri axis} ----
  // Start with a guess: assume arrival happens if we burned "soon" along current geometry
  let wait = 0, tof = hohmannTOF(r1, moonSiteNowEC.length(), mu);

  for (let iter=0; iter<3; iter++) {
    // Predict the Moon site angle at arrival
    const thetaM_arr = thetaM_now + n_moon * (t_ascent + wait + tof);

    // Burn (periapsis) direction must be opposite the arrival direction
    //   u = -normalize( MoonSite_EC(theta_arr) ) projected in XZ plane
    const r2VecArr   = rotY(moonOrbitLocal.clone().add(moonSiteLocal2), thetaM_arr);
    const uVec       = new THREE.Vector3(r2VecArr.x, 0, r2VecArr.z).normalize().multiplyScalar(-1);
    const theta_burn = angleXZ(uVec);

    // Entry angle: Earth site after ascent
    const theta_entry = thetaE_now + n_spinE * t_ascent;

    // Required positive rotation along circular parking to reach burn
    const dPhi = wrap2Pi(theta_burn - theta_entry);

    // Wait along parking orbit (real seconds)
    wait = dPhi / n_park;

    // With this wait, recompute arrival vector magnitude and refine TOF
    const thetaM_arr2 = thetaM_now + n_moon * (t_ascent + wait + tof);
    const r2VecArr2   = rotY(moonOrbitLocal.clone().add(moonSiteLocal2), thetaM_arr2);
    const r2          = r2VecArr2.length();
    tof = hohmannTOF(r1, r2, mu);
  }

  // Final arrival and burn geometry
  const thetaM_arr_final = thetaM_now + n_moon * (t_ascent + wait + tof);
  const r2VecArr_final   = rotY(moonOrbitLocal.clone().add(moonSiteLocal2), thetaM_arr_final);
  const r2               = r2VecArr_final.length();

  // Periapsis unit (burn) and in-plane basis
  const u = new THREE.Vector3(r2VecArr_final.x, 0, r2VecArr_final.z).normalize().multiplyScalar(-1); // +u = peri
  const v = new THREE.Vector3(0,1,0).cross(u).normalize();                                           // 90° ahead

  // --- 1) TRANSFER ellipse (anchored to Moon site + Earth parking burn) ---
  {
    // Arrival point is the actual Moon landing site *right now* (anchored to the orange dot).
    // This keeps the transfer visually glued to the marker; only the parking arc length changes.
    const pArrive = worldPosOf(moonSite);
    const r2 = pArrive.clone().sub(earthW).length();

    // Periapsis (burn) direction: opposite the Moon site direction, flattened to the ecliptic
    const u = pArrive.clone().sub(earthW).setY(0).normalize().multiplyScalar(-1); // periapsis radial
    const v = new THREE.Vector3(0,1,0).cross(u).normalize();                       // 90° ahead in-plane

    // Save u,v for the parking-arc section below
    const uvForParking = { u, v };

    const a = 0.5*(r1 + r2);
    const e = (r2 - r1) / (r2 + r1);

    const pos = transferGeom2.getAttribute('position');
    const N = 128;
    for (let i=0;i<=N;i++){
      const nu = (i/N)*Math.PI; // 0..π
      const r  = (a*(1-e*e)) / (1 + e*Math.cos(nu));
      const dir = u.clone().multiplyScalar(Math.cos(nu)).add(v.clone().multiplyScalar(Math.sin(nu)));
      const p = earthW.clone().add(dir.multiplyScalar(r));
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    // Pin endpoints EXACTLY
    const pBurn = earthW.clone().add(u.clone().multiplyScalar(r1));
    pos.setXYZ(0, pBurn.x, pBurn.y, pBurn.z);
    pos.setXYZ(N, pArrive.x, pArrive.y, pArrive.z);
    pos.needsUpdate = true;
    transferLine.computeLineDistances();
    arrivalMarker2.position.copy(pArrive);

    // Stash u,v on the function scope so the parking-arc block can use them
    updateParkingOrbitAndTransfer._uv = uvForParking;
  }
  // --- Unified entry direction (prograde = CCW about +Y) ---
  // --- Entry direction (prograde = CCW) + tangent ---
  const theta_base   = thetaE_now + n_spinE * t_ascent;                      // site azimuth at insertion
  const r_hat_base   = new THREE.Vector3(Math.cos(theta_base), 0, Math.sin(theta_base));
  // downrange lead = CCW about +Y (flip sign so positive LEAD_DOWNRANGE matches previous -30)
  const entryDir     = rotY(r_hat_base.clone(), -LEAD_DOWNRANGE).normalize();
  // prograde tangent at entry = entry × +Y  (== (-entry.z, 0, entry.x))
  const t_hat_entry  = new THREE.Vector3(-entryDir.z, 0, entryDir.x).normalize();

  // --- 2) PARKING-ORBIT arc (variable length only) ---
  {
    // REQUIRE: entryDir, t_hat_entry, earthW, r1 defined above
    const pos = waitArcGeom.getAttribute('position');
    const N = ORBIT.segments;

    // 1) Get burn direction in XZ (periapsis radial). Prefer transfer.u; else derive from Moon site.
    let burnDir;
    if (updateParkingOrbitAndTransfer._uv && updateParkingOrbitAndTransfer._uv.u) {
      const u = updateParkingOrbitAndTransfer._uv.u;
      burnDir = new THREE.Vector3(u.x, 0, u.z).normalize();
    } else {
      // Fallback: opposite of Earth→MoonSite (so periapsis points "away" from arrival)
      const moonSiteW = worldPosOf(moonSite);
      burnDir = moonSiteW.clone().sub(earthW).setY(0).normalize().multiplyScalar(-1);
    }
    if (!isFinite(burnDir.lengthSq()) || burnDir.lengthSq() < 1e-12) {
      // nothing sensible to draw this frame
      pos.getAttribute && (pos.needsUpdate = true);
    } else {

        // 2) Compute CCW angle entry→burn (0..2π)
        const dPhiCCW = angleCCW_XZ(entryDir, burnDir);  // [0, 2π) CCW angle entry -> burn
        const sweep = (PARKING_SENSE === 1)
          ? dPhiCCW                    // CCW (prograde)
          : -(TAU - dPhiCCW);          // CW (reverse) with the *correct* magnitude

        for (let i = 0; i <= ORBIT.segments; i++) {
          const phi = (i / ORBIT.segments) * sweep;      // rotate about +Y
          const dir = rotY(entryDir.clone(), phi).normalize();
          const p   = earthW.clone().add(dir.multiplyScalar(r1));
          waitArcGeom.attributes.position.setXYZ(i, p.x, p.y, p.z);
        }
        waitArcGeom.attributes.position.needsUpdate = true;

        // keep existing endpoint snaps (pEntry and pBurn)
        const pEntry = earthW.clone().add(entryDir.clone().multiplyScalar(r1));
        const pBurn  = earthW.clone().add(burnDir.clone().multiplyScalar(r1));
        pos.setXYZ(0, pEntry.x, pEntry.y, pEntry.z);
        pos.setXYZ(N, pBurn.x,  pBurn.y,  pBurn.z);

      // (optional) quick sanity log: should be ~ +1 if the arc starts prograde
      // const P0 = new THREE.Vector3(pos.getX(0), pos.getY(0), pos.getZ(0));
      // const P1 = new THREE.Vector3(pos.getX(1), pos.getY(1), pos.getZ(1));
      // console.debug('[ParkingArc] tan·prograde ≈', P1.clone().sub(P0).normalize().dot(t_hat_entry).toFixed(3));
    }
  }

  // Ensure burnDir and angle diagnostics are available in outer scope for logging
  // (these variables are declared earlier in function scope)

  // Small one-time angle debug useful to diagnose CCW/CW selection
  if (!updateParkingOrbitAndTransfer._angleLogged) {
    updateParkingOrbitAndTransfer._angleLogged = true;
    try {
      const theta_entry = angleXZ(entryDir);
      const theta_burn  = angleXZ(burnDir);
      const deg = (r) => (r * 180/Math.PI).toFixed(2);
      console.log('[HohmannDBG-ANG]', 'theta_entry deg', deg(theta_entry), 'theta_burn deg', deg(theta_burn));
      console.log('[HohmannDBG-ANG]', 'chosen dPhi deg', deg(dPhi));
    } catch (e) {
      console.warn('[HohmannDBG-ANG] failed', e);
    }
  }

  // --- 3) ASCENT arc (single circular arc; tangent-parallel at entry) ---
  {
    // Entry radial (already prograde-led) and points
    const r_hat_entry = entryDir.clone(); // unit, in XZ
    const pEntry = earthW.clone().add(r_hat_entry.clone().multiplyScalar(r1));
    const pStart = worldPosOf(earthSite);

    const pos = ascentGeom.getAttribute('position');
    const N = ORBIT.ascentSegments;

    // --- Solve circle center on the line pEntry + s * r_hat_entry so:
    // |pStart - (pEntry + s r_hat)| = |s|
    const d = pStart.clone().sub(pEntry);              // vector from entry to start
    const denom = 2 * d.dot(r_hat_entry);              // 2 d·r̂
    let s;
    if (Math.abs(denom) < 1e-6) {
      // Degenerate geometry; fall back to a mild default
      s = (r1 - EARTH_SITE.radius) * 0.6;
    } else {
      s = d.lengthSq() / denom;
    }
    const C = pEntry.clone().add(r_hat_entry.clone().multiplyScalar(s)); // circle center
    const R = C.distanceTo(pEntry);                                      // circle radius

    // Angles about C for start/end
    const angStart = Math.atan2(pStart.z - C.z, pStart.x - C.x);
    const angEnd   = Math.atan2(pEntry.z - C.z, pEntry.x - C.x);

    // Choose direction that makes the END tangent prograde
    const radialEnd = pEntry.clone().sub(C).normalize();
    const tanCCW    = new THREE.Vector3(-radialEnd.z, 0, radialEnd.x).normalize(); // CCW tangent
    const useCCW    = tanCCW.dot(t_hat_entry) >= 0;
    const delta     = useCCW ? wrap2Pi(angEnd - angStart) : -wrap2Pi(angStart - angEnd);

    // Draw the arc; blend Y smoothly from start to entry
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const ang = angStart + t * delta;
      const x = C.x + R * Math.cos(ang);
      const z = C.z + R * Math.sin(ang);
      const y = THREE.MathUtils.lerp(pStart.y, pEntry.y, t * t * (3 - 2 * t)); // smoothstep
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  // Telemetry (sim-days)
  // One-time debug logging to help verify geometry and directions in the browser console
  if (!updateParkingOrbitAndTransfer._logged) {
    updateParkingOrbitAndTransfer._logged = true;
    try {
      const dbg = (label, ...vals) => console.log('[HohmannDBG]', label, ...vals);

      const pEntryW = earthW.clone().add(entryDir.clone().multiplyScalar(r1));
      const { u: uv_u, v: uv_v } = updateParkingOrbitAndTransfer._uv || { u: null, v: null };
      const moonSiteW = worldPosOf(moonSite);

      dbg('earthW', earthW);
      dbg('moonSiteW', moonSiteW);
      dbg('entryDir (local XZ)', entryDir);
      dbg('t_hat_entry (prograde)', t_hat_entry);
      dbg('pEntryW', pEntryW);

      // burn/transfer
      const burnDirDbg = (typeof burnDir !== 'undefined') ? burnDir : (uv_u ? uv_u.clone().normalize() : null);
      const pBurnW = earthW.clone().add((burnDirDbg || new THREE.Vector3()).clone().multiplyScalar(r1));
      dbg('burnDir', burnDirDbg);
      dbg('pBurnW', pBurnW);

      if (uv_u) dbg('transfer.u', uv_u, 'transfer.v', uv_v);

      // Sample a few vertices from the parking and ascent geometries (first, mid, last)
      function sampleAttr(attr, name) {
        if (!attr) return dbg(name, 'missing');
        const cnt = attr.count || (attr.array ? (attr.array.length/3) : 0);
        if (cnt === 0) return dbg(name, 'empty');
        const get = (i) => new THREE.Vector3(attr.getX(i), attr.getY(i), attr.getZ(i));
        const mid = Math.floor((cnt-1)/2);
        dbg(name, { first: get(0), mid: get(mid), last: get(cnt-1), count: cnt });
      }
      sampleAttr(waitArcGeom.getAttribute('position'), 'waitArc');
      sampleAttr(ascentGeom.getAttribute('position'), 'ascent');
    } catch (e) {
      console.warn('[HohmannDBG] debug log failed', e);
    }
  }

  return {
    waitDays: wait * TIME.daysPerSecond,
    tofDays:  tof  * TIME.daysPerSecond,
    totalDays: (wait+tof) * TIME.daysPerSecond
  };
}

function wrap2Pi(a){ a%=TAU; return a<0?a+TAU:a; }
function wrapPi(a){ a=(a+Math.PI)%TAU; if(a<0)a+=TAU; return a-Math.PI; }
function angleXZ(v){ if(!v) return 0; return Math.atan2(v.z, v.x); }
function rotY(v, ang){
  const c = Math.cos(ang), s = Math.sin(ang);
  return new THREE.Vector3(c*v.x - s*v.z, v.y, s*v.x + c*v.z);
}

// CCW angle from vector a -> b in the XZ plane, result in [0, 2π)
function angleCCW_XZ(a, b) {
  const x1=a.x, z1=a.z, x2=b.x, z2=b.z;
  const dot = x1*x2 + z1*z2;          // cos(theta)
  const det = x1*z2 - z1*x2;          // sin(theta) (y component of cross)
  return wrap2Pi(Math.atan2(det, dot));
}

// CW angle from a -> b in XZ plane
function angleCW_XZ(a, b) { return angleCCW_XZ(b, a); }

function toXZunit(v) {
  return new THREE.Vector3(v.x, 0, v.z).normalize();
}
const DEG = r => (r*180/Math.PI);

// Minimal hohmann time-of-flight between radii r1 and r2 with parameter mu
function hohmannTOF(r1, r2, mu){
  const a = 0.5*(r1+r2);
  return Math.PI * Math.sqrt((a*a*a)/mu);
}

/**
 * Rebuild an ellipse *each frame* so the arc always connects:
 *  - Start = Earth site at launch time (after wait)
 *  - End   = Moon site at arrival time (wait + TOF)
 * The ellipse is drawn in the plane spanned by those two future site vectors.
 */
function updateHohmannArc_anchored() {
  ensureTransferPrimitives();

  // 0) Snapshot “now”
  const earthW_now = worldPosOf(earth);

  // Site local vectors (fixed on bodies)
  const earthSiteLocal = latLonToLocal(EARTH_SITE.latDeg, EARTH_SITE.lonDeg, EARTH_SITE.radius);
  const moonSiteLocal  = latLonToLocal(MOON_SITE.latDeg,  MOON_SITE.lonDeg,  MOON_SITE.radius);

  // Rates (rad / real-second)
  const w = currentAngularRates();
  const n_moon  = HOHMANN.moonRate;               // orbit of Moon about Earth
  const n_spinE = (TAU / SIDEREAL_DAY) * (TIME.daysPerSecond * TIME.multiplier); // Earth spin

  // Current site angles (from Earth's center)
  const thetaE_now = angleXZ(earthSiteLocal.clone().applyAxisAngle(new THREE.Vector3(0,1,0), earth.rotation.y));
  const moonOrbitLocal = moon.position.clone();   // center-to-moon (e.g., 4,0,0)
  const moonSiteNowEC  = rotY(moonOrbitLocal.clone().add(moonSiteLocal), moonPivot.rotation.y);
  const thetaM_now     = angleXZ(moonSiteNowEC);

  // Radii
  const r1 = EARTH_SITE.radius + HOHMANN.shipAlt;

  // µ chosen to match the sim’s lunar mean motion: n_moon^2 = µ / r_moonCenter^3
  const rMoonCenter = moonOrbitLocal.length();
  const mu = (n_moon*n_moon) * (rMoonCenter**3);

  // First guess TOF using r2 at "now", then we’ll refine after predicting arrival
  let r2_guess = moonSiteNowEC.length();
  let tof = hohmannTOF(r1, r2_guess, mu);

  // Solve wait so: θM(now) + n_moon*(wait+tof)  ≡  θE(now) + n_spinE*wait + π  (mod 2π)
  const phi_req = wrap2Pi(Math.PI - n_moon * tof);
  const phi_now = wrap2Pi(thetaM_now - thetaE_now);
  const denom = n_moon - n_spinE;
  let wait = Math.abs(denom) < 1e-9 ? 0 : wrap2Pi(phi_req - phi_now) / denom;

  // Predict arrival Moon-site, refine TOF with its actual radius
  const thetaM_arr = moonPivot.rotation.y + n_moon * (wait + tof);
  const r2VecArr   = rotY(moonOrbitLocal.clone().add(moonSiteLocal), thetaM_arr);
  const r2         = r2VecArr.length();
  tof = hohmannTOF(r1, r2, mu);

  // Re-solve wait using refined TOF
  const phi_req2 = wrap2Pi(Math.PI - n_moon * tof);
  wait = Math.abs(denom) < 1e-9 ? 0 : wrap2Pi(phi_req2 - phi_now) / denom;

  // 1) Future endpoint vectors from Earth's center (Earth’s *launch* site & Moon’s *arrival* site)
  const theta_launch = thetaE_now + n_spinE * wait;
  const r1_launch_ec = new THREE.Vector3(Math.cos(theta_launch)*r1, 0, Math.sin(theta_launch)*r1);

  const theta_arr    = thetaM_now + n_moon * (wait + tof);
  const r2_arr_ec    = rotY(moonOrbitLocal.clone().add(moonSiteLocal), theta_arr);

  // 2) Build plane basis that contains both endpoints
  const u = r1_launch_ec.clone().normalize();           // periapsis direction
  let n = new THREE.Vector3().crossVectors(r1_launch_ec, r2_arr_ec);
  const nLen = n.length();
  if (nLen < 1e-6) {
    // nearly colinear: pick a stable normal not parallel to u
    const up = Math.abs(u.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
    n = new THREE.Vector3().crossVectors(u, up).normalize();
  } else {
    n.normalize();
  }
  const v = new THREE.Vector3().crossVectors(n, u).normalize();  // quadrant basis inside the plane

  // 3) Ellipse geometry (periapsis at +u, apoapsis at -u)
  const a = 0.5*(r1 + r2);
  const e = (r2 - r1) / (r2 + r1);

  const pos = transferGeom.getAttribute('position');
  for (let i = 0; i <= HOHMANN.segments; i++) {
    const nu = (i / HOHMANN.segments) * Math.PI;        // true anomaly 0..π
    const r  = (a * (1 - e*e)) / (1 + e * Math.cos(nu));
    const dir = u.clone().multiplyScalar(Math.cos(nu)).add(
                v.clone().multiplyScalar(Math.sin(nu)));
    const p = dir.multiplyScalar(r).add(earthW_now);
    pos.setXYZ(i, p.x, p.y, p.z);
  }

  // 4) Pin endpoints EXACTLY to the sites (robust snap)
  const pLaunchW = earthW_now.clone().add(r1_launch_ec);
  pos.setXYZ(0, pLaunchW.x, pLaunchW.y, pLaunchW.z);

  const pArriveW = earthW_now.clone().add(r2_arr_ec);
  pos.setXYZ(HOHMANN.segments, pArriveW.x, pArriveW.y, pArriveW.z);

  pos.needsUpdate = true;
  transferArc.computeLineDistances();

  // arrival marker
  arrivalMarker.position.copy(pArriveW);

  // wait line (now-site -> launch-time site)
  {
    const earthSiteNowW = worldPosOf(earthSite);
    const wpos = waitGeom.getAttribute('position');
    wpos.setXYZ(0, earthSiteNowW.x, earthSiteNowW.y, earthSiteNowW.z);
    wpos.setXYZ(1, pLaunchW.x,      pLaunchW.y,      pLaunchW.z);
    wpos.needsUpdate = true;
  }

  return { tof, wait, total: wait + tof };
}

// ---------- Camera Stages & Tweens (re-added) ----------
const STAGE = { EARTH_MOON: 0, INNER_SYSTEM: 1 };
let stage = STAGE.EARTH_MOON;

let camTween = null; // {t0, dur, startPos, endPos, startTarget, endTarget}
function easeInOutCubic(u){ return u < 0.5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3)/2; }

function startCameraTween({ fromPos, toPos, fromTarget, toTarget, duration = 1200 }) {
  camTween = {
    t0: performance.now(),
    dur: duration,
    startPos: fromPos.clone(),
    endPos: toPos.clone(),
    startTarget: fromTarget.clone(),
    endTarget: toTarget.clone()
  };
}

function niceDir() {
  // pleasant angle above the ecliptic
  return new THREE.Vector3(0.4, 0.35, 0.85).normalize();
}

function focusEarth(instant=false) {
  stage = STAGE.EARTH_MOON;
  // Clamp zoom tighter for close work
  controls.minDistance = 4;
  controls.maxDistance = 40;

  // clamp polar to top-down and allow free azimuth
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = TOPDOWN.polarMax;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;

  const target = worldPosOf(earth);
  // Compute the fixed horizontal offset (XZ) from current camera->target.
  topdownOffsetXZ.copy(camera.position).sub(target);
  topdownOffsetXZ.y = 0;
  if (topdownOffsetXZ.lengthSq() < 1e-3) topdownOffsetXZ.set(12, 0, 0); // sensible default

  const destPos = target.clone().add(topdownOffsetXZ).add(new THREE.Vector3(0, TOPDOWN.height, 0));

  if (instant) {
    controls.target.copy(target);
    camera.position.copy(destPos);
    return;
  }
  startCameraTween({
    fromPos: camera.position,
    toPos: destPos,
    fromTarget: controls.target,
    toTarget: target,
    duration: 1200
  });
}

function focusInnerSystem() {
  stage = STAGE.INNER_SYSTEM;
  // Wider zoom range
  controls.minDistance = 40;
  controls.maxDistance = 300;

  // restore near-full polar freedom and allow free azimuth
  controls.minPolarAngle = 0.01;
  controls.maxPolarAngle = Math.PI - 0.01;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;

  const target = new THREE.Vector3(0, 0, 0); // Sun/system center
  // compute current azimuth around Y so we keep a similar heading when tilting
  const currentDir = camera.position.clone().sub(controls.target).normalize();
  if (!isFinite(currentDir.length())) currentDir.copy(niceDir());
  const azimuth = Math.atan2(currentDir.z, currentDir.x);
  const polar = Math.PI / 6; // 30 degree tilt above the ecliptic
  const cosP = Math.cos(polar);
  // new direction expressed with given polar and azimuth (y = sin(polar))
  const newDir = new THREE.Vector3(
    cosP * Math.cos(azimuth),
    Math.sin(polar),
    cosP * Math.sin(azimuth)
  ).normalize();
  const distance = 140;
  const destPos = target.clone().add(newDir.multiplyScalar(distance));

  startCameraTween({
    fromPos: camera.position,
    toPos: destPos,
    fromTarget: controls.target,
    toTarget: target,
    duration: 1200
  });
}

// button to simulate upgrade unlock
upgradeBtn?.addEventListener('click', () => {
  statusEl.textContent = 'Upgrade acquired: Interplanetary Navigation';
  focusInnerSystem();
});

// Initial focus on Earth–Moon
focusEarth(true);

// ---------- Resize ----------
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// ---------- Animate ----------
const clock = new THREE.Clock();
let eAngle = 0, mAngle = 0, moonAngle = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  // derive current angular rates (rad / real-second) from orbital periods + time scale
  const w = currentAngularRates();
  eAngle    += w.earth * dt;
  mAngle    += w.mars  * dt;
  moonAngle += w.moon  * dt;
  earthPivot.rotation.y = eAngle;
  marsPivot.rotation.y  = mAngle;
  moonPivot.rotation.y  = moonAngle;

  // Earth spins once per sidereal day (self-rotation) so a fixed launch site sweeps beneath
  const wEarthSpin = (TAU / SIDEREAL_DAY) * (TIME.daysPerSecond * TIME.multiplier);
  earth.rotation.y += wEarthSpin * dt;

  // keep Hohmann viz in sync with current sim rate
  HOHMANN.moonRate = currentAngularRates().moon;

  // Camera tween update
  if (camTween) {
    const u = Math.min((performance.now() - camTween.t0) / camTween.dur, 1);
    const s = easeInOutCubic(u);
    controls.target.copy(camTween.startTarget.clone().lerp(camTween.endTarget, s));
    camera.position.copy(camTween.startPos.clone().lerp(camTween.endPos, s));
    if (u >= 1) camTween = null;
  }

  // While in Earth-Moon stage and not tweening, TOPDOWN follow of Earth
  if (stage === STAGE.EARTH_MOON && !camTween) {
    const target = worldPosOf(earth);
    controls.target.lerp(target, TOPDOWN.targetLerp);
    // desired camera position keeps the same XZ offset from Earth so the
    // camera's facing direction in world-space is constant as Earth orbits.
    const desiredPos = target.clone().add(topdownOffsetXZ).setY(TOPDOWN.height);
    camera.position.lerp(desiredPos, TOPDOWN.camLerp);
  }
  // Ensure starfield is world-anchored so it rotates naturally as the system moves
  if (typeof starfield !== 'undefined') starfield.position.set(0,0,0);
  
  // Mission update
  if (mission) {
    const elapsed = performance.now() - mission.start;
    const u = Math.min(elapsed / mission.duration, 1);
    const s = u * u * (3 - 2 * u);
    ship.position.lerpVectors(mission.startPos, mission.endPos, s);

    statusEl.textContent = u < 1
      ? `Mission in progress: ${(u * 100).toFixed(0)}%`
      : 'Mission complete';

    if (u >= 1) mission = null;
  }

  // --- Live Parking→Transfer update ---
  const telem = updateParkingOrbitAndTransfer();
  if (statusEl) {
    statusEl.textContent =
      `Parking→Transfer · Wait ${telem.waitDays.toFixed(2)} d  · ` +
      `TOF ${telem.tofDays.toFixed(2)} d  · Total ${telem.totalDays.toFixed(2)} d`;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

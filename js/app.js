import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';

// ---------- Scene / Camera / Renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 50, 150);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// ---------- UI elements (DOM) ----------
const launchBtn = document.getElementById('launch-btn');
const upgradeBtn = document.getElementById('upgrade-btn');
const statusEl   = document.getElementById('status');

// Simple helper to get an object's world position
function worldPosOf(obj) {
  const v = new THREE.Vector3();
  return obj.getWorldPosition(v);
}

// ---------- Ship / mission ----------
const ship = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
ship.visible = false;
scene.add(ship);

let mission = null; // { start, duration, startPos, endPos }

launchBtn?.addEventListener('click', () => {
  const startPos = worldPosOf(earth);
  const endPos   = worldPosOf(mars); // sample at launch
  mission = {
    start: performance.now(),
    duration: 30000, // 30s demo
    startPos, endPos
  };
  ship.position.copy(startPos);
  ship.visible = true;
  statusEl.textContent = 'Launching ship from Earth to Mars...';
});

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// start focused on Earth-Moon with tighter zoom
controls.minDistance = 4;
controls.maxDistance = 40;

// TOP-DOWN follow config
const TOPDOWN = { height: 22, targetLerp: 0.30, camLerp: 0.18, polarMax: 0.35 };
// Fixed horizontal (XZ) offset so we keep the same world-facing direction as Earth moves.
let topdownOffsetXZ = new THREE.Vector3();

// --- Time & orbital periods ---
const TAU = Math.PI * 2;

// set sim speed: ~1 sim-day every real second (was 1 day / 5s)
const TIME = {
  daysPerSecond: 0.5,    // 0.5 sim-days per real second (slower)
  multiplier: 1.0        // live knob if you want to speed up/down later
};

// orbital periods in days (sidereal month => correct *orbits/year*)
const PERIOD = {
  earth: 365.25,
  moon:  27.321661,
  mars:  686.98
};

// compute angular rates (rad / real-second) from periods + time scale
function currentAngularRates() {
  const s = TIME.daysPerSecond * TIME.multiplier; // sim-days per real-second
  return {
    earth: TAU / PERIOD.earth * s,
    moon:  TAU / PERIOD.moon  * s,
    mars:  TAU / PERIOD.mars  * s
  };
}

// ---- Site config (edit lat/lon to taste; longitude: +E, -W) ----
const EARTH_SITE = { latDeg: 28.5,  lonDeg: -80.6,  radius: 2.0 };   // ~Cape Canaveral
const MOON_SITE  = { latDeg:  0.67, lonDeg:  23.47, radius: 0.5 };   // ~Tranquility Base

// Sidereal day for Earth's self-rotation (days)
const SIDEREAL_DAY = 0.99726968;

// lat/lon -> local space on a Y-up sphere (x = r cosφ cosλ, y = r sinφ, z = r cosφ sinλ)
function latLonToLocal(latDeg, lonDeg, r) {
  const φ = THREE.MathUtils.degToRad(latDeg);
  const λ = THREE.MathUtils.degToRad(lonDeg);
  const c = Math.cos(φ);
  return new THREE.Vector3(r * c * Math.cos(λ), r * Math.sin(φ), r * c * Math.sin(λ));
}

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const pointLight = new THREE.PointLight(0xffffff, 1.2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// ---------- Sun ----------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(8, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffcc00 })
);
scene.add(sun);

// ---------- Starfield ----------
function addStars(count = 1500, spread = 900) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = spread * (0.25 + Math.random() * 0.75);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 0.8, sizeAttenuation: true, color: 0xffffff });
  const pts = new THREE.Points(g, m);
  scene.add(pts);
  return pts;
}
const starfield = addStars();

// ---------- Pivots & Planets ----------
const solarPivot = new THREE.Object3D(); // Sun at origin
scene.add(solarPivot);

const earthPivot = new THREE.Object3D();
solarPivot.add(earthPivot);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(2, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x3366ff })
);
earth.position.set(30, 0, 0);
earthPivot.add(earth);

const moonPivot = new THREE.Object3D();
earth.add(moonPivot);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xcccccc })
);
moon.position.set(4, 0, 0);
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
// ---------- Hohmann (Earth-site -> Moon-site) ANCHORED ----------
const HOHMANN = {
  shipAlt: 0.00,  // start altitude above Earth surface (0 = surface)
  segments: 128,
  color: 0x66ccff,
  dashSize: 0.6,
  gapSize: 0.4,
  moonRate: 2.2   // will be overwritten each frame from sim rates
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

    // faint "wait" segment (current site -> future launch site)
    waitGeom = new THREE.BufferGeometry();
    waitGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    const waitMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    waitLine = new THREE.Line(waitGeom, waitMat);
    scene.add(waitLine);
  }
}

function wrap2Pi(a){ a%=2*Math.PI; return a<0?a+2*Math.PI:a; }
function wrapPi(a){ a=(a+Math.PI)%(2*Math.PI); if(a<0)a+=2*Math.PI; return a-Math.PI; }
function angleXZ(v){ return Math.atan2(v.z, v.x); }
function rotY(v, ang){
  const c = Math.cos(ang), s = Math.sin(ang);
  return new THREE.Vector3(c*v.x - s*v.z, v.y, s*v.x + c*v.z);
}

/**
 * Build a Hohmann arc that *truly* connects:
 *   - Start: Earth launch site at t_launch (after wait)
 *   - End:   Moon landing site at t_arr = t_launch + TOF
 *
 * We solve the phase condition with *both* Earth spin and Moon orbital motion:
 *   φ_now = θ_moonSite_now - θ_earthSite_now
 *   φ_req = π - n_moon * TOF
 *   φ_now + (n_moon - n_spinE) * wait = φ_req   (mod 2π)
 */
function updateHohmannArc_anchored() {
  ensureTransferPrimitives();

  // --- World centers now
  const earthW_now = worldPosOf(earth);

  // --- Site local vectors (fixed on bodies)
  const earthSiteLocal = latLonToLocal(EARTH_SITE.latDeg, EARTH_SITE.lonDeg, EARTH_SITE.radius);
  const moonSiteLocal  = latLonToLocal(MOON_SITE.latDeg,  MOON_SITE.lonDeg,  MOON_SITE.radius);

  // --- Current angles/rates
  const w = currentAngularRates();   // rad / real-sec
  const n_moon  = HOHMANN.moonRate;  // already kept in sync in animate()
  const n_spinE = (TAU / SIDEREAL_DAY) * (TIME.daysPerSecond * TIME.multiplier); // Earth spin

  // Earth site direction NOW (from Earth's center)
  const thetaLaunch_now = angleXZ(earthSiteLocal.clone().applyAxisAngle(new THREE.Vector3(0,1,0), earth.rotation.y));
  // Moon site direction NOW (from Earth's center)
  // Compose: orbit vector (moon about Earth) + local site vector (rotated by moon's orbital angle)
  const moonOrbitLocal = moon.position.clone(); // e.g. (4,0,0)
  const moonSiteNowEC  = rotY(moonOrbitLocal.clone().add(moonSiteLocal), moonPivot.rotation.y);
  const thetaMoonSite_now = angleXZ(moonSiteNowEC);

  // Radii for Hohmann (periapsis at Earth site radius, apoapsis at Moon site *arrival* radius)
  const r1 = EARTH_SITE.radius + HOHMANN.shipAlt;

  // We need TOF to compute φ_req, but TOF depends on a, which depends on r2 at arrival.
  // First, approximate with r2 at "now", then refine once with predicted arrival.
  function hohmannTOF(r1, r2, mu){
    const a = 0.5*(r1+r2);
    return Math.PI * Math.sqrt((a*a*a)/mu);
  }

  // µ chosen so Moon's mean motion matches our sim: n_moon^2 = µ / r_moonCenter^3
  const rMoonCenter = moonOrbitLocal.length();
  const mu = (n_moon*n_moon) * (rMoonCenter**3);

  // Initial guess r2 using "now"
  let r2_guess = moonSiteNowEC.length();
  let tof = hohmannTOF(r1, r2_guess, mu);

  // Solve for wait so that (Earth-site at t_launch) + π aligns with (Moon-site at t_launch+TOF).
  const phi_req = wrap2Pi(Math.PI - n_moon * tof);
  const phi_now = wrap2Pi(thetaMoonSite_now - thetaLaunch_now);
  const denom = n_moon - n_spinE;

  let wait;
  if (Math.abs(denom) < 1e-6) {
    wait = 0; // degenerate (very unlikely here)
  } else {
    const delta = wrap2Pi(phi_req - phi_now);
    wait = denom > 0 ? (delta / denom) : (( (2*Math.PI - delta) % (2*Math.PI) ) / -denom);
  }

  // Predict arrival Moon-site vector at t_arr = wait + TOF, recompute r2 and refine TOF once
  const theta_moon_arr = moonPivot.rotation.y + n_moon * (wait + tof);
  const moonSiteArrEC  = rotY(moonOrbitLocal.clone().add(moonSiteLocal), theta_moon_arr);
  const r2 = moonSiteArrEC.length();
  tof = hohmannTOF(r1, r2, mu); // one refinement
  // Recompute wait with refined TOF
  {
    const phi_req2 = wrap2Pi(Math.PI - n_moon * tof);
    const delta2 = wrap2Pi(phi_req2 - phi_now);
    wait = denom > 0 ? (delta2 / denom) : (( (2*Math.PI - delta2) % (2*Math.PI) ) / -denom);
  }

  // Final launch/arrival vectors & angles
  const theta_launch = thetaLaunch_now + n_spinE * wait;   // Earth-site angle at launch
  const theta_arrive = thetaMoonSite_now + n_moon * (wait + tof);

  // Build ellipse with periapsis aligned to θ_launch, apoapsis aligned to θ_arrive.
  // Hohmann peri/apo are 180° apart, so this works by construction.
  const a = 0.5*(r1 + r2);
  const e = (r2 - r1) / (r2 + r1);

  // Draw the arc in world space, centered at Earth (position "now" for visualization).
  const pos = transferGeom.getAttribute('position');
  for (let i = 0; i <= HOHMANN.segments; i++) {
    const nu = (i / HOHMANN.segments) * Math.PI;  // 0..π
    const r  = (a * (1 - e*e)) / (1 + e * Math.cos(nu));

    // local ellipse coords with periapsis on +x
    const lx = r * Math.cos(nu);
    const lz = r * Math.sin(nu);

    // rotate so periapsis points along θ_launch
    const wxz = rotY(new THREE.Vector3(lx, 0, lz), theta_launch);

    pos.setX(i, earthW_now.x + wxz.x);
    pos.setY(i, earthW_now.y);
    pos.setZ(i, earthW_now.z + wxz.z);
  }

  // Pin the endpoints EXACTLY to the predicted sites (robust against rounding):
  // Start = Earth site at launch (future)
  const earthSiteLaunchEC = new THREE.Vector3(
    Math.cos(theta_launch) * r1, 0, Math.sin(theta_launch) * r1
  );
  pos.setX(0, earthW_now.x + earthSiteLaunchEC.x);
  pos.setY(0, earthW_now.y);
  pos.setZ(0, earthW_now.z + earthSiteLaunchEC.z);

  // End = Moon site at arrival (future)
  const endW = earthW_now.clone().add(moonSiteArrEC);
  pos.setX(HOHMANN.segments, endW.x);
  pos.setY(HOHMANN.segments, endW.y);
  pos.setZ(HOHMANN.segments, endW.z);

  pos.needsUpdate = true;
  transferArc.computeLineDistances();

  // Move arrival marker to the site-at-arrival
  arrivalMarker.position.copy(endW);

  // Draw the "wait" line from *current* Earth site to *future* launch point
  {
    const earthSiteNowW   = worldPosOf(earthSite);
    const earthSiteLaunchW= earthW_now.clone().add(earthSiteLaunchEC);
    const wpos = waitGeom.getAttribute('position');
    wpos.setXYZ(0, earthSiteNowW.x,    earthSiteNowW.y,    earthSiteNowW.z);
    wpos.setXYZ(1, earthSiteLaunchW.x, earthSiteLaunchW.y, earthSiteLaunchW.z);
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

  // keep Hohmann viz in sync with the sim's moon rate (rad/sec)
  HOHMANN.moonRate = w.moon;

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

  // --- Live Hohmann transfer (anchored site→site) ---
  const ho = updateHohmannArc_anchored();
  const secToDays = (sec) => sec * (TIME.daysPerSecond);
  if (statusEl) {
    statusEl.textContent =
      `Hohmann(site→site): TOF ${secToDays(ho.tof).toFixed(2)} d  ` +
      `Wait ${secToDays(ho.wait).toFixed(2)} d  ` +
      `Total ${(secToDays(ho.total)).toFixed(2)} d`;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

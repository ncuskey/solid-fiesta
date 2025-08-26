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

const marsPivot = new THREE.Object3D();
solarPivot.add(marsPivot);

const mars = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xff3300 })
);
mars.position.set(50, 0, 0);
marsPivot.add(mars);

// ---------- Orbit rings ----------
function addOrbit(radius, color=0x444444, segments=128) {
  const pos = new Float32Array((segments+1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pos[i*3+0] = Math.cos(t) * radius;
    pos[i*3+1] = 0;
    pos[i*3+2] = Math.sin(t) * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
  const loop = new THREE.LineLoop(geo, mat);
  scene.add(loop);
}
addOrbit(30); // Earth
addOrbit(50); // Mars
// Moon ring (local to Earth)
{
  const ring = new THREE.RingGeometry(3.9, 4.1, 64);
  const mat  = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide, transparent:true, opacity:0.4 });
  const mesh = new THREE.Mesh(ring, mat);
  mesh.rotation.x = Math.PI/2;
  earth.add(mesh);
}

// ---------- UI ----------
const launchBtn = document.getElementById('launch-btn');
const upgradeBtn = document.getElementById('upgrade-btn');
const statusEl   = document.getElementById('status');

// ---------- Ship / mission ----------
const ship = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
ship.visible = false;
scene.add(ship);

let mission = null; // { start, duration, startPos, endPos }

function worldPosOf(obj) {
  const v = new THREE.Vector3();
  return obj.getWorldPosition(v);
}

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

// ---------- Camera Stages & Tweens ----------
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

// --- Hohmann (Earth-site -> Moon-site) viz ---
const HOHMANN = {
  shipAlt: 0.00,   // start altitude above Earth surface (0 = surface)
  segments: 128,
  moonRate: 2.2,   // overwritten each frame from sim
  color: 0x66ccff,
  dashSize: 0.6,
  gapSize: 0.4
};

let transferArc = null;
let transferGeom = null;
let arrivalMarker = null;

function ensureTransferPrimitives() {
  if (!transferArc) {
    transferGeom = new THREE.BufferGeometry();
    const positions = new Float32Array((HOHMANN.segments + 1) * 3);
    transferGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineDashedMaterial({
      color: HOHMANN.color, dashSize: HOHMANN.dashSize, gapSize: HOHMANN.gapSize,
      transparent: true, opacity: 0.9
    });
    transferArc = new THREE.Line(transferGeom, mat);
    transferArc.computeLineDistances();
    scene.add(transferArc);

    arrivalMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: HOHMANN.color })
    );
    scene.add(arrivalMarker);
  }
}

function wrapPi(a) {
  // wrap to (-PI, PI]
  a = (a + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}
function wrap2Pi(a) {
  // wrap to [0, 2PI)
  a = a % (2 * Math.PI);
  return a < 0 ? a + 2 * Math.PI : a;
}

function angleXZ(v) { return Math.atan2(v.z, v.x); }
function rotY(v, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return new THREE.Vector3(c * v.x - s * v.z, v.y, s * v.x + c * v.z);
}

/**
 * Build a Hohmann arc from the Earth launch site to the Moon landing site.
 * - Periapsis points along the Earth site direction (from Earth's center).
 * - Apoapsis radius matches the Moon site *distance from Earth's center*.
 * - Arrival marker placed at Moon site predicted position at arrival.
 * Returns timing metrics (TOF, wait, total).
 */
function updateHohmannArc_siteToSite() {
  ensureTransferPrimitives();

  // Centers
  const earthW = worldPosOf(earth);

  // Earth-site vector from Earth's center (now)
  const earthSiteW = worldPosOf(earthSite);
  const r1Vec = earthSiteW.clone().sub(earthW);
  const r1 = Math.max(1e-6, r1Vec.length() + HOHMANN.shipAlt);
  const thetaLaunch = angleXZ(r1Vec);

  // Moon orbit (relative to Earth) & site vectors (now)
  const moonOrbitLocal = moon.position.clone();   // e.g., (4,0,0)
  const moonSiteLocal  = moonSite.position.clone();

  // Current and future Moon-site vectors from Earth's center (ignore Earth-Sun motion)
  const thetaMoonNow = angleXZ(rotY(moonOrbitLocal.clone().add(moonSiteLocal), moonAngle));
  // Hohmann ellipse params between r1 and r2
  const r2VecNow = rotY(moonOrbitLocal.clone().add(moonSiteLocal), moonAngle);
  const r2Now = r2VecNow.length();
  const a = 0.5 * (r1 + r2Now);
  // Use µ so that the Moon's mean motion matches the sim: µ = n^2 * r_moon_center^3
  const rMoonCenter = moon.position.length();
  const mu = (HOHMANN.moonRate ** 2) * (rMoonCenter ** 3);
  const tof = Math.PI * Math.sqrt((a ** 3) / mu); // seconds (real-time)

  // Predict Moon-site at arrival (rotate by +w_moon * tof around Earth)
  const r2VecArr = rotY(moonOrbitLocal.clone().add(moonSiteLocal), moonAngle + HOHMANN.moonRate * tof);
  const r2 = r2VecArr.length();
  const thetaArrival = angleXZ(r2VecArr);

  // Ellipse eccentricity for r1->r2 Hohmann
  const e = (r2 - r1) / (r2 + r1);

  // Draw arc: ν = 0..π around periapsis aligned with Earth-site direction
  const pos = transferGeom.getAttribute('position');
  for (let i = 0; i <= HOHMANN.segments; i++) {
    const nu = (i / HOHMANN.segments) * Math.PI;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    const lx = r * Math.cos(nu);
    const lz = r * Math.sin(nu);
    const wxz = rotY(new THREE.Vector3(lx, 0, lz), thetaLaunch);
    pos.setXYZ(i, earthW.x + wxz.x, earthW.y, earthW.z + wxz.z);
  }
  pos.needsUpdate = true;
  transferArc.computeLineDistances();

  // Place arrival marker at Moon-site predicted position at arrival (Earth-centered frame)
  const arrW = earthW.clone().add(r2VecArr);
  arrivalMarker.position.copy(arrW);

  // Phase window using Earth-site as launch azimuth
  // Required phase φ_req = π - n*TOF ; current φ_now = θ_moonSite_now - θ_launch
  const phiReq = Math.PI - (HOHMANN.moonRate * tof);
  const phiNow = wrapPi(thetaMoonNow - thetaLaunch);
  const wait = wrap2Pi(phiReq - phiNow) / HOHMANN.moonRate;

  return { tof, wait, total: wait + tof };
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

  // --- Live Hohmann transfer (site->site) ---
  const ho = updateHohmannArc_siteToSite();
  // Optional: show times in sim-days instead of seconds
  const secToDays = (sec) => sec * (TIME.daysPerSecond);
  if (statusEl) {
    statusEl.textContent =
      `Hohmann (site→site) · TOF: ${secToDays(ho.tof).toFixed(2)} d · ` +
      `Wait: ${secToDays(ho.wait).toFixed(2)} d · ` +
      `Total: ${secToDays(ho.total).toFixed(2)} d`;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

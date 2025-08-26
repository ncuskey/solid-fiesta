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
  daysPerSecond: 1.0,    // 1.0 sim-days per real second (faster)
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

// --- Hohmann (Earth->Moon) live viz config ---
const HOHMANN = {
  shipAlt: 0.8,    // start radius = Earth radius (2) + this alt => r1 = 2.8
  segments: 128,   // smoothness of transfer arc
  moonRate: 2.2,   // must match your sim's moonAngle rate (rad/sec)
  color: 0x66ccff,
  dashSize: 0.6,
  gapSize: 0.4
};

let transferArc = null;        // THREE.Line (dashed)
let transferGeom = null;       // geometry for the arc
let arrivalMarker = null;      // small sphere at expected intercept

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

function ensureTransferPrimitives() {
  if (!transferArc) {
    transferGeom = new THREE.BufferGeometry();
    const positions = new Float32Array((HOHMANN.segments + 1) * 3);
    transferGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    transferGeom.computeBoundingSphere();
    const mat = new THREE.LineDashedMaterial({
      color: HOHMANN.color,
      dashSize: HOHMANN.dashSize,
      gapSize: HOHMANN.gapSize,
      transparent: true,
      opacity: 0.9
    });
    transferArc = new THREE.Line(transferGeom, mat);
    transferArc.computeLineDistances();
    scene.add(transferArc);

    // Arrival marker
    arrivalMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: HOHMANN.color })
    );
    scene.add(arrivalMarker);
  }
}

/**
 * Update/draw the Hohmann transfer arc if you launched *now*.
 * - Treats Earth as the central body, Moon radius r2 from Earth's center
 * - r1 = Earth radius (2) + HOHMANN.shipAlt
 * - µ chosen so Moon's mean motion equals your sim's moonRate
 * - Arc oriented so apolune points to Moon's predicted angle at arrival
 * Returns some timing telemetry for the UI.
 */
function updateHohmannArc() {
  ensureTransferPrimitives();

  // Earth-centered vectors
  const earthW = worldPosOf(earth);
  const moonW  = worldPosOf(moon);
  const moonEC = moonW.clone().sub(earthW);

  const r2 = moonEC.length();                // ~4 in your sim
  const r1 = 2 + HOHMANN.shipAlt;            // Earth radius 2 + altitude

  // Ellipse parameters
  const a = 0.5 * (r1 + r2);
  const e = (r2 - r1) / (r2 + r1);           // eccentricity

  // Choose µ so Moon's angular rate matches sim:
  // n_m^2 = µ / r2^3  => µ = n_m^2 * r2^3
  const mu = (HOHMANN.moonRate ** 2) * (r2 ** 3);

  // Hohmann time of flight (half the ellipse period)
  const tof = Math.PI * Math.sqrt((a ** 3) / mu); // seconds in sim-time

  // Moon's **current** angle and predicted arrival angle
  const thetaMoonNow = Math.atan2(moonEC.z, moonEC.x);
  const thetaMoonArr = thetaMoonNow + HOHMANN.moonRate * tof;

  // Orient ellipse: periapsis angle = arrival - PI (apolune opposite)
  const thetaPeri = thetaMoonArr - Math.PI;
  const cosP = Math.cos(thetaPeri), sinP = Math.sin(thetaPeri);

  // Build arc from true anomaly ν = 0..π (periapsis->apolune)
  const pos = transferGeom.getAttribute('position');
  for (let i = 0; i <= HOHMANN.segments; i++) {
    const nu = (i / HOHMANN.segments) * Math.PI; // 0..π
    const r   = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    // local ellipse (periapsis on +x)
    const lx = r * Math.cos(nu);
    const lz = r * Math.sin(nu);
    // rotate into world XZ by thetaPeri, then translate to Earth
    const wx = earthW.x + (lx * cosP - lz * sinP);
    const wz = earthW.z + (lx * sinP + lz * cosP);
    pos.setX(i, wx);
    pos.setY(i, earthW.y); // planar
    pos.setZ(i, wz);
  }
  pos.needsUpdate = true;
  transferArc.computeLineDistances();

  // Arrival marker at ν = π
  const rApo = r2; // equals apoapsis
  const ax = earthW.x + (rApo * Math.cos(Math.PI) * cosP - rApo * Math.sin(Math.PI) * sinP);
  const az = earthW.z + (rApo * Math.cos(Math.PI) * sinP + rApo * Math.sin(Math.PI) * cosP);
  arrivalMarker.position.set(ax, earthW.y, az);

  // Phase-window math (how long until a *perfect* launch window given a fixed launch azimuth)
  // Choose a fixed launch direction in world XZ (represents a "launch site" azimuth).
  // Here we use +X; you can later wire this to a UI slider or an Earth longitude.
  const launchDir = new THREE.Vector3(1, 0, 0);
  const thetaLaunch = Math.atan2(launchDir.z, launchDir.x);

  // Required phase for Hohmann: φ_req = π - n_moon * TOF
  const phiReq = Math.PI - (HOHMANN.moonRate * tof);
  // Current phase between Moon and launch direction
  const phiNow = wrapPi(thetaMoonNow - thetaLaunch);
  // Positive wait time until φ_now == φ_req (mod 2π)
  const wait = wrap2Pi(phiReq - phiNow) / HOHMANN.moonRate;

  return {
    tof,                          // seconds (sim)
    phiReq,                       // radians
    phiNow,                       // radians
    wait,                         // seconds until next perfect window
    total: wait + tof             // total time (wait + flight)
  };
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

  // --- Live Hohmann transfer (Earth->Moon) ---
  const ho = updateHohmannArc();
  if (statusEl) {
    statusEl.textContent =
      `Mission ${mission ? 'in progress' : 'idle'} · ` +
      `Hohmann TOF: ${ho.tof.toFixed(1)}s ` +
      `· Wait: ${ho.wait.toFixed(1)}s ` +
      `· Total: ${(ho.total).toFixed(1)}s`;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

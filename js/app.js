import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 50, 150);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Orbit controls (drag to look around)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Quick starfield
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
  scene.add(new THREE.Points(g, m));
}
addStars();

// Pivots to allow nested orbits
const solarPivot = new THREE.Object3D(); // center pivot (Sun at origin)
scene.add(solarPivot);

const earthPivot = new THREE.Object3D(); // rotates around sun
solarPivot.add(earthPivot);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(2, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x3366ff })
);
earth.position.set(30, 0, 0); // distance from sun
earthPivot.add(earth);

const moonPivot = new THREE.Object3D(); // rotates around earth
earth.add(moonPivot);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xcccccc })
);
moon.position.set(4, 0, 0); // distance from earth
moonPivot.add(moon);

const marsPivot = new THREE.Object3D();
solarPivot.add(marsPivot);

const mars = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xff3300 })
);
mars.position.set(50, 0, 0); // distance from sun
marsPivot.add(mars);

// Orbit rings helper
function addOrbit(radius, color=0x444444, segments=128) {
  const pos = new Float32Array((segments+1) * 3);
  for (let i=0;i<=segments;i++){
    const t = (i/segments) * Math.PI * 2;
    pos[i*3+0] = Math.cos(t) * radius;
    pos[i*3+1] = 0;
    pos[i*3+2] = Math.sin(t) * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.6 });
  const loop = new THREE.LineLoop(geo, mat);
  scene.add(loop);
}

// Add orbit rings
addOrbit(30);     // Earth around Sun
addOrbit(50);     // Mars around Sun
// Moon ring around Earth
(function addMoonRing(){
  const ring = new THREE.RingGeometry(3.9, 4.1, 64);
  const mat  = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide, transparent:true, opacity:0.4 });
  const mesh = new THREE.Mesh(ring, mat);
  mesh.rotation.x = Math.PI/2;
  earth.add(mesh);
})();

// Resize handling
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Basic UI references (stub)
const launchBtn = document.getElementById('launch-btn');
const statusEl = document.getElementById('status');
// --- Ship & mission state ---
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
  const endPos   = worldPosOf(mars); // freeze arrival point at launch
  mission = {
    start: performance.now(),
    duration: 30000,   // 30s “flight” demo
    startPos, endPos
  };
  ship.position.copy(startPos);
  ship.visible = true;
  statusEl.textContent = 'Launching ship from Earth to Mars...';
});

// Animation loop
// Frame-rate independent animation using clock
const clock = new THREE.Clock();
let eAngle = 0, mAngle = 0, moonAngle = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta(); // seconds
  // radians/sec-ish “game speeds”
  eAngle   += 0.6  * dt;
  mAngle   += 0.48 * dt;
  moonAngle+= 2.2  * dt;

  earthPivot.rotation.y = eAngle;
  marsPivot.rotation.y  = mAngle;
  moonPivot.rotation.y  = moonAngle;

  // Mission update
  if (mission) {
    const elapsed = performance.now() - mission.start;
    const u = Math.min(elapsed / mission.duration, 1);
    const s = u * u * (3 - 2 * u);
    ship.position.lerpVectors(mission.startPos, mission.endPos, s);

    if (u < 1) {
      statusEl.textContent = `Mission in progress: ${(u * 100).toFixed(0)}%`;
    } else {
      statusEl.textContent = 'Mission complete';
      mission = null;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

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
launchBtn?.addEventListener('click', () => {
  statusEl.textContent = 'Launching ship from Earth to Mars... (stub)';
});

// Animation loop
let t = 0;
function animate() {
  requestAnimationFrame(animate);

  // Spin pivots for orbits (speeds are arbitrary for now)
  t += 0.01;
  earthPivot.rotation.y = t * 0.6;  // Earth year
  moonPivot.rotation.y  = t * 2.2;  // Moon month
  marsPivot.rotation.y  = t * 0.48; // Mars year

  renderer.render(scene, camera);
}
animate();

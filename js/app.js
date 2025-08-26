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

// Planet definitions
const planets = [
  { name: 'Earth', color: 0x3366ff, size: 2, distance: 30, speed: 0.01, mesh: null },
  // Moon currently orbits the Sun; we’ll attach it to Earth in a later step.
  { name: 'Moon',  color: 0xcccccc, size: 0.5, distance: 34, speed: 0.03, mesh: null },
  { name: 'Mars',  color: 0xff3300, size: 1.5, distance: 50, speed: 0.008, mesh: null }
];

// Create meshes
planets.forEach(p => {
  const geo = new THREE.SphereGeometry(p.size, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: p.color });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  p.mesh = mesh;
});

// Orbit rings helper
function createOrbit(distance, color = 0x444444, segments = 128) {
  const curve = new THREE.EllipseCurve(0, 0, distance, distance);
  const points = curve.getPoints(segments);
  const positions = new Float32Array(points.length * 3);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    positions[i * 3 + 0] = p.x;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = p.y; // z-axis (rotated for XZ plane)
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
  const ellipse = new THREE.LineLoop(geometry, material);
  // Ellipse is already in XZ plane due to manual position mapping above
  scene.add(ellipse);
}

// Add orbit rings
createOrbit(30);
createOrbit(34);
createOrbit(50);

// Resize handling
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// Basic UI references (no gameplay logic yet)
const launchBtn = document.getElementById('launch-btn');
const statusEl = document.getElementById('status');

launchBtn?.addEventListener('click', () => {
  statusEl.textContent = 'Launching ship from Earth to Mars... (stub)';
});

// Animation loop
let time = 0;
function animate() {
  requestAnimationFrame(animate);

  time += 0.01; // time compression factor
  planets.forEach(p => {
    const angle = time * p.speed;
    p.mesh.position.set(
      Math.cos(angle) * p.distance,
      0,
      Math.sin(angle) * p.distance
    );
  });

  renderer.render(scene, camera);
}
animate();

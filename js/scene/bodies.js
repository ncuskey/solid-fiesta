import * as THREE from 'three';

export function createBodies(scene) {
  const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
  scene.add(sun);

  // Earth group + Moon child for easy relative motion
  const earthGroup = new THREE.Group();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshPhongMaterial({ color: 0x2266ff }));
  earthGroup.add(earth);
  scene.add(earthGroup);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), new THREE.MeshPhongMaterial({ color: 0xcccccc }));
  moon.position.set(4, 0, 0); // relative to Earth for now
  earth.add(moon);

  // Mars
  const mars = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 32), new THREE.MeshPhongMaterial({ color: 0xcc4422 }));
  mars.position.set(100, 0, 0);
  scene.add(mars);

  return { sun, earthGroup, earth, moon, mars };
}
// bodies.js - create Sun/Earth/Moon/Mars meshes + groups
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export function createBodies(scene){
  const solarPivot = new THREE.Object3D();
  scene.add(solarPivot);
  const earthPivot = new THREE.Object3D(); solarPivot.add(earthPivot);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(2.0,32,32), new THREE.MeshStandardMaterial({ color:0x2266ff }));
  earth.position.set(30,0,0); earthPivot.add(earth);
  const moonPivot = new THREE.Object3D(); earth.add(moonPivot);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.5,32,32), new THREE.MeshStandardMaterial({ color:0xcccccc }));
  moon.position.set(8,0,0); moonPivot.add(moon);
  const marsPivot = new THREE.Object3D(); solarPivot.add(marsPivot);
  const mars = new THREE.Mesh(new THREE.SphereGeometry(1.5,32,32), new THREE.MeshStandardMaterial({ color:0xff3300 }));
  mars.position.set(50,0,0); marsPivot.add(mars);
  return { solarPivot, earthPivot, earth, moonPivot, moon, marsPivot, mars };
}

import * as THREE from 'three';

/**
 * @typedef {Object} Bodies
 * @property {THREE.Mesh} sun
 * @property {THREE.Object3D} solarPivot
 * @property {THREE.Object3D} earthPivot
 * @property {THREE.Object3D} earthGroup - alias for earthPivot for legacy callers
 * @property {THREE.Mesh} earth
 * @property {THREE.Object3D} moonPivot
 * @property {THREE.Mesh} moon
 * @property {THREE.Object3D} marsPivot
 * @property {THREE.Mesh} mars
 */

/**
 * Create scene bodies and pivots.
 * @param {THREE.Scene} scene
 * @returns {Bodies}
 */
export function createBodies(scene) {
  // Sun
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(6, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcc00 })
  );
  sun.position.set(0, 0, 0);
  scene.add(sun);

  // System pivots
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

  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
  moon.position.set(8, 0, 0);
  moonPivot.add(moon);

  const marsPivot = new THREE.Object3D();
  solarPivot.add(marsPivot);

  const mars = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0xff3300 }));
  mars.position.set(50, 0, 0);
  marsPivot.add(mars);

  // Return a compatible shape: earthGroup alias for earthPivot for older callers
  return { sun, solarPivot, earthPivot, earthGroup: earthPivot, earth, moonPivot, moon, marsPivot, mars };
}

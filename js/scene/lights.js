import * as THREE from 'three';
export function addLights(scene, sunMesh) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sunLight = new THREE.PointLight(0xffffff, 2.0, 0, 2);
  sunMesh.add(sunLight);
}
// lights.js - ambient + sunLight
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
export function addLights(scene){
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(6,32,32), new THREE.MeshBasicMaterial({ color:0xffcc00 }));
  const sunLight = new THREE.PointLight(0xffffff, 2.0, 0, 2);
  sun.add(sunLight);
  scene.add(sun);
  return { sun };
}

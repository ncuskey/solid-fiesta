import * as THREE from 'three';

export function addLights(scene, sunMesh) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sunLight = new THREE.PointLight(0xffffff, 2.0, 0, 2);
  if (sunMesh) sunMesh.add(sunLight);
}


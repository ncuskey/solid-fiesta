import * as THREE from 'three';

// Convert geographic lat/lon (degrees) + radius -> local Cartesian (Y up)
export function latLonToLocal(latDeg, lonDeg, r) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const x = r * Math.cos(lat) * Math.cos(lon);
  const z = r * Math.cos(lat) * Math.sin(lon);
  const y = r * Math.sin(lat);
  return new THREE.Vector3(x, y, z);
}

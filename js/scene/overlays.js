import * as THREE from 'three';
import { ORBIT, TRANSFER, ENTRY_LEAD_DEG, PARKING_SENSE } from '../math/constants.js';

// Helper to make a Line with a fixed vertex count
function makeLine(count, material) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  return new THREE.Line(geom, material);
}

export function createParkingArc(scene, segments = ORBIT.segments) {
  const mat = new THREE.LineBasicMaterial({ color: ORBIT.orbitColor, transparent: true, opacity: 0.45 });
  const line = makeLine(segments + 1, mat);
  line.name = 'parkingArc';
  scene.add(line);
  return line;
}

export function createAscentArc(scene, segments = ORBIT.ascentSegments) {
  const mat = new THREE.LineBasicMaterial({ color: ORBIT.ascentColor, transparent: true, opacity: 0.85 });
  const line = makeLine(segments + 1, mat);
  line.name = 'ascentArc';
  scene.add(line);
  return line;
}

export function createTransferLine(scene, segments = 128) {
  const mat = new THREE.LineDashedMaterial({
    color: TRANSFER.color,
    dashSize: TRANSFER.dashSize,
    gapSize: TRANSFER.gapSize,
    transparent: true,
    opacity: 0.95
  });
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segments + 1) * 3), 3));
  const line = new THREE.Line(geom, mat);
  if (line.computeLineDistances) line.computeLineDistances();
  line.name = 'transferLine';
  scene.add(line);
  return line;
}

// Re-export tweakable constants so other modules can read them easily
export { ENTRY_LEAD_DEG, PARKING_SENSE };

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

// Camera mode helpers (topdown follow)
const TOPDOWN = { height: 40, polarMax: Math.PI * 0.2, targetLerp: 0.15, camLerp: 0.09 };

let camera = null;
let controls = null;
let getTarget = null; // function returning Vector3
let topdownOffsetXZ = new THREE.Vector3(12, 0, 0);
let mode = 'orbit';

export function initCameraModes({ camera: cam, controls: ctrls, getTarget: targetFn }) {
  camera = cam; controls = ctrls; getTarget = targetFn;
}

export function setMode(m) {
  mode = m;
}

export function setTopdownOffsetFromCamera() {
  if (!camera || !getTarget) return;
  const target = getTarget();
  topdownOffsetXZ.copy(camera.position).sub(target);
  topdownOffsetXZ.y = 0;
  if (topdownOffsetXZ.lengthSq() < 1e-3) topdownOffsetXZ.set(12, 0, 0);
}

export function getTopdownDest() {
  if (!getTarget) return new THREE.Vector3(0, TOPDOWN.height, 0);
  const target = getTarget();
  return target.clone().add(topdownOffsetXZ).setY(TOPDOWN.height);
}

// Called from the main tick (dt in seconds) to drive follow behavior when in topdown mode
export function updateCamera(dt) {
  if (mode !== 'topdown') return;
  if (!camera || !controls || !getTarget) return;
  const target = getTarget();
  controls.target.lerp(target, TOPDOWN.targetLerp);
  const desiredPos = target.clone().add(topdownOffsetXZ).setY(TOPDOWN.height);
  camera.position.lerp(desiredPos, TOPDOWN.camLerp);
}

export { TOPDOWN };
// cameraModes.js - OrbitControls, top-down follow, targets
export function setupCameraModes(camera, controls){
  return { focusEarth: ()=>{}, focusInnerSystem: ()=>{} };
}

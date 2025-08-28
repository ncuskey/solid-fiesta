import * as THREE from 'three';

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
// Provide a single setup function that initializes the module and returns
// a small API surface used by callers (`focusEarth`, `focusInnerSystem`).
export function setupCameraModes(cam, ctrls, getTargetFn) {
  // Initialize module-level references
  initCameraModes({ camera: cam, controls: ctrls, getTarget: getTargetFn });

  // Helper: a pleasant direction vector for the inner-system view
  function niceDir() {
    return new THREE.Vector3(0.4, 0.35, 0.85).normalize();
  }

  function focusEarth(instant = false) {
    if (!camera || !controls) return;
    // Clamp zoom tighter for close work
    controls.minDistance = 4;
    controls.maxDistance = 40;

    // clamp polar to top-down and allow free azimuth
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = TOPDOWN.polarMax;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;

    const target = (getTargetFn && typeof getTargetFn === 'function') ? getTargetFn() : new THREE.Vector3(0,0,0);
    // set initial topdown offset from current camera and activate mode
    setMode('topdown');
    setTopdownOffsetFromCamera();

    const destPos = target.clone().add(topdownOffsetXZ).setY(TOPDOWN.height);

    if (instant) {
      controls.target.copy(target);
      camera.position.copy(destPos);
      return;
    }

    // Soft immediate placement (no tweening built-in here) — callers may choose to implement
    controls.target.copy(target);
    camera.position.copy(destPos);
  }

  function focusInnerSystem() {
    if (!camera || !controls) return;
    setMode('orbit');
    // Wider zoom range
    controls.minDistance = 40;
    controls.maxDistance = 300;

    // restore near-full polar freedom and allow free azimuth
    controls.minPolarAngle = 0.01;
    controls.maxPolarAngle = Math.PI - 0.01;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;

    const target = new THREE.Vector3(0, 0, 0);
    // compute current azimuth around Y so we keep a similar heading when tilting
    const currentDir = camera.position.clone().sub(controls.target).normalize();
    const dir = (!isFinite(currentDir.length()) || currentDir.length() === 0) ? niceDir() : currentDir;
    const azimuth = Math.atan2(dir.z, dir.x);
    const polar = Math.PI / 6; // 30 degree tilt above the ecliptic
    const cosP = Math.cos(polar);
    // new direction expressed with given polar and azimuth (y = sin(polar))
    const newDir = new THREE.Vector3(
      cosP * Math.cos(azimuth),
      Math.sin(polar),
      cosP * Math.sin(azimuth)
    ).normalize();
    const distance = 140;
    const destPos = target.clone().add(newDir.multiplyScalar(distance));

    controls.target.copy(target);
    camera.position.copy(destPos);
  }

  return { focusEarth, focusInnerSystem };
}

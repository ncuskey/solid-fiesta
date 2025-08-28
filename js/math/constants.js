export const TAU = Math.PI * 2;
// periods (days)
export const PERIODS = {
  moon: 27.321661,
  earth: 365.256,
  mars: 686.98
};

// orbit/visual defaults (mirror your current values)
export const ORBIT = { rPark: 4.0, segments: 64, ascentSegments: 24, ascentColor: 0x44ff88, orbitColor: 0xffffff };
export const TRANSFER = { color: 0x66ccff, dashSize: 0.6, gapSize: 0.4 };

// gameplay/config toggles
export const ENTRY_LEAD_DEG = 30;  // fixed east/prograde
export const PARKING_SENSE = -1;   // CCW=+1, CW=-1 (your current default)
// constants.js - TAU, periods, radii, colors
// (no additional duplicate exports)

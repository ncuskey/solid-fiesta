export const state = {
  mission: null,
  upgrades: { interplanetaryNav: false },
  sites: {
    earth: { latDeg: 28.5, lonDeg: -80.6, radius: 2.0 }, // Cape
    moon : { latDeg: 0.67,  lonDeg: 23.47,  radius: 0.5 } // TB
  }
};

export function setMission(m) { state.mission = m; }

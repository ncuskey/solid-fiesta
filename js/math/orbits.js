import { TAU, PERIODS } from './constants.js';

export function currentAngularRates(daysPerSecond, multiplier=1.0) {
  const scale = daysPerSecond * (multiplier ?? 1);
  return {
    moon: (TAU / PERIODS.moon ) * scale,
    earth: (TAU / PERIODS.earth) * scale,
    mars: (TAU / PERIODS.mars ) * scale
  };
}

export function hohmannTOF(r1, r2, mu){
  const a = 0.5*(r1+r2);
  return Math.PI * Math.sqrt((a*a*a)/mu);
}


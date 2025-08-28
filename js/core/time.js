export const TIME = { daysPerSecond: 0.1, multiplier: 1.0 };
export function setDaysPerSecond(v) { TIME.daysPerSecond = Math.max(0, Math.min(5, Math.round(v * 10) / 10)); }
export function getScale() { return TIME.daysPerSecond * (TIME.multiplier ?? 1); }

export function now() { return performance.now(); }
export function tick(dt) { /* placeholder for future time-step logic */ }

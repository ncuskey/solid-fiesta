import { emit, on } from '../core/events.js';
import { state } from '../core/state.js';

// Simple mission state machine: idle -> ascent -> parkSweep -> transfer -> arrival
const STATES = {
  IDLE: 'idle',
  ASCENT: 'ascent',
  PARK: 'parkSweep',
  TRANSFER: 'transfer',
  ARRIVAL: 'arrival'
};

let mission = null;
let tickHandle = null;

// Default durations (real seconds) for each stage (short for demo)
const DUR = { ascent: 2.0, park: 1.5, transfer: 2.5, arrival: 1.0 };

function emitStatus(t) { emit('panel:status', t); }

function startMission({ from, to, geometryRefresh }){
  mission = {
    state: STATES.ASCENT,
    t0: performance.now(),
    from, to,
    geometryRefresh
  };
  emitStatus('Mission started — ascent');
  // begin ticking if not already
  if (!tickHandle) tickHandle = requestAnimationFrame(tick);
}

function tick() {
  if (!mission) { tickHandle = null; return; }
  const now = performance.now();
  const elapsed = (now - mission.t0) / 1000.0; // seconds

  switch (mission.state) {
    case STATES.ASCENT:
      if (mission.geometryRefresh) mission.geometryRefresh();
      emitStatus(`Ascent · ${elapsed.toFixed(1)}s`);
      if (elapsed >= DUR.ascent) {
        mission.state = STATES.PARK;
        mission.t0 = now;
        emitStatus('In parking orbit — sweeping for burn');
      }
      break;
    case STATES.PARK:
      if (mission.geometryRefresh) mission.geometryRefresh();
      emitStatus('Park sweep — aligning');
      if (elapsed >= DUR.park) {
        mission.state = STATES.TRANSFER;
        mission.t0 = now;
        emitStatus('Transfer burn — on trajectory');
      }
      break;
    case STATES.TRANSFER:
      if (mission.geometryRefresh) mission.geometryRefresh();
      emitStatus('En route — transfer');
      if (elapsed >= DUR.transfer) {
        mission.state = STATES.ARRIVAL;
        mission.t0 = now;
        emitStatus('Arrival — descent');
      }
      break;
    case STATES.ARRIVAL:
      if (mission.geometryRefresh) mission.geometryRefresh();
      emitStatus('Arriving...');
      if (elapsed >= DUR.arrival) {
        mission.state = STATES.IDLE;
        emitStatus('Mission complete');
        mission = null;
        tickHandle = null;
        return; // stop ticking
      }
      break;
  }

  tickHandle = requestAnimationFrame(tick);
}

export function initMissions() {
  // listen for UI launch events
  on('mission:launch', (p) => {
    // p may contain from/to sites in future — for now, use state.sites
    const from = state.sites.earth;
    const to   = state.sites.moon;
    startMission({ from, to, geometryRefresh: () => emit('missions:refresh') });
  });
  return { startMission };
}

// Backwards-compatible launcher used by legacy/bootstrap code (main.js)
// Returns a simple mission object with a `duration` (ms) so callers can
// schedule lifecycle events the old way.
export function launchMission(from, to, opts = {}) {
  // Kick off the internal mission state machine. Provide geometry refresh events.
  startMission({ from, to, geometryRefresh: () => emit('missions:refresh') });
  const durationMs = opts.durationMs ?? 2000;
  return { start: performance.now(), duration: durationMs };
}


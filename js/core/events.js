// events.js - tiny event bus (pub/sub for UI↔sim)

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
}

export function off(event, fn) {
  listeners.get(event)?.delete(fn);
}

export function emit(event, ...args) {
  listeners.get(event)?.forEach(fn => fn(...args));
}

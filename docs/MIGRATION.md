## Migration notes — app.js → main.js

This project migrated from a single-file monolith (`js/app.js`) to a modular
entrypoint (`js/main.js`). The goals were to decouple rendering, systems, and
UI, and make testing/refactoring easier.

What changed
- `js/main.js` is the supported bootstrap and entrypoint (imported by `index.html`).
- Legacy monolith is preserved at `archive/legacy-app-monolith.js` for inspection.
- Camera helpers live in `js/systems/cameraModes.js` and expose `setupCameraModes(camera, controls, getTarget?)`.
- Overlay builders live in `js/scene/overlays.js`.

Quick migration checklist
1. Replace any direct imports of `../js/app.js` with `../js/main.js` or import the specific modules you need.
2. Replace `initCameraModes(...)` usage with `setupCameraModes(camera, controls, getTarget?)`.
3. Use `js/core/index.js` to import events: `import { on, emit, off } from '../core'`.
4. If you need legacy behavior, open `archive/legacy-app-monolith.js` for reference.

Recommended further work
- Create small adapter wrappers for any legacy code that needs to be ported.
- Add unit tests for math/hohmann helpers in `js/math/` before moving solver code.

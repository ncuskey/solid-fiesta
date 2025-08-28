TODO: finish app.js migration

Goals
- Fully retire the legacy monolith `js/app.js` so `js/main.js` is the single, supported entrypoint.
- Ensure `js/legacy/app.js` contains a clean, working copy of the monolith for reference and debugging.

Checklist
- [ ] Atomically replace `js/app.js` with a clean deprecation shim (done) OR delete it if desired.
- [ ] Confirm `js/legacy/app.js` is syntactically valid and that relative imports are correct. Fix any leftover copy artifacts.
- [ ] Remove all runtime references to `js/app.js` from docs, comments, and import sites. Ensure `index.html` loads `js/main.js` only.
- [ ] Ensure camera modes API is standardized: `setupCameraModes(camera, controls, getTarget?)` is the public initializer. Remove any `initCameraModes` usage in runtime code; keep a migration note in `js/legacy/app.js`.
- [ ] Run a quick smoke test: start a static server and open `index.html` in a browser. Verify no console import errors and that the scene renders.
- [ ] Optional: vendor `three/examples/jsm/` modules locally or keep import-map mapping in `index.html` (decide team preference).

Nice-to-have polish
- Add a tiny README section with the single command to run a static server.
- Add a short note in `js/legacy/app.js` top comment pointing to the TODO and explaining why it exists.
- Consider adding an `index.js` barrel in `js/core/` to export `on/emit/off` so consumers can `import { on, emit, off } from '../core'` in the future.

Note about events.off
- `js/core/events.js` already implements `off()` — consider adding a small `js/core/index.js` barrel that re-exports `on, emit, off` to simplify imports across the codebase in a follow-up PR.

How to finish (quick):
1. Open `js/legacy/app.js` and visually scan for leftover patch fences or truncated sections. Fix them.
2. Overwrite `js/app.js` with the small shim (already applied). Commit both files in a single atomic commit.
3. Run `python3 -m http.server 8080` and load the page; check devtools console.

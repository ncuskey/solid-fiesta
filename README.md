# solid-fiesta


Minimal Three.js demo: Sun, Earth (with Moon), and Mars with simple circular orbits.

This repo boots a modular entrypoint `js/main.js` (the supported app entrypoint) and uses an import map in `index.html` to load Three.js from the CDN. There is no local `three` bundle in the repo. A legacy monolithic copy of the old `js/app.js` is preserved at `js/legacy/app.js` for reference.

Open `index.html` in a local server (for example: `python3 -m http.server 8080`) and visit http://localhost:8080 to view the demo.

## Recent refactors

- Overlays: parking orbit ring, ascent arc, and transfer line creation were moved into `js/scene/overlays.js` as small factory functions (`createParkingArc`, `createAscentArc`, `createTransferLine`) that return `THREE.Line` objects. This isolates geometry creation from solver math and simplifies iteration on visuals.

- Missions: a small mission state machine was added in `js/systems/missions.js` (idle → ascent → parkSweep → transfer → arrival). It emits status messages for the UI panel and requests geometry refreshes via the event bus.

- Camera modes: top-down follow helpers were moved into `js/systems/cameraModes.js`. Use `setupCameraModes(camera, controls, getTarget?)` to initialize and receive a small API ({ focusEarth, focusInnerSystem }). `updateCamera(dt)` remains available for per-frame follow updates.

- Constants: all tweakable numbers (entry lead, parking sense, segment counts, colors, and hohmann defaults) were centralized in `js/math/constants.js`.

Modular wiring notes
- `index.html` defines an import map entry for `three` which points to the official jsDelivr ESM build. Modules should import `three` (not the raw CDN URL) so the import map controls the version.
- `js/main.js` is a thin bootstrap that creates the renderer and scene via `js/scene/renderer.js` and `js/scene/bodies.js`, and wires lightweight systems (missions, camera modes) and overlay visuals (parking/ascent/transfer) created by `js/scene/overlays.js`.

Removed
- Local copy of Three.js (`js/three.min.js`) removed in favor of the import-map CDN.

These changes keep UI and sim logic decoupled and make visuals and gameplay easier to iterate on.
## Running

Run a simple static server from the project root and open the page in your browser:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
```
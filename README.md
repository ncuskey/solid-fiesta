# solid-fiesta

Minimal Three.js demo: Sun, Earth (with Moon), and Mars with simple circular orbits.

Cleanup: removed duplicate root assets and kept `css/style.css` and `js/app.js` as the single sources of truth.

Open `index.html` in a local server (for example: `python3 -m http.server 8080`) and visit http://localhost:8080 to view the demo.

## Recent refactors

- Overlays: parking orbit ring, ascent arc, and transfer line creation were moved into `js/scene/overlays.js` as small factory functions (`createParkingArc`, `createAscentArc`, `createTransferLine`) that return `THREE.Line` objects. This isolates geometry creation from solver math and simplifies iteration on visuals.

- Missions: a small mission state machine was added in `js/systems/missions.js` (idle → ascent → parkSweep → transfer → arrival). It emits status messages for the UI panel and requests geometry refreshes via the event bus.

- Camera modes: top-down follow helpers were moved into `js/systems/cameraModes.js`. Use `initCameraModes`, `setMode('orbit'|'topdown')`, and `updateCamera(dt)` to drive camera following from the main loop.

- Constants: all tweakable numbers (entry lead, parking sense, segment counts, colors, and hohmann defaults) were centralized in `js/math/constants.js`.

These changes keep UI and sim logic decoupled and make visuals and gameplay easier to iterate on.
## Running

Run a simple static server from the project root and open the page in your browser:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
```
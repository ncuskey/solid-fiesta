Codemap for solid-fiesta

Top-level layout

- index.html
  - Entry HTML that defines an import map for `three` (CDN ESM build) and loads `js/main.js` as the modular entrypoint.
- css/style.css
  - UI panel and layout styles.

JS structure

 - js/main.js
  - Lightweight bootstrap that initializes the renderer, scene, bodies, overlays, and systems.
  - Creates overlay geometry via `js/scene/overlays.js` (parking, ascent, transfer) and listens for `missions:refresh` to recompute those BufferAttributes.

- js/app.js (legacy)
  - Legacy monolithic entry preserved at `js/legacy/app.js` for reference. The supported bootstrap is `js/main.js`.
  - The legacy copy wires many systems together in a single file (renderer, camera, controls, bodies, overlays, missions). It's retained only for debugging and historical context.

- js/scene/
  - overlays.js
    - Factory functions that create and return pre-sized `THREE.Line` objects for:
      - parking orbit sweep (arc)
      - ascent arc (curved line from surface to parking)
      - transfer dashed line (dashed polyline between bodies)
  - Purpose: keep geometry allocation and BufferAttribute wiring in one place so the mission/math code can update positions quickly each frame.
  - `js/main.js` consumes these factories, creates the lines, and updates vertices when `missions:refresh` is emitted.
  - bodies.js, lights.js, renderer.js
    - Scene object creation and helpers.

- js/systems/
  - missions.js
    - Small mission state machine (idle → ascent → parkSweep → transfer → arrival).
    - Emits `missions:refresh` when geometries should be updated and `panel:status` messages for the UI.
    - Exposes `initMissions()` for event wiring and `launchMission()` for bootstrap compatibility.
  - cameraModes.js
    - Provides `setupCameraModes(camera, controls, getTarget?)` which initializes module state and returns `{ focusEarth, focusInnerSystem }`.
    - `setupCameraModes` is the public initializer; `initCameraModes` mentions were used in legacy code/comments and have been removed from the supported API surface.

- js/math/
  - constants.js
    - Centralized tweakable constants used across the app (TAU, periods, ORBIT/TRANSFER visual styles, ENTRY_LEAD_DEG, PARKING_SENSE, HOHMANN defaults).

- js/core/
  - events.js
    - Minimal pub/sub used across modules (on/emit/off). Keeps modules decoupled.
  - state.js, time.js
    - Small runtime state and clock helpers.

- js/ui/
  - panel.js, format.js
    - UI panel wiring and helper formatters for mission status.

Events and interactions

- UI triggers (button clicks) emit `mission:launch` or call `launchMission()` (compatibility).
- `missions.js` runs the mission lifecycle and emits `missions:refresh` to request geometry updates.
- `app.js` listens for `missions:refresh` and recomputes ascent/parking/transfer positions and updates BufferAttributes on the overlay `THREE.Line` objects.
- `panel:status` events update the status box in the UI.

Notes

- No build step required. Static server is sufficient (`python3 -m http.server 8080`).
- The modularization was done to make visuals and mission logic independently testable and easier to iterate.

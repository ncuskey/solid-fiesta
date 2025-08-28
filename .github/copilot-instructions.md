# Copilot Instructions for solid-fiesta

## Project Overview
- This is a minimal Three.js browser demo visualizing the Sun, Earth (with Moon), and Mars in simple circular orbits.
- The main UI is in `index.html`, with styles in `css/style.css` and application logic split across small ES modules in `js/`:
  - `js/app.js` — scene setup, main animation loop, and high-level wiring.
  - `js/scene/overlays.js` — factory functions for visual orbit overlays (parking, ascent, transfer).
  - `js/systems/missions.js` — mission state machine and lifecycle.
  - `js/systems/cameraModes.js` — camera follow/topdown helpers.
  - `js/math/constants.js` — centralized tweakable constants.
- The app is designed for direct browser use via a local static server (e.g., `python3 -m http.server 8080`).

## Architecture & Patterns
- Rendering and animation are initialized in `js/app.js`, but logic is split into modules (listed above). `js/app.js` imports and wires those systems together; most per-frame updates still run from the main animate loop.
- Uses Three.js as an ES module from CDN (jsDelivr), with OrbitControls imported from the Three.js examples module.
- Scene graph: Sun at origin, Earth and Mars as pivot children, Moon as a child of Earth. Orbits are visualized with rings.
- Camera behavior is stage-aware:
  - EARTH_MOON: Camera follows Earth with a fixed world-facing offset, top-down at a set height, and clamps polar angle for a near-vertical view.
  - INNER_SYSTEM: Camera tweens to a wider, tilted view (30° above ecliptic) with restored polar/azimuth freedom.
- UI buttons (`Launch Ship`, `Upgrade`) are wired in `index.html` and handled in `js/app.js`.
- Ship mission demo: Launches from Earth to Mars, animates position, and updates status text.
- Starfield: Created as a Three.Points mesh, anchored to world origin for natural rotation.

## Developer Workflows
- **Run locally:**
  ```bash
  python3 -m http.server 8080
  # Then open http://localhost:8080/
  ```
- **Edit app logic:**
  - All main logic is in `js/app.js`. UI and controls are in `index.html`.
- **No build step:**
  - No bundler, transpiler, or package manager required. All dependencies are loaded via CDN as ES modules.
- **No tests:**
  - There are no automated tests or test files in this project.

## Project-Specific Conventions
- Only one source of truth for each asset: `css/style.css` and `js/app.js`.
- All Three.js imports use CDN module URLs; do not use global builds or local vendor files.
- Camera and controls logic is stage-driven; see `focusEarth`, `focusInnerSystem`, and the animate loop for patterns.
- UI event wiring is done via DOM element IDs (`launch-btn`, `upgrade-btn`, `status`).
- Starfield is always world-anchored except in special camera-follow modes (see comments in `animate()`).

## Key Files
- `index.html`: UI, import map, and module script loading.
- `css/style.css`: Styles for the UI panel and layout.
- `js/app.js`: All rendering, animation, controls, and mission logic.

## Example: Camera Stage Pattern
```js
// In js/app.js
function focusEarth(instant=false) { /* ... */ }
function focusInnerSystem() { /* ... */ }
function animate() {
  if (stage === STAGE.EARTH_MOON && !camTween) { /* ... */ }
}
```

## Integration Points
- No backend, API, or external service integration.
- All dependencies are loaded via CDN (Three.js, OrbitControls).

---

If any conventions or patterns are unclear, please ask for clarification or provide feedback to improve these instructions.

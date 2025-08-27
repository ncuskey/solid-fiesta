# solid-fiesta

Minimal Three.js demo: Sun, Earth (with Moon), and Mars with simple circular orbits.

Cleanup: removed duplicate root assets and kept `css/style.css` and `js/app.js` as the single sources of truth.

Open `index.html` in a local server (for example: `python3 -m http.server 8080`) and visit http://localhost:8080 to view the demo.

## Added features

- `PARKING_SENSE` toggle: a small config constant in `js/app.js` which controls the direction used to draw the parking orbit sweep. Set it to `1` for CCW (prograde) or `-1` for CW (reverse).

## Recent fixes

- ENTRY_LEAD behavior: the entry-direction math was changed to use a fixed east/prograde lead from the launch site (no spin-ahead). The code now applies `-ENTRY_LEAD` when computing the entry direction so "east" is the expected clockwise rotation in the simulation frame. This removes a slow retrograde "recession" artifact and keeps the parking entry and ascent geometry visually stable. See `js/app.js` for the constant `ENTRY_LEAD_DEG` and the small console debug that prints the measured lead.

## Running

Run a simple static server from the project root and open the page in your browser:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
```
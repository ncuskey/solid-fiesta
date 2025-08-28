# Legacy developer notes

The legacy single-file application has been migrated. Use `js/main.js` as the
runtime entrypoint. The original monolith was archived at
`archive/legacy-app-monolith.js` for reference.

If you need to reproduce the legacy environment exactly, extract the archived
code into a file, ensure the Three.js import map in `index.html` points to the
desired versions, or vendor the `three/examples/jsm/` shared modules locally.

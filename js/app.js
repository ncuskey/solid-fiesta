// Deprecated shim: main monolith moved to `js/legacy/app.js`.
// Use `js/main.js` as the application entrypoint.
export default function deprecatedApp() {
  throw new Error('Deprecated: do not import js/app.js. Use js/main.js or import the legacy copy from ./legacy/app.js');
}

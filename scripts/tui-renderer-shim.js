// TUI renderer shim for standalone binary builds.
// The binary always uses the plain renderer since ink/react
// cannot be bundled into a CJS single-executable archive.
export function createTuiRenderer() {
  throw new Error(
    'TUI mode is not available in the standalone binary. ' +
      'Use the npm-installed version for the interactive TUI experience.'
  )
}

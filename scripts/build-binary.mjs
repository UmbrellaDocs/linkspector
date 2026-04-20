#!/usr/bin/env node

/**
 * Build script for creating a standalone linkspector binary using Node.js SEA.
 *
 * Usage:
 *   node scripts/build-binary.mjs
 *
 * Environment:
 *   Requires Node.js >= 20.12 and npm dependencies installed.
 *   The output binary is placed in dist/
 */

import { execSync, execFileSync } from 'child_process'
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  chmodSync,
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as esbuild from 'esbuild'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const BUNDLE_PATH = join(DIST, 'linkspector-sea.cjs')
const SEA_CONFIG = join(ROOT, 'sea-config.json')
const BLOB_PATH = join(DIST, 'sea-prep.blob')

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const platform = process.platform
const arch = process.arch
const binaryName = platform === 'win32' ? 'linkspector.exe' : 'linkspector'
const outputPath = join(DIST, binaryName)

console.log(`Building linkspector v${pkg.version} for ${platform}-${arch}...`)

// Step 1: Create dist directory
if (!existsSync(DIST)) {
  mkdirSync(DIST, { recursive: true })
}

// Step 2: Bundle with esbuild
console.log('Bundling with esbuild...')

// Plugin to handle the createRequire(import.meta.url) + require('./package.json')
// pattern which breaks in SEA context since import.meta.url is undefined in CJS.
const seaCompatPlugin = {
  name: 'sea-compat',
  setup(build) {
    // Intercept the 'module' import used for createRequire and provide a shim
    // that works in SEA context where import.meta.url is unavailable
    build.onResolve({ filter: /^module$/ }, (args) => {
      // Only shim when imported from the entry point (index.js)
      if (args.importer.endsWith('index.js')) {
        return { path: 'module', namespace: 'sea-module-shim' }
      }
    })
    build.onLoad({ filter: /.*/, namespace: 'sea-module-shim' }, () => {
      return {
        contents: `
            export function createRequire() {
              return function shimRequire(id) {
                if (id.endsWith('package.json')) {
                  return ${JSON.stringify(pkg)};
                }
                throw new Error('shimRequire: unexpected module ' + id);
              }
            }
          `,
        loader: 'js',
      }
    })
  },
}

await esbuild.build({
  entryPoints: [join(ROOT, 'index.js')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: BUNDLE_PATH,
  alias: {
    puppeteer: join(ROOT, 'scripts', 'puppeteer-shim.js'),
  },
  plugins: [seaCompatPlugin],
  banner: {
    js: [
      '// Linkspector standalone binary - https://github.com/UmbrellaDocs/linkspector',
      '// This file is auto-generated. Do not edit.',
      '',
    ].join('\n'),
  },
  logLevel: 'info',
})

// Step 4: Generate SEA blob
console.log('Generating SEA blob...')
writeFileSync(
  SEA_CONFIG,
  JSON.stringify(
    {
      main: 'dist/linkspector-sea.cjs',
      output: 'dist/sea-prep.blob',
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
    },
    null,
    2
  )
)

execSync('node --experimental-sea-config sea-config.json', {
  cwd: ROOT,
  stdio: 'inherit',
})

// Step 5: Copy node binary
console.log('Copying Node.js binary...')
copyFileSync(process.execPath, outputPath)

// Step 6: Remove signature on macOS (required before injection)
if (platform === 'darwin') {
  console.log('Removing macOS code signature...')
  execSync(`codesign --remove-signature "${outputPath}"`, { stdio: 'inherit' })
}

// Step 7: Inject SEA blob
console.log('Injecting SEA blob into binary...')
execFileSync(
  'npx',
  [
    'postject',
    outputPath,
    'NODE_SEA_BLOB',
    BLOB_PATH,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    ...(platform === 'darwin' ? ['--macho-segment-name', 'NODE_SEA'] : []),
  ],
  { cwd: ROOT, stdio: 'inherit' }
)

// Step 8: Re-sign on macOS
if (platform === 'darwin') {
  console.log('Re-signing binary for macOS...')
  execSync(`codesign --sign - "${outputPath}"`, { stdio: 'inherit' })
}

// Step 9: Make executable
if (platform !== 'win32') {
  chmodSync(outputPath, 0o755)
}

console.log(`\nBinary built successfully: ${outputPath}`)
console.log(
  `Size: ${(readFileSync(outputPath).length / 1024 / 1024).toFixed(1)} MB`
)

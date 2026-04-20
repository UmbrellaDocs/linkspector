#!/usr/bin/env bun

/**
 * Build script for creating a standalone linkspector binary using Bun.
 *
 * Unlike the Node.js SEA build, Bun handles ESM natively so ink/React
 * bundle correctly — giving the binary full TUI support.
 *
 * Supports cross-compilation via --target flag:
 *   bun scripts/build-bun.mjs --target bun-linux-x64
 *   bun scripts/build-bun.mjs --target bun-linux-arm64
 *   bun scripts/build-bun.mjs --target bun-darwin-arm64
 *   bun scripts/build-bun.mjs --target bun-windows-x64
 *
 * Usage:
 *   bun scripts/build-bun.mjs                        # build for current platform
 *   bun scripts/build-bun.mjs --target bun-linux-x64 # cross-compile for Linux x64
 *
 * Environment:
 *   Requires Bun runtime (https://bun.sh).
 *   The output binary is placed in dist/
 */

import {
  readFileSync,
  mkdirSync,
  existsSync,
  chmodSync,
  readdirSync,
  unlinkSync,
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const STUBS = join(__dirname, 'stubs')

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

// Parse --target flag for cross-compilation
const targetIdx = process.argv.indexOf('--target')
const target = targetIdx !== -1 ? process.argv[targetIdx + 1] : null

// Determine output binary name
const isWindows = target
  ? target.includes('windows')
  : process.platform === 'win32'
const binaryName = isWindows ? 'linkspector.exe' : 'linkspector'
const outputPath = join(DIST, binaryName)

const label = target || `${process.platform}-${process.arch}`
console.log(`Building linkspector v${pkg.version} for ${label} with Bun...`)

// Create dist directory
if (!existsSync(DIST)) {
  mkdirSync(DIST, { recursive: true })
}

// react-devtools-core and typescript are optional deps that ink/cosmiconfig
// try to import. They aren't needed at runtime. We temporarily symlink stub
// packages into node_modules so Bun can resolve them during bundling.
const stubs = [
  {
    name: 'react-devtools-core',
    path: join(ROOT, 'node_modules', 'react-devtools-core'),
  },
  {
    name: 'typescript',
    path: join(ROOT, 'node_modules', 'typescript'),
  },
]

const created = []
for (const stub of stubs) {
  if (!existsSync(stub.path)) {
    execSync(`ln -s "${join(STUBS, stub.name)}" "${stub.path}"`, {
      stdio: 'pipe',
    })
    created.push(stub.path)
  }
}

try {
  // Bundle and compile
  console.log('Bundling and compiling...')
  const targetFlag = target ? ` --target=${target}` : ''
  execSync(
    `bun build ./index.js --compile${targetFlag} --outfile "${outputPath}"`,
    { cwd: ROOT, stdio: 'inherit' }
  )

  // Code sign on macOS (required on macOS 15+)
  // Only sign when building ON macOS (cross-compiled binaries get signed on target)
  const buildingForMac = target
    ? target.includes('darwin')
    : process.platform === 'darwin'
  if (buildingForMac && process.platform === 'darwin') {
    console.log('Signing binary for macOS...')
    execSync(
      `codesign --remove-signature "${outputPath}" 2>/dev/null; codesign --sign - --force "${outputPath}"`,
      { stdio: 'inherit' }
    )
  }
} finally {
  // Clean up temporary symlinks
  for (const path of created) {
    execSync(`rm "${path}"`, { stdio: 'pipe' })
  }
}

// Ensure executable (skip for cross-compiled Windows binaries on non-Windows)
if (!isWindows) {
  chmodSync(outputPath, 0o755)
}

// Clean up .bun-build artifacts
const bunBuildFiles = readdirSync(ROOT).filter((f) => f.endsWith('.bun-build'))
for (const f of bunBuildFiles) {
  unlinkSync(join(ROOT, f))
}
if (bunBuildFiles.length > 0) {
  console.log(`Cleaned up ${bunBuildFiles.length} .bun-build artifacts`)
}

const sizeMB = (readFileSync(outputPath).length / 1024 / 1024).toFixed(1)
console.log(`\nBinary built successfully: ${outputPath}`)
console.log(`Size: ${sizeMB} MB`)

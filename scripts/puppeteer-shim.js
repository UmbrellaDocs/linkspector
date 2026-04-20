/**
 * Puppeteer shim for standalone binary builds.
 * Wraps puppeteer-core with automatic Chrome/Chromium detection
 * so the binary works without a bundled browser.
 */

import puppeteer from 'puppeteer-core'
import { existsSync } from 'fs'
import { execSync } from 'child_process'

const CHROME_PATHS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
    '/usr/bin/brave-browser',
    '/usr/bin/microsoft-edge',
  ],
  win32: [
    process.env.LOCALAPPDATA &&
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA &&
      `${process.env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
}

function detectChrome() {
  // Environment variable takes priority
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }

  const platform = process.platform
  const candidates = CHROME_PATHS[platform] || []

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate
    }
  }

  // Fallback: try `which` on unix-like systems
  if (platform !== 'win32') {
    for (const name of ['chromium', 'chromium-browser', 'google-chrome']) {
      try {
        const result = execSync(`which ${name}`, { encoding: 'utf8' }).trim()
        if (result) return result
      } catch {
        // not found, continue
      }
    }
  }

  return null
}

// Wrap the launch method to inject executablePath
const originalLaunch = puppeteer.launch.bind(puppeteer)
puppeteer.launch = function (opts = {}) {
  if (!opts.executablePath) {
    const chromePath = detectChrome()
    if (!chromePath) {
      throw new Error(
        'Could not find Chrome or Chromium on your system.\n' +
          'Please install Chrome/Chromium or set the PUPPETEER_EXECUTABLE_PATH environment variable.\n' +
          'Example: PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium linkspector check'
      )
    }
    opts.executablePath = chromePath
  }
  return originalLaunch(opts)
}

export default puppeteer
export const { connect, defaultArgs, executablePath, launch } = puppeteer

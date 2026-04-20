import React, { useState, useEffect } from 'react'
import { render, Text, Box, Newline } from 'ink'
import figures from 'figures'

const { createElement: h } = React

const SPINNER_FRAMES = [
  '\u280B',
  '\u2819',
  '\u2839',
  '\u2838',
  '\u283C',
  '\u2834',
  '\u2826',
  '\u2827',
  '\u2807',
  '\u280F',
]

// Animated spinner hook
function useSpinner(interval = 80) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length)
    }, interval)
    return () => clearInterval(timer)
  }, [interval])
  return SPINNER_FRAMES[frame]
}

// Progress bar with a bright sweep that travels left-to-right across the filled region
function ProgressBar({ current, total, width = 30 }) {
  const [sweep, setSweep] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setSweep((s) => s + 1)
    }, 100)
    return () => clearInterval(timer)
  }, [])

  const ratio = total > 0 ? current / total : 0
  const filled = Math.round(ratio * width)
  const pct = Math.round(ratio * 100)

  const FULL = '\u2588'
  const LIGHT = '\u2591'

  // Build filled portion with a 3-char bright sweep moving across it
  const sweepWidth = 3
  // Sweep position loops through the filled region (plus overshoot for smooth wrap)
  const sweepPos = filled > 0 ? sweep % (filled + sweepWidth) : 0

  const chars = []
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      // Distance from the sweep center
      const dist = i - (sweepPos - 1)
      if (filled > sweepWidth && dist >= 0 && dist < sweepWidth) {
        // Bright sweep: use white/bold color
        chars.push(h(Text, { key: i, color: 'white', bold: true }, FULL))
      } else {
        chars.push(h(Text, { key: i, color: 'cyan' }, FULL))
      }
    } else {
      chars.push(h(Text, { key: i, color: 'gray' }, LIGHT))
    }
  }

  return h(
    Text,
    null,
    ...chars,
    h(Text, { dimColor: true }, `  ${current}/${total}  ${pct}%`)
  )
}

// Single error line
function ErrorLine({ file, linkStatusObj }) {
  const line = linkStatusObj.line_number
  const col = linkStatusObj.position.start.column
  const link = linkStatusObj.link
  const status = linkStatusObj.status_code
  const msg = linkStatusObj.error_message || 'Cannot reach link'

  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { dimColor: true }, `L${line}:${col}`),
    h(Text, null, '  '),
    h(Text, { color: 'red' }, figures.cross),
    h(Text, null, ' '),
    h(Text, null, truncate(link, 50)),
    h(Text, null, '  '),
    h(Text, { color: 'yellow', dimColor: true }, `${status} ${msg}`)
  )
}

// Group errors by file
function ErrorGroup({ errors }) {
  if (errors.length === 0) return null

  // Group by file
  const grouped = new Map()
  for (const err of errors) {
    if (!grouped.has(err.file)) grouped.set(err.file, [])
    grouped.get(err.file).push(err.linkStatusObj)
  }

  const elements = []
  for (const [file, links] of grouped) {
    elements.push(
      h(
        Box,
        { key: `file-${file}`, flexDirection: 'column', marginTop: 1 },
        h(Text, { bold: true, color: 'white' }, `  ${file}`),
        ...links.map((ls, i) =>
          h(ErrorLine, { key: `${file}-${i}`, file, linkStatusObj: ls })
        )
      )
    )
  }

  return h(Box, { flexDirection: 'column' }, ...elements)
}

// Summary bar at the end
function SummaryBar({ stats, elapsed, hasErrors }) {
  const ok = stats.correctLinks
  const broken = stats.failedLinks
  const skipped = stats.emailLinks
  const files = stats.filesChecked
  const secs = (elapsed / 1000).toFixed(1)

  return h(
    Box,
    { marginTop: 1, flexDirection: 'row' },
    h(Text, null, '  '),
    !hasErrors
      ? h(Text, { color: 'green', bold: true }, `${figures.tick} ${ok} OK`)
      : h(Text, { color: 'green' }, `${figures.tick} ${ok} OK`),
    h(Text, { dimColor: true }, '  '),
    broken > 0
      ? h(
          Text,
          { color: 'red', bold: true },
          `${figures.cross} ${broken} broken`
        )
      : h(Text, { dimColor: true }, `${figures.cross} ${broken} broken`),
    h(Text, { dimColor: true }, '  '),
    h(Text, { dimColor: true }, `${figures.circleFilled} ${skipped} skipped`),
    h(Text, { dimColor: true }, `  ${figures.line}  ${files} files in ${secs}s`)
  )
}

// Stats table using box drawing
function StatsTable({ stats }) {
  const rows = [
    ['Total files checked', stats.filesChecked, 'cyan'],
    ['Total links checked', stats.totalLinks, 'cyan'],
    ['Hyperlinks', stats.httpLinks, 'cyan'],
    ['File and header links', stats.fileLinks, 'cyan'],
    ['Email links (Skipped)', stats.emailLinks, 'cyan'],
    ['Working links', stats.correctLinks, 'green'],
    ['Failed links', stats.failedLinks, 'red'],
  ]

  return h(
    Box,
    { flexDirection: 'column', marginTop: 1, paddingLeft: 2 },
    h(Text, { bold: true }, 'Stats'),
    h(Text, { dimColor: true }, '\u2500'.repeat(44)),
    ...rows.map(([label, value, color], i) =>
      h(
        Box,
        { key: `row-${i}`, flexDirection: 'row' },
        h(Text, null, `  ${label.padEnd(28)}`),
        h(Text, { color, bold: true }, String(value).padStart(6))
      )
    ),
    h(Text, { dimColor: true }, '\u2500'.repeat(44))
  )
}

// Main TUI app
function App({ bus, version, showStats }) {
  const [state, setState] = useState({
    totalFiles: 0,
    filesChecked: 0,
    currentFile: '',
    stats: {
      filesChecked: 0,
      totalLinks: 0,
      httpLinks: 0,
      fileLinks: 0,
      emailLinks: 0,
      correctLinks: 0,
      failedLinks: 0,
    },
    errors: [],
    done: false,
    hasErrors: false,
    elapsed: 0,
    startTime: Date.now(),
  })

  useEffect(() => {
    bus.on('start', (totalFiles) => {
      setState((s) => ({ ...s, totalFiles }))
    })

    bus.on('fileStart', (file) => {
      setState((s) => ({ ...s, currentFile: file }))
    })

    bus.on('fileComplete', (_file, _results, stats) => {
      setState((s) => ({
        ...s,
        filesChecked: s.filesChecked + 1,
        stats: { ...stats },
      }))
    })

    bus.on('error', (file, linkStatusObj) => {
      setState((s) => ({
        ...s,
        errors: [...s.errors, { file, linkStatusObj }],
        hasErrors: true,
      }))
    })

    bus.on('complete', (stats, hasErrors) => {
      setState((s) => ({
        ...s,
        done: true,
        hasErrors,
        stats: { ...stats },
        elapsed: Date.now() - s.startTime,
      }))
    })
  }, [])

  const spinner = useSpinner()

  // While running, show live progress
  if (!state.done) {
    return h(
      Box,
      { flexDirection: 'column' },
      // Header
      h(
        Box,
        { marginTop: 1 },
        h(
          Text,
          { bold: true, color: 'cyan' },
          `  ${figures.pointer} Linkspector`
        ),
        h(Text, { dimColor: true }, ` v${version}`)
      ),
      h(Text, { dimColor: true }, `  ${'─'.repeat(44)}`),

      // Current file with spinner
      state.currentFile
        ? h(
            Box,
            { paddingLeft: 2 },
            h(Text, { color: 'cyan' }, spinner),
            h(Text, { dimColor: true }, ' Checking: '),
            h(Text, null, truncate(state.currentFile, 50))
          )
        : null,

      // Progress bar
      state.totalFiles > 0
        ? h(
            Box,
            { paddingLeft: 2, marginTop: 0 },
            h(Text, { dimColor: true }, 'Files   '),
            h(ProgressBar, {
              current: state.filesChecked,
              total: state.totalFiles,
            })
          )
        : null,

      // Link stats line
      h(
        Box,
        { paddingLeft: 2 },
        h(Text, { dimColor: true }, 'Links   '),
        h(Text, null, `${state.stats.totalLinks} checked`),
        state.stats.failedLinks > 0
          ? h(
              Text,
              { color: 'red' },
              ` ${figures.bullet} ${state.stats.failedLinks} failed`
            )
          : null,
        state.stats.emailLinks > 0
          ? h(
              Text,
              { dimColor: true },
              ` ${figures.bullet} ${state.stats.emailLinks} skipped`
            )
          : null
      ),

      h(Text, { dimColor: true }, `  ${'─'.repeat(44)}`),

      // Live error stream
      state.errors.length > 0 ? h(ErrorGroup, { errors: state.errors }) : null
    )
  }

  // Done — show final output
  return h(
    Box,
    { flexDirection: 'column' },
    // Header
    h(
      Box,
      { marginTop: 1 },
      h(
        Text,
        { bold: true, color: 'cyan' },
        `  ${figures.pointer} Linkspector`
      ),
      h(Text, { dimColor: true }, ` v${version}`)
    ),
    h(Text, { dimColor: true }, `  ${'─'.repeat(44)}`),

    // Errors grouped by file
    state.errors.length > 0 ? h(ErrorGroup, { errors: state.errors }) : null,

    // Stats table (if requested)
    showStats ? h(StatsTable, { stats: state.stats }) : null,

    // Summary bar
    h(SummaryBar, {
      stats: state.stats,
      elapsed: state.elapsed,
      hasErrors: state.hasErrors,
    }),

    // Final status message
    h(
      Box,
      { marginTop: 1, marginBottom: 1 },
      !state.hasErrors
        ? h(
            Text,
            { color: 'green', bold: true },
            `  ${figures.tick} All hyperlinks are valid.`
          )
        : h(
            Text,
            { color: 'red', bold: true },
            `  ${figures.cross} Some hyperlinks are invalid.`
          )
    )
  )
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str
}

// Simple event bus
class EventBus {
  constructor() {
    this._listeners = {}
  }
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
  }
  emit(event, ...args) {
    if (this._listeners[event]) {
      for (const fn of this._listeners[event]) fn(...args)
    }
  }
}

export function createTuiRenderer(cmd, version) {
  const bus = new EventBus()
  let inkInstance = null

  return {
    onStart(totalFiles) {
      inkInstance = render(h(App, { bus, version, showStats: !!cmd.showstat }))
      bus.emit('start', totalFiles)
    },

    onFileStart(file) {
      bus.emit('fileStart', file)
    },

    onError(file, linkStatusObj) {
      bus.emit('error', file, linkStatusObj)
    },

    onFileComplete(file, results, stats) {
      bus.emit('fileComplete', file, results, stats)
    },

    onComplete(stats, hasErrors) {
      bus.emit('complete', stats, hasErrors)
      // Give ink a moment to render the final state
      return new Promise((resolve) => {
        setTimeout(() => {
          if (inkInstance) {
            inkInstance.unmount()
          }
          resolve()
        }, 100)
      })
    },

    cleanup() {
      if (inkInstance) {
        inkInstance.unmount()
      }
    },
  }
}

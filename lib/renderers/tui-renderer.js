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
// When empty (0%), a shimmer pulse travels across the empty bar to show activity
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
  const MED = '\u2592'

  const chars = []

  if (filled === 0 && total > 0) {
    // Empty-state shimmer: a bright pulse sweeps across the empty bar
    const shimmerWidth = 4
    const shimmerPos = sweep % (width + shimmerWidth + 2)
    for (let i = 0; i < width; i++) {
      const dist = i - (shimmerPos - shimmerWidth)
      if (dist >= 0 && dist < shimmerWidth) {
        // Gradient: dim -> bright -> dim
        const intensity = dist <= shimmerWidth / 2 ? dist : shimmerWidth - dist
        if (intensity >= 2) {
          chars.push(h(Text, { key: i, color: 'cyan' }, MED))
        } else if (intensity >= 1) {
          chars.push(h(Text, { key: i, color: 'cyan', dimColor: true }, MED))
        } else {
          chars.push(h(Text, { key: i, color: 'gray' }, LIGHT))
        }
      } else {
        chars.push(h(Text, { key: i, color: 'gray' }, LIGHT))
      }
    }
  } else {
    // Normal progress bar with sweep highlight
    const sweepWidth = 3
    const sweepPos = filled > 0 ? sweep % (filled + sweepWidth) : 0

    for (let i = 0; i < width; i++) {
      if (i < filled) {
        const dist = i - (sweepPos - 1)
        if (filled > sweepWidth && dist >= 0 && dist < sweepWidth) {
          chars.push(h(Text, { key: i, color: 'white', bold: true }, FULL))
        } else {
          chars.push(h(Text, { key: i, color: 'cyan' }, FULL))
        }
      } else {
        chars.push(h(Text, { key: i, color: 'gray' }, LIGHT))
      }
    }
  }

  return h(
    Text,
    null,
    ...chars,
    h(Text, { dimColor: true }, `  ${current}/${total}  ${pct}%`)
  )
}

// Animated status line showing what linkspector is doing
function StatusLine({ filesChecked, totalFiles, currentFile, totalLinks }) {
  const [dotFrame, setDotFrame] = useState(0)
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDotFrame((f) => (f + 1) % 4)
    }, 400)
    const phaseTimer = setInterval(() => {
      setPhase((p) => p + 1)
    }, 3000)
    return () => {
      clearInterval(dotTimer)
      clearInterval(phaseTimer)
    }
  }, [])

  const dots = '.'.repeat(dotFrame)
  const padDots = ' '.repeat(3 - dotFrame)

  let message
  let detail = ''
  if (filesChecked === 0 && !currentFile) {
    message = 'Scanning files'
  } else if (filesChecked === 0) {
    // Files are being processed but none completed yet
    const messages = [
      'Parsing markdown and extracting links',
      'Resolving URLs and checking connectivity',
      'Waiting for server responses',
      'Verifying link targets',
    ]
    message = messages[phase % messages.length]
    detail = ` \u2022 ${totalLinks} links found so far`
  } else if (filesChecked < totalFiles) {
    const messages = [
      'Checking hyperlinks',
      'Verifying link targets',
      'Waiting for server responses',
      'Resolving URLs',
    ]
    message = messages[phase % messages.length]
  } else {
    message = 'Finishing up'
  }

  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { dimColor: true }, 'Status  '),
    h(Text, { color: 'yellow', dimColor: true }, `${message}${dots}${padDots}`),
    detail ? h(Text, { dimColor: true }, detail) : null
  )
}

// Single error line
function ErrorLine({ file, linkStatusObj }) {
  const line = linkStatusObj.line_number
  const col = linkStatusObj.position?.start?.column ?? '?'
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

// Single warning line (archived repo)
function WarningLine({ file, linkStatusObj }) {
  const line = linkStatusObj.line_number
  const col = linkStatusObj.position?.start?.column ?? '?'
  const link = linkStatusObj.link
  const msg = linkStatusObj.error_message || 'Repository is archived'

  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { dimColor: true }, `L${line}:${col}`),
    h(Text, null, '  '),
    h(Text, { color: 'yellow' }, figures.warning),
    h(Text, null, ' '),
    h(Text, null, truncate(link, 50)),
    h(Text, null, '  '),
    h(Text, { color: 'yellow', dimColor: true }, msg)
  )
}

// Group warnings by file
function WarningGroup({ warnings }) {
  if (warnings.length === 0) return null

  const grouped = new Map()
  for (const w of warnings) {
    if (!grouped.has(w.file)) grouped.set(w.file, [])
    grouped.get(w.file).push(w.linkStatusObj)
  }

  const elements = []
  for (const [file, links] of grouped) {
    elements.push(
      h(
        Box,
        { key: `wfile-${file}`, flexDirection: 'column', marginTop: 1 },
        h(Text, { bold: true, color: 'white' }, `  ${file}`),
        ...links.map((ls, i) =>
          h(WarningLine, { key: `${file}-w${i}`, file, linkStatusObj: ls })
        )
      )
    )
  }

  return h(Box, { flexDirection: 'column' }, ...elements)
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

// Windowed error view: shows only the most recent errors in a fixed-height area
// so the progress bar stays visible during long runs
function ErrorWindow({ errors, maxVisible = 6 }) {
  if (errors.length === 0) return null

  // Flatten errors into display lines (file header + error lines)
  // We track which lines to show from the tail end
  const lines = []
  const grouped = new Map()
  for (const err of errors) {
    if (!grouped.has(err.file)) grouped.set(err.file, [])
    grouped.get(err.file).push(err.linkStatusObj)
  }

  for (const [file, links] of grouped) {
    lines.push({ type: 'header', file })
    for (const ls of links) {
      lines.push({ type: 'error', file, linkStatusObj: ls })
    }
  }

  const hidden = Math.max(0, lines.length - maxVisible)
  const visible = lines.slice(-maxVisible)

  const elements = []

  // "N more" indicator
  if (hidden > 0) {
    elements.push(
      h(
        Box,
        { key: 'hidden-count', paddingLeft: 2 },
        h(
          Text,
          { dimColor: true },
          `${figures.triangleRight} ${hidden} more ${hidden === 1 ? 'issue' : 'issues'}`
        )
      )
    )
  }

  // Render visible lines
  let lastFile = null
  for (let i = 0; i < visible.length; i++) {
    const line = visible[i]
    if (line.type === 'header') {
      lastFile = line.file
      elements.push(
        h(
          Box,
          { key: `hdr-${i}`, marginTop: i > 0 ? 1 : 0 },
          h(Text, { bold: true, color: 'white' }, `  ${line.file}`)
        )
      )
    } else {
      // If we sliced into the middle of a group, show the file header first
      if (lastFile !== line.file) {
        lastFile = line.file
        elements.push(
          h(
            Box,
            { key: `hdr-inject-${i}` },
            h(Text, { bold: true, color: 'white' }, `  ${line.file}`)
          )
        )
      }
      elements.push(
        h(ErrorLine, {
          key: `err-${i}`,
          file: line.file,
          linkStatusObj: line.linkStatusObj,
        })
      )
    }
  }

  return h(Box, { flexDirection: 'column', marginTop: 1 }, ...elements)
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
    stats.warningLinks > 0
      ? h(
          Text,
          { color: 'yellow' },
          `${figures.warning} ${stats.warningLinks} archived`
        )
      : null,
    stats.warningLinks > 0 ? h(Text, { dimColor: true }, '  ') : null,
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
    ['Anchors/IDs', stats.anchors, 'cyan'],
    ['Working links', stats.correctLinks, 'green'],
    ['Failed links', stats.failedLinks, 'red'],
    ...(stats.warningLinks > 0
      ? [['Archived repos (warning)', stats.warningLinks, 'yellow']]
      : []),
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
      anchors: 0,
      correctLinks: 0,
      failedLinks: 0,
    },
    errors: [],
    warnings: [],
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

    bus.on('warning', (file, linkStatusObj) => {
      setState((s) => ({
        ...s,
        warnings: [...s.warnings, { file, linkStatusObj }],
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

  // Elapsed time ticker
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [state.startTime])

  const elapsedStr =
    elapsed < 60
      ? `${elapsed}s`
      : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`

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
        h(Text, { dimColor: true }, ` v${version}`),
        h(Text, { dimColor: true }, `  ${figures.line}  `),
        h(Text, { dimColor: true }, `${elapsedStr}`)
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

      // Status line — what linkspector is doing right now
      h(StatusLine, {
        filesChecked: state.filesChecked,
        totalFiles: state.totalFiles,
        currentFile: state.currentFile,
        totalLinks: state.stats.totalLinks,
      }),

      h(Text, { dimColor: true }, `  ${'─'.repeat(44)}`),

      // Live error window — fixed height so progress bar stays visible
      state.errors.length > 0 ? h(ErrorWindow, { errors: state.errors }) : null
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

    // Warnings grouped by file (archived repos)
    state.warnings.length > 0
      ? h(WarningGroup, { warnings: state.warnings })
      : null,

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

    onWarning(file, linkStatusObj) {
      bus.emit('warning', file, linkStatusObj)
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

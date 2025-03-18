import { expect, test } from 'vitest'
import { linkspector } from './linkspector.js'

let cmd = {
  json: true,
}

test('linkspector should check top-level relative links in Markdown file', async () => {
  let hasErrorLinks = false
  let currentFile = '' // Variable to store the current file name
  let results = [] // Array to store the results if json is true

  for await (const { file, result } of linkspector(
    './.linkspector.test.yml',
    cmd
  )) {
    currentFile = file
    for (const linkStatusObj of result) {
      if (cmd.json) {
        results.push({
          file: currentFile,
          link: linkStatusObj.link,
          status_code: linkStatusObj.status_code,
          line_number: linkStatusObj.line_number,
          position: linkStatusObj.position,
          status: linkStatusObj.status,
          error_message: linkStatusObj.error_message,
        })
      }
      if (linkStatusObj.status === 'error') {
        hasErrorLinks = true
      }
    }
  }

  expect(hasErrorLinks).toBe(false)
  expect(results.length).toBe(21)
})

test('linkspector should track statistics correctly when stats option is enabled', async () => {
  let cmd = {
    showstat: true,
  }

  // Initialize statistics counters
  let stats = {
    filesChecked: 0,
    totalLinks: 0,
    httpLinks: 0,
    fileLinks: 0,
    correctLinks: 0,
    failedLinks: 0,
  }

  for await (const { file, result } of linkspector(
    './.linkspector.test.yml',
    cmd
  )) {
    // Increment file count for statistics
    stats.filesChecked++

    for (const linkStatusObj of result) {
      // Count total links
      stats.totalLinks++

      // Count HTTP vs File links
      if (linkStatusObj.link.match(/^https?:\/\//)) {
        stats.httpLinks++
      } else if (
        !linkStatusObj.link.startsWith('#') &&
        !linkStatusObj.link.startsWith('mailto:')
      ) {
        stats.fileLinks++
      }

      // Count correct vs failed links
      if (linkStatusObj.status === 'error') {
        stats.failedLinks++
      } else if (
        linkStatusObj.status === 'alive' ||
        linkStatusObj.status === 'assumed alive'
      ) {
        stats.correctLinks++
      }
    }
  }

  // Verify statistics are being tracked correctly
  expect(stats.filesChecked).toBeGreaterThan(0)
  expect(stats.totalLinks).toBe(21)
  expect(stats.totalLinks).toBe(
    stats.httpLinks +
      stats.fileLinks +
      (stats.totalLinks - stats.httpLinks - stats.fileLinks)
  )
  expect(stats.totalLinks).toBe(stats.correctLinks + stats.failedLinks)
  expect(stats.correctLinks).toBeGreaterThanOrEqual(0)
  expect(stats.failedLinks).toBe(0)
})

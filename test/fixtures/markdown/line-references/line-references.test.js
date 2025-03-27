import { expect, test } from 'vitest'
import { linkspector } from './linkspector.js'

let cmd = {
  json: true,
}

test('linkspector should correctly handle GitHub-style line reference links', async () => {
  let hasErrorLinks = false
  let currentFile = ''
  let results = []

  for await (const { file, result } of linkspector(
    './test/fixtures/markdown/line-references/.lineReferencesTest.yml',
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

  // There should be 5 links total (3 valid, 2 invalid)
  expect(results.length).toBe(5)

  // The first link should be valid (within file line count)
  expect(results[0].link).toBe('line-file.md#L3')
  expect(results[0].status).toBe('alive')

  // The second link should be valid (within range)
  expect(results[1].link).toBe('line-file.md#L5-L8')
  expect(results[1].status).toBe('alive')

  // The third link should be invalid (line number beyond file length)
  expect(results[2].link).toBe('line-file.md#L25')
  expect(results[2].status).toBe('error')
  expect(results[2].error_message).toContain('Cannot find Line 25')

  // The fourth link should be invalid (range beyond file length)
  expect(results[3].link).toBe('line-file.md#L4-L30')
  expect(results[3].status).toBe('error')
  expect(results[3].error_message).toContain('Cannot find Line 30')

  // The fifth link should be valid (points to a lowercase l454 section name)
  expect(results[4].link).toBe('line-file.md#l454')
  expect(results[4].status).toBe('alive')

  // Overall status should indicate errors
  expect(hasErrorLinks).toBe(true)
})

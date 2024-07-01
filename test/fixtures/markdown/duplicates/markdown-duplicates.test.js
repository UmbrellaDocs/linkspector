import { expect, test } from 'vitest'
import { linkspector } from './linkspector.js'

let cmd = {
  json: true,
}

test('linkspector should add back the removed duplicates when returning the results', async () => {
  let hasErrorLinks = false
  let currentFile = '' // Variable to store the current file name
  let results = [] // Array to store the results if json is true

  for await (const { file, result } of linkspector(
    './test/fixtures/markdown/duplicates/duplicateTest.yml',
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

  expect(hasErrorLinks).toBe(true)
  expect(results.length).toBe(4)
  expect(results[0].status).toBe('alive')
  expect(results[1].status).toBe('error')
  expect(results[2].status).toBe('alive')
  expect(results[3].status).toBe('error')
})

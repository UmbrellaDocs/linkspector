import { expect, test } from 'vitest'
import { linkspector } from './linkspector.js'

let cmd = {
  json: true,
}

test('linkspector should check image links in Markdown file', async () => {
  let hasErrorLinks = false
  let currentFile = '' // Variable to store the current file name
  let results = [] // Array to store the results if json is true

  for await (const { file, result } of linkspector(
    './test/fixtures/markdown/image/imageTest.yml',
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
  expect(results.length).toBe(1)
  expect(results[0].link).toBe(
    'https://commons.wikimedia.org/wiki/Main_Page#/media/File:Praia_do_Ribeiro_do_Cavalo2.jpg'
  )
  expect(results[0].status).toBe('alive')
})

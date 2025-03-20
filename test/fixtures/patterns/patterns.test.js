import { expect, test } from 'vitest'
import { linkspector } from './linkspector.js'

let cmd = {
  json: true,
}

test('linkspector should correctly apply ignorePatterns and replacementPatterns', async () => {
  let currentFile = ''
  let results = []

  for await (const { file, result } of linkspector(
    './test/fixtures/patterns/patternsTest.yml',
    cmd
  )) {
    currentFile = file
    for (const linkStatusObj of result) {
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
  }

  // Test expectations for pattern checks

  // 1. Check that ignored links are not in the results
  const ignoredLinks = [
    'https://ignored-domain.example.com/page1',
    'https://ignored-domain.example.com/page2',
    'https://another-ignored.example.com/test',
  ]

  ignoredLinks.forEach((link) => {
    expect(results.find((r) => r.link === link)).toBeUndefined()
  })

  // 2. Check that replacement patterns were applied
  expect(
    results.find((r) => r.link === 'https://example.com/new/path1')
  ).toBeDefined()
  expect(
    results.find((r) => r.link === 'https://example.com/new/path2')
  ).toBeDefined()
  expect(
    results.find((r) => r.link === 'https://new-domain.example.com/path3')
  ).toBeDefined()

  // 3. Confirm original links (before replacement) are not in the results
  expect(
    results.find((r) => r.link === 'https://example.com/old/path1')
  ).toBeUndefined()
  expect(
    results.find((r) => r.link === 'https://example.com/old/path2')
  ).toBeUndefined()
  expect(
    results.find((r) => r.link === 'https://replace-domain.example.com/path3')
  ).toBeUndefined()

  // 4. Check that normal links are still being checked
  expect(results.find((r) => r.link === 'https://www.google.com')).toBeDefined()
  expect(results.find((r) => r.link === 'https://github.com')).toBeDefined()

  // Total number of links should be 5 (2 normal + 3 replaced)
  expect(results.length).toBe(5)
})

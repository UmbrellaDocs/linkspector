import { expect, test } from 'vitest'
import { linkspector } from './linkspector.js'

let cmd = {
  json: true,
}

const getHostname = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

const hasHostname = (url, hostname) => getHostname(url) === hostname

test('linkspector should ignore content in AsciiDoc comments', async () => {
  let hasErrorLinks = false
  let currentFile = ''
  let results = []

  for await (const item of linkspector(
    './test/fixtures/asciidoc/comments/commentsTest.yml',
    cmd
  )) {
    if (item.type === 'meta') continue
    const { file, result } = item
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

  const foundUrls = results.map((r) => r.link)

  console.log('📊 Comment Handling Test Results:')
  console.log(`  URLs found: ${results.length}`)
  foundUrls.forEach((url) => console.log(`  - ${url}`))

  // Should find only valid URLs, not commented ones
  expect(results.length).toBeGreaterThan(0)

  // Should find GitHub URL
  const hasGithubUrl = foundUrls.some((url) => hasHostname(url, 'github.com'))
  expect(hasGithubUrl).toBe(true)

  // Should find broken test URL
  const hasBrokenUrl = foundUrls.some((url) =>
    hasHostname(url, 'broken-url-for-comment-test.com')
  )
  expect(hasBrokenUrl).toBe(true)

  // Should NOT find URLs that are in comments
  const ignoredBlockHosts = new Set([
    'ignored-url-in-block-comment.com',
    'ignored-link-macro.com',
    'first-ignored.com',
    'second-ignored.com',
  ])
  const hasIgnoredBlockUrl = foundUrls.some((url) =>
    ignoredBlockHosts.has(getHostname(url))
  )
  expect(hasIgnoredBlockUrl).toBe(false)

  // Should NOT find URLs in line comments
  const hasIgnoredLineUrl = foundUrls.some((url) =>
    hasHostname(url, 'ignored-line-comment.com')
  )
  expect(hasIgnoredLineUrl).toBe(false)
})

test('comment handling works correctly in extraction', async () => {
  // Test our extraction logic directly
  const { parseAsciiDocContent } =
    await import('../../../../lib/extract-asciidoc-comprehensive.js')
  const fs = await import('fs')

  const testFilePath =
    './test/fixtures/asciidoc/comments/test-comment-handling.adoc'
  const content = fs.readFileSync(testFilePath, 'utf8')
  const result = parseAsciiDocContent(content, testFilePath)

  console.log('🔍 Comment Extraction Test Results:')
  console.log(`  📍 Anchors: ${result.anchors.length}`)
  console.log(`  🔗 Internal refs: ${result.internalRefs.length}`)
  console.log(`  🌐 URLs: ${result.externalUrls.length}`)

  // Should find only the valid anchor, not ignored ones
  expect(result.anchors.length).toBe(1)
  expect(result.anchors[0].id).toBe('valid-anchor')

  // Should find only valid internal references, not ignored ones
  expect(result.internalRefs.length).toBe(2) // Two valid references to valid-anchor
  result.internalRefs.forEach((ref) => {
    expect(ref.id).toBe('valid-anchor')
  })

  // Should find only valid URLs, not ignored ones
  const foundUrls = result.externalUrls.map((u) => u.url)
  expect(foundUrls.some((url) => hasHostname(url, 'github.com'))).toBe(true)
  expect(
    foundUrls.some((url) => hasHostname(url, 'broken-url-for-comment-test.com'))
  ).toBe(true)

  // Should NOT find ignored URLs
  expect(
    foundUrls.some((url) =>
      hasHostname(url, 'ignored-url-in-block-comment.com')
    )
  ).toBe(false)
  expect(
    foundUrls.some((url) => hasHostname(url, 'ignored-line-comment.com'))
  ).toBe(false)
  expect(foundUrls.some((url) => hasHostname(url, 'first-ignored.com'))).toBe(
    false
  )
  expect(foundUrls.some((url) => hasHostname(url, 'second-ignored.com'))).toBe(
    false
  )
})

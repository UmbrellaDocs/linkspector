import { expect, test } from 'vitest'
import { linkspector } from './linkspector.js'

let cmd = {
  json: true,
}

const hasHostname = (url, hostname) => {
  try {
    return new URL(url).hostname === hostname
  } catch {
    return false
  }
}

test('linkspector should check all AsciiDoc reference types comprehensively', async () => {
  let hasErrorLinks = false
  let currentFile = ''
  let results = []

  for await (const { file, result } of linkspector(
    './test/fixtures/asciidoc/comprehensive/test-config.yml',
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

  // Should find URL errors (all our test URLs are intentionally broken)
  expect(hasErrorLinks).toBe(true)

  // Should find multiple URLs from different extraction methods
  expect(results.length).toBeGreaterThan(0)

  // Verify that different URL types are detected
  const foundUrls = results.map((r) => r.link)

  // Should detect direct URLs
  const hasDirectUrl = foundUrls.some(
    (url) =>
      hasHostname(url, 'direct-url.com') ||
      hasHostname(url, 'another-nonexistent-domain-67890.com')
  )
  expect(hasDirectUrl).toBe(true)

  // Should detect URLs in parentheses
  const hasParenthesesUrl = foundUrls.some((url) =>
    hasHostname(url, 'third-fake-domain-abcde.net')
  )
  expect(hasParenthesesUrl).toBe(true)

  // Should detect link macro URLs
  const hasLinkMacroUrl = foundUrls.some((url) =>
    hasHostname(url, 'this-domain-does-not-exist-12345.com')
  )
  expect(hasLinkMacroUrl).toBe(true)

  console.log('✅ Comprehensive AsciiDoc test results:')
  console.log(`  📊 Total URLs found: ${results.length}`)
  console.log(`  🔗 URLs detected:`)
  foundUrls.forEach((url) => console.log(`    - ${url}`))
})

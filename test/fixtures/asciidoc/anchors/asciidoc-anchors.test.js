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

test('linkspector should check AsciiDoc anchors and references (URLs only in Phase 1)', async () => {
  let hasErrorLinks = false
  let currentFile = ''
  let results = []

  for await (const { file, result } of linkspector(
    './test/fixtures/asciidoc/anchors/anchorsTest.yml',
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

  // Phase 1: Currently only checks URLs, so we test URL detection
  // Phase 2 will add anchor/reference validation

  expect(results.length).toBeGreaterThan(0)

  const foundUrls = results.map((r) => r.link)
  console.log('📊 AsciiDoc Anchors Test Results:')
  console.log(`  URLs found: ${results.length}`)
  foundUrls.forEach((url) => console.log(`  - ${url}`))

  // Should find the broken URL we included
  const hasBrokenUrl = foundUrls.some((url) =>
    hasHostname(url, 'this-will-fail-12345.com')
  )
  expect(hasBrokenUrl).toBe(true)

  // Should find GitHub URL (which should be alive)
  const hasGithubUrl = foundUrls.some((url) => hasHostname(url, 'github.com'))
  expect(hasGithubUrl).toBe(true)

  // Note: Anchor and reference validation will be added in Phase 2
  // For now, we verify that our comprehensive extraction finds URLs correctly
})

test('linkspector extraction includes comprehensive AsciiDoc parsing', async () => {
  // This test verifies our extraction logic works by testing the extraction functions directly
  const { parseAsciiDocContent } =
    await import('../../../../lib/extract-asciidoc-comprehensive.js')
  const fs = await import('fs')

  const testFilePath =
    './test/fixtures/asciidoc/anchors/test-anchors-complete.adoc'
  const content = fs.readFileSync(testFilePath, 'utf8')
  const result = parseAsciiDocContent(content, testFilePath)

  // Test anchor extraction
  expect(result.anchors.length).toBeGreaterThan(4) // Should find multiple anchor types

  // Test that we find different anchor types
  const anchorTypes = new Set(result.anchors.map((a) => a.type))
  expect(anchorTypes.has('block')).toBe(true)
  expect(anchorTypes.has('inline')).toBe(true)
  expect(anchorTypes.has('bibliography')).toBe(true)
  expect(anchorTypes.has('macro')).toBe(true)

  // Test internal reference extraction
  expect(result.internalRefs.length).toBeGreaterThan(5) // Should find multiple internal refs

  // Test external reference extraction
  expect(result.externalRefs.length).toBeGreaterThan(1) // Should find external refs

  // Test URL extraction
  expect(result.externalUrls.length).toBeGreaterThan(1) // Should find URLs

  console.log('🔍 Direct Extraction Test Results:')
  console.log(`  📍 Anchors: ${result.anchors.length}`)
  console.log(`  🔗 Internal refs: ${result.internalRefs.length}`)
  console.log(`  📄 External refs: ${result.externalRefs.length}`)
  console.log(`  🌐 URLs: ${result.externalUrls.length}`)
})

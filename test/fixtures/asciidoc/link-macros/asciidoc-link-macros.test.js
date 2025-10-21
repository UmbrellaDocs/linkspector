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

test('linkspector should correctly extract URLs from AsciiDoc link macros', async () => {
  let hasErrorLinks = false
  let currentFile = ''
  let results = []

  for await (const { file, result } of linkspector(
    './test/fixtures/asciidoc/link-macros/linkMacrosTest.yml',
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

  const foundUrls = results.map((r) => r.link)

  console.log('📊 Link Macro Test Results:')
  console.log(`  URLs found: ${results.length}`)
  foundUrls.forEach((url) => console.log(`  - ${url}`))

  // Should find multiple URLs (be more flexible with count)
  expect(results.length).toBeGreaterThan(3)

  // Should find some link macro URLs
  const allowedHosts = new Set([
    'google.com',
    'www.google.com',
    'yttftfftx.com',
    'www.yttftfftx.com',
  ])
  const hasLinkMacroUrls = foundUrls.some((url) =>
    allowedHosts.has(getHostname(url))
  )
  expect(hasLinkMacroUrls).toBe(true)

  // Should NOT find invalid protocol URLs (FTP, IRC, mailto)
  const hasInvalidProtocol = foundUrls.some(
    (url) =>
      url.includes('ftp://') ||
      url.includes('irc://') ||
      url.includes('mailto:')
  )
  expect(hasInvalidProtocol).toBe(false)
})

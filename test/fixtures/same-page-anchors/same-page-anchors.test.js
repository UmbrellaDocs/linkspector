import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { linkspector } from '../../../linkspector.js'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const configFile = path.join(__dirname, 'config-same-page-anchors.yml')

const PORT = 3210
const HOST = 'localhost'

let server

const pageHtml = `<!DOCTYPE html>
<html>
<body>
${Array.from(
  { length: 15 },
  (_, i) => `<h2 id="section-${i + 1}">Section ${i + 1}</h2>`
).join('\n')}
</body>
</html>`

const serverHandler = (req, res) => {
  // Reject HEAD requests so the fast fetch pass fails and all links
  // fall through to the Puppeteer pass, like servers that block HEAD.
  if (req.method === 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' })
    res.end()
    return
  }
  if (req.url === '/page.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(pageHtml)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
}

// Regression test for https://github.com/UmbrellaDocs/linkspector/issues/177
// More than 10 links to the same HTML document that only differ in their
// anchors made Puppeteer reuse a pooled page that already had the document
// loaded. page.goto() returns null for such same-URL-different-hash
// navigations, producing "Cannot read properties of null (reading 'status')".
describe('more than 10 links to the same document with different anchors', () => {
  let results = []

  beforeAll(async () => {
    server = http.createServer(serverHandler)
    await new Promise((resolve) => server.listen(PORT, HOST, resolve))

    for await (const item of linkspector(configFile, {})) {
      if (item.type === 'meta') continue
      results.push(...item.result)
    }
  }, 60000)

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  it('checks all anchored links', () => {
    expect(results.length).toBe(15)
  })

  it('does not fail with "Cannot read properties of null"', () => {
    const nullErrors = results.filter(
      (r) =>
        r.error_message &&
        r.error_message.includes('Cannot read properties of null')
    )
    expect(nullErrors).toEqual([])
  })

  it('reports every anchored link as alive with status 200', () => {
    for (const result of results) {
      expect(result.status, `${result.link}: ${result.error_message}`).toBe(
        'alive'
      )
      expect(result.status_code).toBe(200)
    }
  })
})

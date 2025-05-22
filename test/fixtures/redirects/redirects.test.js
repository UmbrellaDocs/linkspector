import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { linkspector } from '../../../linkspector.js' // Import from root linkspector.js
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fixturesDir = path.join(__dirname)
// const markdownFile = path.join(fixturesDir, 'redirects.md') // No longer directly passed
const configFileFollowFalse = path.join(fixturesDir, 'config-redirects-false.yml')
const configFileFollowTrue = path.join(fixturesDir, 'config-redirects-true.yml')

let server

const PORT = 3000
const HOST = 'localhost'

const serverHandler = (req, res) => {
  if (req.url === '/redirect-permanent') {
    res.writeHead(301, { Location: `http://${HOST}:${PORT}/final-destination` })
    res.end()
  } else if (req.url === '/redirect-temporary') {
    res.writeHead(302, { Location: `http://${HOST}:${PORT}/final-destination` })
    res.end()
  } else if (req.url === '/final-destination') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Final Destination Reached')
  } else if (req.url === '/ok') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
  } else if (req.url === '/redirect-external') {
    res.writeHead(301, { Location: 'https://example.com' })
    res.end()
  } else if (req.url === '/redirect-loop1') {
    res.writeHead(302, { Location: `http://${HOST}:${PORT}/redirect-loop2` })
    res.end()
  } else if (req.url === '/redirect-loop2') {
    res.writeHead(302, { Location: `http://${HOST}:${PORT}/redirect-loop1` })
    res.end()
  }
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
}

describe('followRedirects feature', () => {
  beforeAll(async () => {
    server = http.createServer(serverHandler)
    await new Promise((resolve) => server.listen(PORT, HOST, resolve))
  })

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  // Scenario 1: followRedirects: true (default) - Permanent Redirect (301)
  it('should report a permanent redirecting link as alive (200) when followRedirects is true (default)', async () => {
    const resultsAsync = linkspector(configFileFollowTrue, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const redirectLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/redirect-permanent`)
    expect(redirectLink.status).toBe('alive')
    expect(redirectLink.status_code).toBe(200) // Final destination
    expect(redirectLink.error_message).toContain('redirected to')
  }, 10000) // Increased timeout to 10 seconds

  // Scenario 1 (bis): followRedirects: true (default) - Temporary Redirect (302)
  it('should report a temporary redirecting link as alive (200) when followRedirects is true (default)', async () => {
    const resultsAsync = linkspector(configFileFollowTrue, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const redirectLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/redirect-temporary`)
    expect(redirectLink.status).toBe('alive')
    expect(redirectLink.status_code).toBe(200) // Final destination
    expect(redirectLink.error_message).toContain('redirected to')
  }, 10000) // Increased timeout

  // Scenario 2: followRedirects: false - Permanent Redirect (301)
  it('should report a permanent redirecting link as error (301) when followRedirects is false', async () => {
    const resultsAsync = linkspector(configFileFollowFalse, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const redirectLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/redirect-permanent`)
    expect(redirectLink.status).toBe('error')
    expect(redirectLink.status_code).toBe(301)
    expect(redirectLink.error_message).toMatch(/redirected.*followRedirects is set to false/i)
  })

  // Scenario 2 (bis): followRedirects: false - Temporary Redirect (302)
  it('should report a temporary redirecting link as error (302) when followRedirects is false', async () => {
    const resultsAsync = linkspector(configFileFollowFalse, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const redirectLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/redirect-temporary`)
    expect(redirectLink.status).toBe('error')
    expect(redirectLink.status_code).toBe(302)
    expect(redirectLink.error_message).toMatch(/redirected.*followRedirects is set to false/i)
  })

  // Scenario 3: Non-redirecting link with followRedirects: false
  it('should report a non-redirecting link as alive (200) when followRedirects is false', async () => {
    const resultsAsync = linkspector(configFileFollowFalse, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const okLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/ok`)
    expect(okLink.status).toBe('alive')
    expect(okLink.status_code).toBe(200)
  })

  // Scenario 4: Non-redirecting link with followRedirects: true (default)
  it('should report a non-redirecting link as alive (200) when followRedirects is true (default)', async () => {
    const resultsAsync = linkspector(configFileFollowTrue, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const okLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/ok`)
    expect(okLink.status).toBe('alive')
    expect(okLink.status_code).toBe(200)
  })

  // Scenario 5: Link that results in an actual error (404) with followRedirects: false
  it('should report a 404 link as error (404) when followRedirects is false', async () => {
    const resultsAsync = linkspector(configFileFollowFalse, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const notFoundLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/not-found`)
    expect(notFoundLink.status).toBe('error')
    expect(notFoundLink.status_code).toBe(404)
  })
  
  // Scenario: Link that results in an actual error (404) with followRedirects: true (default)
  it('should report a 404 link as error (404) when followRedirects is true (default)', async () => {
    const resultsAsync = linkspector(configFileFollowTrue, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const notFoundLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/not-found`)
    expect(notFoundLink.status).toBe('error')
    expect(notFoundLink.status_code).toBe(404)
  })

  // Scenario: External redirect allowed when followRedirects is true
  it('should report an external redirecting link as alive (200 from example.com) when followRedirects is true', async () => {
    const resultsAsync = linkspector(configFileFollowTrue, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const externalRedirectLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/redirect-external`)
    expect(externalRedirectLink.status).toBe('alive')
    // Note: status code might be from the final destination (example.com) if HEAD request works,
    // or could be tricky if example.com blocks HEAD. Puppeteer fallback should handle it.
    // For now, checking for 'alive' is the primary goal.
    // expect(externalRedirectLink.status_code).toBe(200) // This can be flaky with external sites
    expect(externalRedirectLink.error_message).toContain('redirected to https://example.com')
  }, 10000) // Increased timeout

  // Scenario: External redirect disallowed when followRedirects is false
  it('should report an external redirecting link as error (301) when followRedirects is false', async () => {
    const resultsAsync = linkspector(configFileFollowFalse, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const externalRedirectLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/redirect-external`)
    expect(externalRedirectLink.status).toBe('error')
    expect(externalRedirectLink.status_code).toBe(301)
    expect(externalRedirectLink.error_message).toMatch(/redirected to https:\/\/example.com, but followRedirects is set to false/i)
  })

  // Scenario: Redirect loop when followRedirects is true (Puppeteer should eventually error out)
  it('should report a redirect loop as error when followRedirects is true', async () => {
    // This test might take a bit longer due to Puppeteer's retries for loops or timeouts
    const resultsAsync = linkspector(configFileFollowTrue, { aliveStatusCodes: [200] }) // Ensure only 200 is "assumed alive"
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const loopLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/redirect-loop1`)
    expect(loopLink.status).toBe('error')
    // The error message might vary depending on how Puppeteer handles max redirects
    // e.g., "net::ERR_TOO_MANY_REDIRECTS" or similar
    expect(loopLink.error_message).toBeDefined()
  }, 20000) // Timeout already increased, keeping it

  // Scenario: Redirect loop when followRedirects is false
  it('should report a redirect loop as error (first redirect status) when followRedirects is false', async () => {
    const resultsAsync = linkspector(configFileFollowFalse, {})
    const collectedResults = []
    for await (const item of resultsAsync) {
      collectedResults.push(...item.result)
    }
    const loopLink = collectedResults.find((r) => r.link === `http://${HOST}:${PORT}/redirect-loop1`)
    expect(loopLink.status).toBe('error')
    expect(loopLink.status_code).toBe(302) // The first redirect in the loop
    expect(loopLink.error_message).toMatch(/redirected.*followRedirects is set to false/i)
  })
})

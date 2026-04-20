import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { linkspector } from '../../../linkspector.js' // Import from root linkspector.js
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fixturesDir = path.join(__dirname)
// const markdownFile = path.join(fixturesDir, 'redirects.md') // No longer directly passed
const configFileFollowFalse = path.join(
  fixturesDir,
  'config-redirects-false.yml'
)
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
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
}

describe('followRedirects feature', () => {
  let resultsFollowTrue = []
  let resultsFollowFalse = []

  beforeAll(async () => {
    server = http.createServer(serverHandler)
    await new Promise((resolve) => server.listen(PORT, HOST, resolve))

    // Run linkspector once per config and share results across tests
    const [trueResults, falseResults] = await Promise.all([
      (async () => {
        const collected = []
        for await (const item of linkspector(configFileFollowTrue, {})) {
          collected.push(...item.result)
        }
        return collected
      })(),
      (async () => {
        const collected = []
        for await (const item of linkspector(configFileFollowFalse, {})) {
          collected.push(...item.result)
        }
        return collected
      })(),
    ])

    resultsFollowTrue = trueResults
    resultsFollowFalse = falseResults
  }, 30000)

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  // Scenario 1: followRedirects: true (default) - Permanent Redirect (301)
  it('should report a permanent redirecting link as alive (200) when followRedirects is true (default)', () => {
    const redirectLink = resultsFollowTrue.find(
      (r) => r.link === `http://${HOST}:${PORT}/redirect-permanent`
    )
    expect(redirectLink.status).toBe('alive')
    expect(redirectLink.status_code).toBe(200)
    expect(redirectLink.error_message).toContain('redirected to')
  })

  // Scenario 1 (bis): followRedirects: true (default) - Temporary Redirect (302)
  it('should report a temporary redirecting link as alive (200) when followRedirects is true (default)', () => {
    const redirectLink = resultsFollowTrue.find(
      (r) => r.link === `http://${HOST}:${PORT}/redirect-temporary`
    )
    expect(redirectLink.status).toBe('alive')
    expect(redirectLink.status_code).toBe(200)
    expect(redirectLink.error_message).toContain('redirected to')
  })

  // Scenario 2: followRedirects: false - Permanent Redirect (301)
  it('should report a permanent redirecting link as error (301) when followRedirects is false', () => {
    const redirectLink = resultsFollowFalse.find(
      (r) => r.link === `http://${HOST}:${PORT}/redirect-permanent`
    )
    expect(redirectLink.status).toBe('error')
    expect(redirectLink.status_code).toBe(301)
    expect(redirectLink.error_message).toMatch(
      /redirected.*followRedirects is set to false/i
    )
  })

  // Scenario 2 (bis): followRedirects: false - Temporary Redirect (302)
  it('should report a temporary redirecting link as error (302) when followRedirects is false', () => {
    const redirectLink = resultsFollowFalse.find(
      (r) => r.link === `http://${HOST}:${PORT}/redirect-temporary`
    )
    expect(redirectLink.status).toBe('error')
    expect(redirectLink.status_code).toBe(302)
    expect(redirectLink.error_message).toMatch(
      /redirected.*followRedirects is set to false/i
    )
  })

  // Scenario 3: Non-redirecting link with followRedirects: false
  it('should report a non-redirecting link as alive (200) when followRedirects is false', () => {
    const okLink = resultsFollowFalse.find(
      (r) => r.link === `http://${HOST}:${PORT}/ok`
    )
    expect(okLink.status).toBe('alive')
    expect(okLink.status_code).toBe(200)
  })

  // Scenario 4: Non-redirecting link with followRedirects: true (default)
  it('should report a non-redirecting link as alive (200) when followRedirects is true (default)', () => {
    const okLink = resultsFollowTrue.find(
      (r) => r.link === `http://${HOST}:${PORT}/ok`
    )
    expect(okLink.status).toBe('alive')
    expect(okLink.status_code).toBe(200)
  })

  // Scenario 5: Link that results in an actual error (404) with followRedirects: false
  it('should report a 404 link as error (404) when followRedirects is false', () => {
    const notFoundLink = resultsFollowFalse.find(
      (r) => r.link === `http://${HOST}:${PORT}/not-found`
    )
    expect(notFoundLink.status).toBe('error')
    expect(notFoundLink.status_code).toBe(404)
  })

  // Scenario: Link that results in an actual error (404) with followRedirects: true (default)
  it('should report a 404 link as error (404) when followRedirects is true (default)', () => {
    const notFoundLink = resultsFollowTrue.find(
      (r) => r.link === `http://${HOST}:${PORT}/not-found`
    )
    expect(notFoundLink.status).toBe('error')
    expect(notFoundLink.status_code).toBe(404)
  })

  // Scenario: External redirect allowed when followRedirects is true
  it('should report an external redirecting link as alive (200 from example.com) when followRedirects is true', () => {
    const externalRedirectLink = resultsFollowTrue.find(
      (r) => r.link === `http://${HOST}:${PORT}/redirect-external`
    )
    expect(externalRedirectLink.status).toBe('alive')
    expect(externalRedirectLink.error_message).toContain(
      'redirected to https://example.com'
    )
  })

  // Scenario: External redirect disallowed when followRedirects is false
  it('should report an external redirecting link as error (301) when followRedirects is false', () => {
    const externalRedirectLink = resultsFollowFalse.find(
      (r) => r.link === `http://${HOST}:${PORT}/redirect-external`
    )
    expect(externalRedirectLink.status).toBe('error')
    expect(externalRedirectLink.status_code).toBe(301)
    expect(externalRedirectLink.error_message).toMatch(
      /redirected to https:\/\/example.com, but followRedirects is set to false/i
    )
  })

  // Scenario: Redirect loop when followRedirects is true (Puppeteer should eventually error out)
  it('should report a redirect loop as error when followRedirects is true', () => {
    const loopLink = resultsFollowTrue.find(
      (r) => r.link === `http://${HOST}:${PORT}/redirect-loop1`
    )
    expect(loopLink.status).toBe('error')
    expect(loopLink.error_message).toBeDefined()
  })

  // Scenario: Redirect loop when followRedirects is false
  it('should report a redirect loop as error (first redirect status) when followRedirects is false', () => {
    const loopLink = resultsFollowFalse.find(
      (r) => r.link === `http://${HOST}:${PORT}/redirect-loop1`
    )
    expect(loopLink.status).toBe('error')
    expect(loopLink.status_code).toBe(302)
    expect(loopLink.error_message).toMatch(
      /redirected.*followRedirects is set to false/i
    )
  })
})

import puppeteer from 'puppeteer'
import https from 'https'
import url from 'url'
import { checkFileExistence } from './check-file-links.js'

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36'
const DEFAULT_TIMEOUT = 30000

function isUrl(s) {
  try {
    new url.URL(s)
    return true
  } catch (err) {
    return false
  }
}

function getHostname(urlString) {
  try {
    return new url.URL(urlString).hostname
  } catch {
    return null
  }
}

function createLinkStatus(link, status, statusCode, errorMessage = null) {
  return {
    link: link.url,
    status,
    status_code: statusCode,
    line_number: link.position ? link.position.start.line : null,
    position: link.position,
    error_message: errorMessage,
  }
}

// Sleep helper for backoff and rate limit waits
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Parse Retry-After header value to milliseconds
function parseRetryAfter(headerValue) {
  if (!headerValue) return null
  const seconds = Number(headerValue)
  if (!isNaN(seconds)) {
    return Math.min(seconds * 1000, 60000) // Cap at 60s
  }
  // Try parsing as HTTP date
  const date = new Date(headerValue)
  if (!isNaN(date.getTime())) {
    const ms = date.getTime() - Date.now()
    return Math.min(Math.max(ms, 0), 60000) // Cap at 60s
  }
  return null
}

async function processLink(
  link,
  page,
  aliveStatusCodes,
  httpHeaders,
  followRedirects,
  timeout
) {
  let status = null
  let statusCode = null
  let errorMessage = null

  try {
    if (isUrl(link.url)) {
      const headers =
        httpHeaders.find((header) =>
          header.url.some((urlPattern) => link.url.includes(urlPattern))
        )?.headers || {}

      const response = await page.goto(link.url, {
        waitUntil: 'load',
        headers,
        timeout,
      })
      statusCode = response.status()
      const redirectChain = response.request().redirectChain()

      if (!followRedirects && redirectChain.length > 0) {
        status = 'error'
        const originalStatusCode = redirectChain[0].response().status()
        errorMessage = `Link redirected (from ${redirectChain[0].url()} status: ${originalStatusCode} to ${response.url()}), but followRedirects is set to false.`
        statusCode = originalStatusCode !== 0 ? originalStatusCode : statusCode
      } else if (aliveStatusCodes && aliveStatusCodes.includes(statusCode)) {
        status = 'assumed alive'
      } else if (statusCode === 304) {
        status = 'alive'
        if (redirectChain.length > 0) {
          errorMessage = `redirected to ${response.url()}`
        }
      } else {
        status = response.ok() ? 'alive' : 'error'
        if (status === 'alive' && redirectChain.length > 0) {
          errorMessage = `redirected to ${response.url()}`
        }
      }
    }
  } catch (error) {
    status = 'error'
    errorMessage = error.message
  }

  return createLinkStatus(link, status, statusCode, errorMessage)
}

// Simple semaphore for concurrency limiting
class Semaphore {
  constructor(max) {
    this.max = max
    this.count = 0
    this.queue = []
  }

  async acquire() {
    if (this.count < this.max) {
      this.count++
      return
    }
    return new Promise((resolve) => this.queue.push(resolve))
  }

  release() {
    if (this.queue.length > 0) {
      this.queue.shift()()
    } else {
      this.count--
    }
  }
}

// Page pool for reusing Puppeteer pages
class PagePool {
  constructor(browser, poolSize, userAgent) {
    this.browser = browser
    this.poolSize = poolSize
    this.userAgent = userAgent
    this.available = []
    this.creating = 0
    this.totalCreated = 0
    this.waitQueue = []
  }

  async _createPage() {
    const page = await this.browser.newPage()
    await page.setUserAgent(this.userAgent)
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      if (request.isInterceptResolutionHandled()) return
      const resourceType = request.resourceType()
      if (
        resourceType === 'font' ||
        resourceType === 'image' ||
        resourceType === 'media' ||
        resourceType === 'script' ||
        resourceType === 'stylesheet' ||
        resourceType === 'other' ||
        resourceType === 'websocket'
      ) {
        request.abort()
      } else {
        request.continue()
      }
    })
    return page
  }

  async acquire() {
    if (this.available.length > 0) {
      return this.available.pop()
    }
    if (this.totalCreated < this.poolSize) {
      this.totalCreated++
      return this._createPage()
    }
    return new Promise((resolve) => this.waitQueue.push(resolve))
  }

  release(page) {
    if (this.waitQueue.length > 0) {
      this.waitQueue.shift()(page)
    } else {
      this.available.push(page)
    }
  }

  async closeAll() {
    for (const page of this.available) {
      try {
        await page.close()
      } catch {}
    }
    this.available = []
  }
}

// Custom fetch that ignores SSL errors when configured
async function fetchIgnoringSsl(url, options) {
  // Node's native fetch doesn't support rejectUnauthorized,
  // so we use the https agent approach via undici dispatcher or
  // fall back to a custom approach for HTTPS URLs
  if (options._ignoreSslErrors && url.startsWith('https:')) {
    const { Agent } = await import('undici')
    const dispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    })
    const { signal, _ignoreSslErrors, ...rest } = options
    return fetch(url, { ...rest, signal, dispatcher })
  }
  const { _ignoreSslErrors, ...rest } = options
  return fetch(url, rest)
}

// Fetch a URL with retry, exponential backoff, and rate limit handling
async function fetchWithRetry(
  linkUrl,
  fetchOptions,
  {
    retryCount = 3,
    timeout = DEFAULT_TIMEOUT,
    userAgent = DEFAULT_USER_AGENT,
    ignoreSslErrors = false,
  }
) {
  let lastError = null
  let lastResponse = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetchIgnoringSsl(linkUrl, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          ...fetchOptions.headers,
          'User-Agent': userAgent,
        },
        _ignoreSslErrors: ignoreSslErrors,
      })
      clearTimeout(timeoutId)

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
        const waitMs =
          retryAfter || Math.min(1000 * Math.pow(2, attempt), 30000)
        if (attempt < retryCount) {
          await sleep(waitMs)
          continue
        }
        lastResponse = response
        break
      }

      return response
    } catch (error) {
      lastError = error
      if (attempt < retryCount) {
        // Exponential backoff: 1s, 2s, 4s...
        await sleep(Math.min(1000 * Math.pow(2, attempt), 10000))
      }
    }
  }

  // Return last response if we got one (e.g., 429 after all retries)
  if (lastResponse) return lastResponse
  // Otherwise throw the last error
  throw lastError
}

async function checkHyperlinks(nodes, options = {}, filePath) {
  const {
    batchSize = 100,
    retryCount = 3,
    aliveStatusCodes,
    httpHeaders = [],
    followRedirects = true,
    timeout = DEFAULT_TIMEOUT,
    userAgent = DEFAULT_USER_AGENT,
    ignoreSslErrors = false,
    urlCache = null,
    getBrowser = null,
    fetchSkipDomains = null,
    checkGithubArchived: checkGithubArchivedOpt = false,
  } = options
  const linkStatusList = []
  const tempArray = []

  const filteredNodes = nodes.filter(
    (node) =>
      node.type === 'link' ||
      node.type === 'definition' ||
      node.type === 'image'
  )

  // Concurrency controls for fetch pass
  const globalSemaphore = new Semaphore(20)
  const hostSemaphores = new Map()

  function getHostSemaphore(hostname) {
    if (!hostSemaphores.has(hostname)) {
      hostSemaphores.set(hostname, new Semaphore(5))
    }
    return hostSemaphores.get(hostname)
  }

  // First pass: concurrent fetch with per-host limits, retry, and backoff
  const fetchPromises = filteredNodes.map(async (link) => {
    try {
      if (isUrl(link.url)) {
        // Check global URL cache first
        if (urlCache && urlCache.has(link.url)) {
          const cached = urlCache.get(link.url)
          linkStatusList.push(
            createLinkStatus(
              link,
              cached.status,
              cached.status_code,
              cached.error_message
            )
          )
          return
        }

        // Check if this domain should skip fetch and go straight to Puppeteer
        const hostname = getHostname(link.url)
        if (fetchSkipDomains && hostname && fetchSkipDomains.has(hostname)) {
          tempArray.push(link)
          return
        }

        await globalSemaphore.acquire()
        const hostSem = getHostSemaphore(hostname)
        await hostSem.acquire()

        try {
          const fetchOptions = {
            method: 'HEAD',
            redirect: followRedirects ? 'follow' : 'manual',
          }

          // Authenticate GitHub requests to avoid 429 rate limiting
          const githubToken = process.env.GITHUB_TOKEN
          if (
            githubToken &&
            (hostname === 'github.com' || hostname === 'www.github.com')
          ) {
            fetchOptions.headers = {
              ...fetchOptions.headers,
              Authorization: `Bearer ${githubToken}`,
            }
          }

          const response = await fetchWithRetry(link.url, fetchOptions, {
            retryCount,
            timeout,
            userAgent,
            ignoreSslErrors,
          })
          const statusCode = response.status
          let message = null

          // Handle manual redirect
          if (
            !followRedirects &&
            (response.type === 'opaqueredirect' ||
              [301, 302, 307, 308].includes(statusCode))
          ) {
            const redirectedTo = response.headers.get('location')
            const errorMessage = `Link redirected${redirectedTo ? ' to ' + redirectedTo : ''}, but followRedirects is set to false.`
            const result = createLinkStatus(
              link,
              'error',
              statusCode === 0 && response.type === 'opaqueredirect'
                ? 302
                : statusCode,
              errorMessage
            )
            linkStatusList.push(result)
            if (urlCache) {
              urlCache.set(link.url, {
                status: 'error',
                status_code: result.status_code,
                error_message: errorMessage,
              })
            }
            return
          }

          if (response.ok || statusCode === 304) {
            message = response.redirected
              ? `redirected to ${response.url}`
              : null
            const result = createLinkStatus(link, 'alive', statusCode, message)
            linkStatusList.push(result)
            if (urlCache) {
              urlCache.set(link.url, {
                status: 'alive',
                status_code: statusCode,
                error_message: message,
              })
            }
            return
          } else if (
            aliveStatusCodes &&
            aliveStatusCodes.includes(statusCode)
          ) {
            const result = createLinkStatus(link, 'assumed alive', statusCode)
            linkStatusList.push(result)
            if (urlCache) {
              urlCache.set(link.url, {
                status: 'assumed alive',
                status_code: statusCode,
                error_message: null,
              })
            }
            return
          } else {
            tempArray.push(link)
          }
        } finally {
          hostSem.release()
          globalSemaphore.release()
        }
      } else {
        const fileStatus = checkFileExistence(link, filePath)
        const linkStatus = createLinkStatus(
          link,
          fileStatus.status,
          fileStatus.statusCode,
          fileStatus.errorMessage
        )
        linkStatusList.push(linkStatus)
      }
    } catch (error) {
      if (isUrl(link.url)) {
        tempArray.push(link)
      } else {
        const fileStatus = checkFileExistence(link, filePath)
        const linkStatus = createLinkStatus(
          link,
          fileStatus.status,
          fileStatus.statusCode,
          fileStatus.errorMessage
        )
        linkStatusList.push(linkStatus)
      }
    }
  })

  await Promise.all(fetchPromises)

  // Second pass: check failed links with Puppeteer using page pool
  if (tempArray.length > 0) {
    const linksToCheck = urlCache
      ? tempArray.filter((link) => {
          if (urlCache.has(link.url)) {
            const cached = urlCache.get(link.url)
            linkStatusList.push(
              createLinkStatus(
                link,
                cached.status,
                cached.status_code,
                cached.error_message
              )
            )
            return false
          }
          return true
        })
      : tempArray

    if (linksToCheck.length > 0) {
      const activeBrowser = getBrowser
        ? await getBrowser()
        : await puppeteer.launch({
            headless: 'new',
            args: ['--disable-features=DialMediaRouteProvider'],
          })
      const ownsBrowser = !getBrowser

      const pagePool = new PagePool(
        activeBrowser,
        Math.min(10, linksToCheck.length),
        userAgent
      )

      for (let i = 0; i < linksToCheck.length; i += batchSize) {
        const batch = linksToCheck.slice(i, i + batchSize)
        const promises = batch.map(async (link) => {
          const page = await pagePool.acquire()

          let retryCountLocal = 0
          let linkStatus

          while (retryCountLocal < retryCount) {
            try {
              linkStatus = await processLink(
                link,
                page,
                aliveStatusCodes,
                httpHeaders,
                followRedirects,
                timeout
              )
              break
            } catch (error) {
              retryCountLocal++
              if (retryCountLocal < retryCount) {
                await sleep(
                  Math.min(1000 * Math.pow(2, retryCountLocal), 10000)
                )
              }
            }
          }

          pagePool.release(page)

          // Track domain success for skip-list
          if (fetchSkipDomains && linkStatus) {
            const hostname = getHostname(link.url)
            if (hostname && linkStatus.status === 'alive') {
              const key = `__count_${hostname}`
              const count = (fetchSkipDomains._counts?.get(key) || 0) + 1
              if (!fetchSkipDomains._counts) {
                fetchSkipDomains._counts = new Map()
              }
              fetchSkipDomains._counts.set(key, count)
              if (count >= 2) {
                fetchSkipDomains.add(hostname)
              }
            }
          }

          // Cache the Puppeteer result
          if (urlCache && linkStatus) {
            urlCache.set(link.url, {
              status: linkStatus.status,
              status_code: linkStatus.status_code,
              error_message: linkStatus.error_message,
            })
          }

          linkStatusList.push(linkStatus)
        })

        await Promise.all(promises)
      }

      await pagePool.closeAll()
      if (ownsBrowser) {
        await activeBrowser.close()
      }
    }
  }
  if (checkGithubArchivedOpt) {
    await checkArchivedGithubRepos(linkStatusList)
  }

  return linkStatusList
}

// Extract owner/repo from a GitHub URL. Returns null if not a repo URL.
function extractGithubRepo(urlString) {
  try {
    const parsed = new url.URL(urlString)
    if (
      parsed.hostname !== 'github.com' &&
      parsed.hostname !== 'www.github.com'
    ) {
      return null
    }
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return `${parts[0]}/${parts[1]}`
  } catch {
    return null
  }
}

// Check alive GitHub links for archived repos via the GitHub API
async function checkArchivedGithubRepos(linkStatusList) {
  const token = process.env.GITHUB_TOKEN

  // Collect unique repos from alive GitHub links
  const repoToIndices = new Map()
  for (let i = 0; i < linkStatusList.length; i++) {
    const entry = linkStatusList[i]
    if (entry.status !== 'alive' && entry.status !== 'assumed alive') continue
    const repo = extractGithubRepo(entry.link)
    if (!repo) continue
    if (!repoToIndices.has(repo)) repoToIndices.set(repo, [])
    repoToIndices.get(repo).push(i)
  }

  if (repoToIndices.size === 0) return

  const semaphore = new Semaphore(5)
  const promises = []

  for (const [repo, indices] of repoToIndices) {
    promises.push(
      (async () => {
        await semaphore.acquire()
        try {
          const headers = {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'linkspector',
          }
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000)

          const response = await fetch(`https://api.github.com/repos/${repo}`, {
            headers,
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          if (response.ok) {
            const data = await response.json()
            if (data.archived === true) {
              for (const idx of indices) {
                linkStatusList[idx].status = 'warning'
                linkStatusList[idx].error_message = 'Repository is archived'
              }
            }
          }
        } catch {
          // Silently ignore API errors — archive check is best-effort
        } finally {
          semaphore.release()
        }
      })()
    )
  }

  await Promise.all(promises)
}

export { checkHyperlinks }

import puppeteer from 'puppeteer'
import url from 'url'
import { checkFileExistence } from './check-file-links.js'

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

async function processLink(
  link,
  page,
  aliveStatusCodes,
  httpHeaders,
  followRedirects
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
        waitUntil: 'load', // Puppeteer follows redirects by default.
        headers,
      })
      statusCode = response.status()
      const redirectChain = response.request().redirectChain()

      if (!followRedirects && redirectChain.length > 0) {
        // If followRedirects is false and there was a redirect
        status = 'error'
        const originalStatusCode = redirectChain[0].response().status()
        errorMessage = `Link redirected (from ${redirectChain[0].url()} status: ${originalStatusCode} to ${response.url()}), but followRedirects is set to false.`
        // We might want to use the original redirect status code if available and makes sense
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
    // Wait for a page to be returned
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

async function checkHyperlinks(nodes, options = {}, filePath) {
  const {
    batchSize = 100,
    retryCount = 3,
    aliveStatusCodes,
    httpHeaders = [],
    followRedirects = true,
    urlCache = null, // Global URL cache (Map): url -> {status, status_code, error_message}
    getBrowser = null, // Lazy browser getter function
    fetchSkipDomains = null, // Set of domains to skip fetch for
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

  // First pass: concurrent fetch with per-host limits
  const fetchPromises = filteredNodes.map(async (link) => {
    try {
      if (isUrl(link.url)) {
        // Check global URL cache first
        if (urlCache && urlCache.has(link.url)) {
          const cached = urlCache.get(link.url)
          linkStatusList.push(
            createLinkStatus(link, cached.status, cached.status_code, cached.error_message)
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
          const response = await fetch(link.url, fetchOptions)
          const statusCode = response.status
          let message = null

          // Handle manual redirect: if followRedirects is false and a redirect occurs
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
              urlCache.set(link.url, { status: 'error', status_code: result.status_code, error_message: errorMessage })
            }
            return
          }

          if (response.ok || statusCode === 304) {
            message = response.redirected ? `redirected to ${response.url}` : null
            const result = createLinkStatus(link, 'alive', statusCode, message)
            linkStatusList.push(result)
            if (urlCache) {
              urlCache.set(link.url, { status: 'alive', status_code: statusCode, error_message: message })
            }
            return
          } else if (aliveStatusCodes && aliveStatusCodes.includes(statusCode)) {
            const result = createLinkStatus(link, 'assumed alive', statusCode)
            linkStatusList.push(result)
            if (urlCache) {
              urlCache.set(link.url, { status: 'assumed alive', status_code: statusCode, error_message: null })
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
    // Filter out links already resolved from cache on second check
    const linksToCheck = urlCache
      ? tempArray.filter((link) => {
          if (urlCache.has(link.url)) {
            const cached = urlCache.get(link.url)
            linkStatusList.push(
              createLinkStatus(link, cached.status, cached.status_code, cached.error_message)
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
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36'
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
                followRedirects
              )
              break
            } catch (error) {
              retryCountLocal++
            }
          }

          pagePool.release(page)

          // Track domain success for skip-list
          if (fetchSkipDomains && linkStatus) {
            const hostname = getHostname(link.url)
            if (hostname && linkStatus.status === 'alive') {
              // This domain failed fetch but succeeded in Puppeteer - track it
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
  return linkStatusList
}

export { checkHyperlinks }

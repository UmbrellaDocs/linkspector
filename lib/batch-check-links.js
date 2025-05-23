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
      } else {
        status = response.ok() ? 'alive' : 'error'
      }
    }
  } catch (error) {
    status = 'error'
    errorMessage = error.message
  }

  return createLinkStatus(link, status, statusCode, errorMessage)
}

async function checkHyperlinks(nodes, options = {}, filePath) {
  const {
    batchSize = 100,
    retryCount = 3,
    aliveStatusCodes,
    httpHeaders = [],
    followRedirects = true, // Default to true if not provided
  } = options
  const linkStatusList = []
  const tempArray = []

  const filteredNodes = nodes.filter(
    (node) =>
      node.type === 'link' ||
      node.type === 'definition' ||
      node.type === 'image'
  )

  // First pass to check the links with default fetch
  for (let link of filteredNodes) {
    try {
      if (isUrl(link.url)) {
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
          const linkStatus = createLinkStatus(
            link,
            'error',
            statusCode === 0 && response.type === 'opaqueredirect'
              ? 302
              : statusCode, // Use 302 for opaque, else actual
            errorMessage
          )
          linkStatusList.push(linkStatus)
          continue
        }

        if (response.ok) {
          message = response.redirected ? `redirected to ${response.url}` : null
          const linkStatus = createLinkStatus(
            link,
            'alive',
            statusCode,
            message
          )
          linkStatusList.push(linkStatus)
          continue
        } else if (aliveStatusCodes && aliveStatusCodes.includes(statusCode)) {
          const linkStatus = createLinkStatus(link, 'assumed alive', statusCode)
          linkStatusList.push(linkStatus)
          continue
        } else {
          // If not ok, and not an explicit redirect handled above, or not in aliveStatusCodes
          tempArray.push(link)
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
  }

  // Second pass to check the failed links with puppeteer
  if (tempArray.length > 0) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--disable-features=DialMediaRouteProvider'],
    })
    for (let i = 0; i < tempArray.length; i += batchSize) {
      const batch = tempArray.slice(i, i + batchSize)
      const promises = batch.map(async (link) => {
        const page = await browser.newPage()
        await page.setUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36'
        )

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

        let retryCountLocal = 0
        let linkStatus

        while (retryCountLocal < retryCount) {
          try {
            linkStatus = await processLink(
              link,
              page,
              aliveStatusCodes,
              httpHeaders,
              followRedirects // Pass followRedirects here
            )
            break
          } catch (error) {
            retryCountLocal++
          }
        }

        await page.close()
        linkStatusList.push(linkStatus)
      })

      await Promise.all(promises)
    }
    await browser.close()
  }
  return linkStatusList
}

export { checkHyperlinks }

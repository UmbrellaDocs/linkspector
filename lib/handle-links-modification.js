/**
 * Modifies the URLs of the given nodes based on the provided options.
 *
 * @param {Array} nodes - The nodes to be modified.
 * @param {Object} [opts={}] - The options for modifying the URLs.
 * @param {Array} [opts.ignorePatterns=[]] - The patterns of URLs to be ignored.
 * @param {Array} [opts.replacementPatterns=[]] - The patterns of URLs to be replaced.
 * @param {string} [opts.baseUrl] - The base URL to be prefixed to URLs that start with '/'.
 *
 * @returns {Array} The modified nodes.
 */
import { escapeRegExp } from 'lodash-es'

function doReplacements(nodes, opts = {}) {
  const { ignorePatterns = [], replacementPatterns = [], baseUrl } = opts

  return nodes.filter((node) => {
    let { url } = node
    // Skip link checking if it matches any ignore pattern
    if (
      ignorePatterns.some(({ pattern }) => {
        // Sanitize the pattern before creating the RegExp
        const sanitizedPattern = escapeRegExp(pattern)
        const regex = new RegExp(sanitizedPattern)
        return regex.test(url)
      })
    ) {
      return false // Exclude this node
    }

    // Prefix the base URL to URLs that start with '/'
    if (baseUrl && url.startsWith('/')) {
      url = baseUrl + url
    }

    // Replace link URL based on replacement patterns
    replacementPatterns.forEach(({ pattern, replacement }) => {
      // Sanitize the pattern before creating the RegExp
      const sanitizedPattern = escapeRegExp(pattern)
      url = url.replace(new RegExp(sanitizedPattern), replacement)
    })
    node.url = url

    return true // Include this node
  })
}

export { doReplacements }

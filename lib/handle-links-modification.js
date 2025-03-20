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

function doReplacements(nodes, opts = {}) {
  const { ignorePatterns = [], replacementPatterns = [], baseUrl } = opts

  // Safer regex compilation with timeout protection
  function createSafeRegex(pattern) {
    try {
      // Validate pattern complexity before creating RegExp
      // Check for common problematic patterns that could lead to ReDoS
      if (
        pattern.includes('(.*)*') ||
        pattern.includes('(.+)+') ||
        pattern.match(/\([^)]+\)\+\+/) ||
        pattern.match(/\(\[.*?\]\+\)\+/) ||
        pattern.match(/\(a\+\)\+/)
      ) {
        console.warn(`Potentially unsafe regex pattern detected: ${pattern}`)
        return null
      }

      // Apply length limits for safety
      if (pattern.length > 100) {
        console.warn(
          `Pattern exceeds maximum safe length: ${pattern.substring(0, 50)}...`
        )
        return null
      }

      return new RegExp(pattern)
    } catch (e) {
      console.warn(`Invalid regex pattern: ${pattern}. Error: ${e.message}`)
      return null
    }
  }

  // Pre-compile regular expressions with safer approach
  const ignoreRegexes = ignorePatterns
    .map(({ pattern }) => createSafeRegex(pattern))
    .filter(Boolean)

  const replacementRegexes = replacementPatterns
    .map(({ pattern, replacement }) => {
      const regex = createSafeRegex(pattern)
      return regex ? { regex, replacement } : null
    })
    .filter(Boolean)

  return nodes.filter((node) => {
    let { url } = node

    // Skip link checking if it matches any ignore pattern
    if (
      ignoreRegexes.some((regex) => {
        try {
          return regex.test(url)
        } catch (e) {
          console.warn(`Error testing URL against pattern: ${e.message}`)
          return false
        }
      })
    ) {
      return false // Exclude this node
    }

    // Prefix the base URL to URLs that start with '/'
    if (baseUrl && url.startsWith('/')) {
      url = baseUrl + url
    }

    // Replace link URL based on replacement patterns
    replacementRegexes.forEach(({ regex, replacement }) => {
      try {
        // Use a safer string replace approach
        const oldUrl = url
        url = url.replace(regex, replacement)

        // If replacement leads to an extremely long string, revert
        if (url.length > oldUrl.length * 3 && url.length > 2000) {
          console.warn(`Suspicious replacement result detected. Reverting.`)
          url = oldUrl
        }
      } catch (e) {
        console.warn(`Error replacing URL: ${e.message}`)
      }
    })

    node.url = url
    return true // Include this node
  })
}

export { doReplacements }

'use strict'

export { getUniqueLinks }

function getUniqueLinks(astNodes) {
  const uniqueUrls = new Set()
  const result = []
  for (const node of astNodes) {
    // Check if the link starts with "#" or "mailto:" and skip it
    if (
      (node.type === 'link' ||
        node.type === 'definition' ||
        node.type === 'image') &&
      node.url &&
      !uniqueUrls.has(node.url) &&
      !node.url.startsWith('mailto:')
    ) {
      uniqueUrls.add(node.url)
      result.push(node)
    }
  }
  return result
}

/**
 * Updates the link status object with the given AST nodes and existing link status.
 *
 * @param {Array} astNodes - The AST nodes to update the link status with.
 * Each node is an object with properties `url`, `position`, `title`, and `children`.
 *
 * @param {Array} linkStatus - The existing link status to update.
 * Each status is an object with properties `link`, `status`, `status_code`, `line_number`, `position`, `error_message`, `title`, and `children`.
 *
 * @returns {Array} The updated link status. Each status is an object with properties `link`, `status`, `status_code`, `line_number`, `position`, `error_message`, `title`, and `children`.
 * The returned array is sorted by line number and start column in ascending order.
 */
'use strict'

function updateLinkStatusObj(astNodes, linkStatus) {
  const updatedLinkStatus = [...linkStatus]
  astNodes.forEach((node) => {
    const existingLink = linkStatus.find((link) => link.link === node.url)
    if (existingLink) {
      if (!existingLink.position) {
        console.error(
          `ERROR: Markdown formatting error around link: ${existingLink.link}. Please check the file containing this link.`
        )
        existingLink.position = {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 },
        }
      }

      const existingPosition = existingLink.position
      const nodePosition = node.position || {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
      }

      if (
        existingPosition.start.line !== nodePosition.start.line ||
        existingPosition.start.column !== nodePosition.start.column ||
        existingPosition.end.line !== nodePosition.end.line ||
        existingPosition.end.column !== nodePosition.end.column
      ) {
        updatedLinkStatus.push({
          ...existingLink,
          line_number: nodePosition.start.line,
          position: nodePosition,
        })
      }
    } else {
      let status = null
      let statusCode = null
      let errorMessage = null

      // Special handling for mailto links
      if (node.url && node.url.startsWith('mailto:')) {
        status = 'skipped'
        statusCode = 200
        errorMessage = 'Email links are not checked'
      }

      updatedLinkStatus.push({
        link: node.url,
        status: status,
        status_code: statusCode,
        line_number: node.position ? node.position.start.line : null,
        position: node.position,
        error_message: errorMessage,
        title: node.title,
        children: node.children,
      })
    }
  })
  updatedLinkStatus.sort((a, b) => {
    if (a.position.start.line === b.position.start.line) {
      return a.position.start.column - b.position.start.column
    }
    return a.position.start.line - b.position.start.line
  })
  return updatedLinkStatus
}

export { updateLinkStatusObj }

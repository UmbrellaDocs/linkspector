import fs from 'fs'
import path from 'path'

/**
 * Validate internal references against available anchors
 * @param {Array} internalRefs - Internal references to validate
 * @param {Array} anchors - Available anchors in current document
 * @param {String} filePath - Current file path for error reporting
 * @returns {Array} Validation results
 */
async function validateInternalReferences(internalRefs, anchors, filePath) {
  const results = []

  // Build anchor lookup
  const anchorMap = new Map()
  const duplicates = new Set()

  anchors.forEach((anchor) => {
    if (anchorMap.has(anchor.id)) {
      duplicates.add(anchor.id)
      results.push({
        filePath,
        line: anchor.line,
        column: 1,
        message: `Duplicate anchor found: '${anchor.id}'. First defined at line ${anchorMap.get(anchor.id).line}.`,
        status: 'error',
      })
    } else {
      anchorMap.set(anchor.id, anchor)
    }
  })

  // Validate internal references
  internalRefs.forEach((ref) => {
    if (!anchorMap.has(ref.id)) {
      results.push({
        filePath,
        line: ref.line,
        column: 1,
        message: `Cannot find anchor: '${ref.id}' in current document.`,
        status: 'error',
      })
    }
  })

  return results
}

/**
 * Validate external references (file existence and anchor existence)
 * @param {Array} externalRefs - External references to validate
 * @param {String} currentFilePath - Current file path for relative resolution
 * @returns {Array} Validation results
 */
async function validateExternalReferences(externalRefs, currentFilePath) {
  const results = []

  for (const ref of externalRefs) {
    // Check file existence
    if (!fs.existsSync(ref.file)) {
      results.push({
        filePath: currentFilePath,
        line: ref.line,
        column: 1,
        message: `Cannot find referenced file: '${path.relative(path.dirname(currentFilePath), ref.file)}'`,
        status: 'error',
      })
      continue
    }

    // Check anchor existence (if specified)
    if (ref.anchor) {
      try {
        const content = fs.readFileSync(ref.file, 'utf8')
        const anchorExists =
          content.includes(`[[${ref.anchor}]]`) ||
          content.includes(`[#${ref.anchor}]`) ||
          content.includes(`anchor:${ref.anchor}[`)

        if (!anchorExists) {
          results.push({
            filePath: currentFilePath,
            line: ref.line,
            column: 1,
            message: `Cannot find anchor '${ref.anchor}' in file '${path.relative(path.dirname(currentFilePath), ref.file)}'`,
            status: 'error',
          })
        }
      } catch (error) {
        results.push({
          filePath: currentFilePath,
          line: ref.line,
          column: 1,
          message: `Error reading referenced file: '${path.relative(path.dirname(currentFilePath), ref.file)}'`,
          status: 'error',
        })
      }
    }
  }

  return results
}

/**
 * Validate local file references
 * @param {Array} localFiles - Local file references to validate
 * @param {String} currentFilePath - Current file path
 * @returns {Array} Validation results
 */
async function validateLocalFiles(localFiles, currentFilePath) {
  const results = []

  localFiles.forEach((fileRef) => {
    if (!fs.existsSync(fileRef.file)) {
      results.push({
        filePath: currentFilePath,
        line: fileRef.line,
        column: 1,
        message: `Cannot find referenced file: '${path.relative(path.dirname(currentFilePath), fileRef.file)}'`,
        status: 'error',
      })
    }
  })

  return results
}

/**
 * Validate URLs for reachability
 * @param {Array} externalUrls - URLs to validate
 * @param {Array} aliveStatusCodes - Acceptable HTTP status codes
 * @param {String} currentFilePath - Current file path for error reporting
 * @returns {Array} Validation results
 */
async function validateUrls(externalUrls, aliveStatusCodes, currentFilePath) {
  const results = []

  // Remove duplicates for efficiency
  const uniqueUrls = Array.from(new Set(externalUrls.map((u) => u.url))).map(
    (url) => externalUrls.find((u) => u.url === url)
  )

  // Note: URL validation will be handled by the existing linkspector infrastructure
  // This function is prepared for future integration with link-check functionality

  return results
}

/**
 * Get all anchor definitions from AsciiDoc content
 * This function extracts anchors that can be referenced by internal references
 * @param {String} content - AsciiDoc file content
 * @returns {Set} Set of available anchor IDs
 */
function getAvailableAnchors(content) {
  const anchors = new Set()
  const lines = content.split('\n')
  let insideCommentBlock = false

  lines.forEach((line) => {
    // Handle comment blocks
    if (line.trim().startsWith('////')) {
      insideCommentBlock = !insideCommentBlock
      return
    }

    // Skip content inside comment blocks
    if (insideCommentBlock) return

    // Skip single line comments
    if (line.trim().startsWith('//')) return

    // Extract block anchors: [[anchor]] or [[anchor, description]]
    const blockAnchors = line.match(/\[\[([^\]]+)\]\]/g)
    if (blockAnchors) {
      blockAnchors.forEach((anchor) => {
        const id = anchor
          .replace(/^\[\[|\]\]$/g, '')
          .split(',')[0]
          .trim()
        anchors.add(id)
      })
    }

    // Extract bibliography anchors: [[[anchor]]] (only in list items)
    if (line.match(/^[\s]*[\*\-][\s]+\[\[\[([^\]]+)\]\]\]/)) {
      const bibAnchors = line.match(/\[\[\[([^\]]+)\]\]\]/g)
      if (bibAnchors) {
        bibAnchors.forEach((anchor) => {
          const id = anchor
            .replace(/^\[\[\[|\]\]\]$/g, '')
            .split(',')[0]
            .trim()
          anchors.add(id)
        })
      }
    }

    // Extract inline anchors: [#anchor-name]
    const inlineAnchors = line.match(/\[#([^\]]+)\]/g)
    if (inlineAnchors) {
      inlineAnchors.forEach((anchor) => {
        const id = anchor.replace(/^\[#|\]$/g, '')
        anchors.add(id)
      })
    }

    // Extract anchor macros: anchor:anchor-name[text]
    const anchorMacros = line.match(/anchor:([^\[]+)\[/g)
    if (anchorMacros) {
      anchorMacros.forEach((macro) => {
        const id = macro.replace(/^anchor:|$/g, '').replace(/\[$/g, '')
        anchors.add(id)
      })
    }
  })

  return anchors
}

/**
 * Comprehensive validation of all AsciiDoc references
 * @param {Object} references - Parsed references from parseAsciiDocContent
 * @param {String} filePath - Current file path
 * @param {Object} options - Validation options
 * @returns {Array} All validation results
 */
async function validateAllReferences(references, filePath, options = {}) {
  const results = []

  // Validate internal references
  const internalResults = await validateInternalReferences(
    references.internalRefs,
    references.anchors,
    filePath
  )
  results.push(...internalResults)

  // Validate external references
  const externalResults = await validateExternalReferences(
    references.externalRefs,
    filePath
  )
  results.push(...externalResults)

  // Validate local files
  const fileResults = await validateLocalFiles(references.localFiles, filePath)
  results.push(...fileResults)

  // URL validation will be handled by existing linkspector URL checking
  // but we prepare the structure for future integration
  if (options.checkUrls && options.aliveStatusCodes) {
    const urlResults = await validateUrls(
      references.externalUrls,
      options.aliveStatusCodes,
      filePath
    )
    results.push(...urlResults)
  }

  return results
}

export {
  validateInternalReferences,
  validateExternalReferences,
  validateLocalFiles,
  validateUrls,
  validateAllReferences,
  getAvailableAnchors,
}

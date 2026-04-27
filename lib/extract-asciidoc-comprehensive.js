import fs from 'fs'
import path from 'path'
import { doReplacements } from './handle-links-modification.js'

/**
 * Extract all AsciiDoc references from file content
 * @param {String} filePath - Path to AsciiDoc file
 * @param {Object} options - Configuration options
 * @returns {Object} Comprehensive link data
 */
function extractAsciiDocReferences(filePath, options) {
  return new Promise((resolve, reject) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const result = parseAsciiDocContent(content, filePath)

      // Convert to the format expected by the rest of linkspector
      const linkNodes = []

      // Add HTTP/HTTPS URLs as link nodes for backward compatibility
      result.externalUrls.forEach((url) => {
        linkNodes.push({
          type: 'link',
          title: null,
          url: url.url,
          children: [],
          position: {
            start: {
              line: url.line,
              column: 1,
              offset: 0,
            },
            end: {
              line: url.line,
              column: url.url.length,
              offset: url.url.length,
            },
          },
        })
      })

      // Return processed links through doReplacements for consistency
      const links = doReplacements(linkNodes, options)
      resolve({ links, anchorCount: result.anchors.length })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Parse AsciiDoc content and extract all reference types
 * @param {String} content - File content
 * @param {String} filePath - Path to the file
 * @returns {Object} Parsed references
 */
function parseAsciiDocContent(content, filePath) {
  const lines = content.split('\n')
  const folderPath = path.dirname(filePath)
  let insideCommentBlock = false

  const result = {
    anchors: [],
    internalRefs: [],
    externalRefs: [],
    externalUrls: [],
    localFiles: [],
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1

    // Handle comment blocks
    if (line.trim().startsWith('////')) {
      insideCommentBlock = !insideCommentBlock
      return
    }

    // Skip content inside comment blocks
    if (insideCommentBlock) return

    // Skip single line comments
    if (line.trim().startsWith('//')) return

    // Extract anchors (4 types)
    extractBlockAnchors(line, lineNumber, result.anchors)
    extractBibliographyAnchors(line, lineNumber, result.anchors)
    extractInlineAnchors(line, lineNumber, result.anchors)
    extractAnchorMacros(line, lineNumber, result.anchors)

    // Extract references
    extractCrossReferences(line, lineNumber, folderPath, result)
    extractXrefMacros(line, lineNumber, folderPath, result)
    extractLinkMacros(line, lineNumber, folderPath, result)
    extractDirectUrls(line, lineNumber, result.externalUrls)
  })

  return result
}

// 1. Block Anchors: [[anchor]] or [[anchor, description]]
function extractBlockAnchors(line, lineNumber, anchors) {
  // Skip if this line contains bibliography anchors [[[...]]]
  if (line.match(/\[\[\[.*?\]\]\]/)) {
    return
  }

  const regex = /\[\[([^\]]+)\]\]/g
  let match
  while ((match = regex.exec(line)) !== null) {
    const fullMatch = match[1]
    const [id, description] = fullMatch.split(',').map((s) => s.trim())
    anchors.push({
      type: 'block',
      id: id,
      line: lineNumber,
      description: description || null,
    })
  }
}

// 2. Bibliography Anchors: [[[anchor]]] (only in list items)
function extractBibliographyAnchors(line, lineNumber, anchors) {
  const regex = /^[\s]*[\*\-][\s]+\[\[\[([^\]]+)\]\]\]/g
  let match
  while ((match = regex.exec(line)) !== null) {
    const fullMatch = match[1]
    const [id, description] = fullMatch.split(',').map((s) => s.trim())
    anchors.push({
      type: 'bibliography',
      id: id,
      line: lineNumber,
      description: description || null,
    })
  }
}

// 3. Inline Anchors: [#anchor-name]
function extractInlineAnchors(line, lineNumber, anchors) {
  const regex = /\[#([^\]]+)\]/g
  let match
  while ((match = regex.exec(line)) !== null) {
    anchors.push({
      type: 'inline',
      id: match[1],
      line: lineNumber,
    })
  }
}

// 4. Anchor Macros: anchor:anchor-name[text]
function extractAnchorMacros(line, lineNumber, anchors) {
  const regex = /(anchor:)([^\[]+)\[([^\]]*)\]/g
  let match
  while ((match = regex.exec(line)) !== null) {
    anchors.push({
      type: 'macro',
      id: match[2],
      line: lineNumber,
      text: match[3] || null,
    })
  }
}

// 5. Cross-References: <<anchor>> or <<anchor, text>> or <<file.adoc#anchor, text>>
function extractCrossReferences(line, lineNumber, folderPath, result) {
  const regex = /<<([^>]+)>>/g
  let match
  while ((match = regex.exec(line)) !== null) {
    const fullRef = match[1].trim()
    const [ref, text] = fullRef.split(',').map((s) => (s ? s.trim() : null))

    // Check if it's external (contains .adoc or #)
    if (ref.includes('.adoc') || ref.includes('#')) {
      // Auto-correct missing .adoc extension
      const normalizedRef = ref.replace(/(\.adoc)?#/, '.adoc#')
      const [file, anchor] = normalizedRef.split('#')

      result.externalRefs.push({
        file: path.resolve(folderPath, file),
        anchor: anchor || null,
        line: lineNumber,
        text: text || null,
      })
    } else {
      // Internal reference
      result.internalRefs.push({
        id: ref,
        line: lineNumber,
        text: text || null,
        type: 'shorthand',
      })
    }
  }
}

// 6. XRef Macros: xref:anchor[text] or xref:file.adoc#anchor[text]
function extractXrefMacros(line, lineNumber, folderPath, result) {
  // Match xref: followed by non-whitespace characters and then [
  // This ensures we match actual xref macros, not text containing "xref:"
  const regex = /xref:([^\s\[]+)\[([^\]]*)\]/g
  let match
  while ((match = regex.exec(line)) !== null) {
    const ref = match[1].trim()
    const text = match[2].trim()

    // Check if it's external
    if (ref.includes('.adoc') || ref.includes('#')) {
      // Auto-correct missing .adoc extension
      const normalizedRef = ref.replace(/(\.adoc)?#/, '.adoc#')
      const [file, anchor] = normalizedRef.split('#')

      result.externalRefs.push({
        file: path.resolve(folderPath, file),
        anchor: anchor || null,
        line: lineNumber,
        text: text || null,
      })
    } else {
      // Internal reference
      result.internalRefs.push({
        id: ref,
        line: lineNumber,
        text: text || null,
        type: 'xref',
      })
    }
  }
}

// 7. Link Macros: link:URI[description]
function extractLinkMacros(line, lineNumber, folderPath, result) {
  // Match link: followed by non-whitespace characters and then [
  // This ensures we match actual link macros, not text containing "link:"
  const regex = /link:([^\s\[]+)\[([^\]]*)\]/g
  let match
  while ((match = regex.exec(line)) !== null) {
    const uri = match[1].trim()
    const description = match[2].trim()

    if (uri.match(/^(http|https):\/\//)) {
      // External URL
      result.externalUrls.push({
        url: uri,
        line: lineNumber,
        text: description || null,
      })
    } else if (!uri.match(/^(ftp|irc|mailto):/)) {
      // Local file (skip unsupported protocols)
      // Handle HTML fragment dropping
      const cleanUri = uri.replace(/(\.html?5?)#.*/, '$1')
      result.localFiles.push({
        file: path.resolve(folderPath, cleanUri),
        line: lineNumber,
        text: description || null,
        fragment: uri.includes('#') ? uri.split('#')[1] : null,
      })
    }
  }
}

// 8. Direct URLs: https://example.com (auto-detected)
function extractDirectUrls(line, lineNumber, externalUrls) {
  const regex =
    /(?:^|<|[\s>\(\)\[\];])((https?|file|ftp|irc):\/\/[^\s\[\]<]*[^\s.,\[\]<\)])/g
  let match
  while ((match = regex.exec(line)) !== null) {
    externalUrls.push({
      url: match[1],
      line: lineNumber,
      text: null,
      type: 'direct',
    })
  }
}

/**
 * For backward compatibility, provide the same interface as extractAsciiDocLinks
 * This allows existing code to work while providing comprehensive data internally
 * @param {String} filePath - Path to AsciiDoc file
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of link nodes (for backward compatibility)
 */
function extractAsciiDocLinks(filePath, options) {
  return extractAsciiDocReferences(filePath, options)
}

export { extractAsciiDocReferences, extractAsciiDocLinks, parseAsciiDocContent }

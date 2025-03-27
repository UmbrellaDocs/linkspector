import fs from 'fs'
import path from 'path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import GithubSlugger from 'github-slugger'

const fileCache = {}

/**
 * Checks if a file and a section within the file exist.
 *
 * @param {Object} link - The link object.
 * @param {string} file - The current file path.
 * @returns {Object} An object containing the status code, status message, and error message (if any).
 */

function checkFileExistence(link, file) {
  // Initialize status code, status message, and error message
  let statusCode = '200'
  let status = 'alive'
  let errorMessage = ''

  try {
    let slugger = new GithubSlugger()
    // Split the URL into the file part and the section part
    const [urlWithoutSection = '', sectionId = null] = link.url.split('#')

    // Determine the file path
    const filePath = urlWithoutSection.startsWith('/')
      ? path.join(process.cwd(), urlWithoutSection)
      : urlWithoutSection === '' || urlWithoutSection === path.basename(file)
        ? file
        : path.resolve(path.dirname(file), urlWithoutSection)

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      statusCode = '404'
      status = 'error'
      errorMessage = `Cannot find: ${link.url}`
    } else if (sectionId) {
      // If the file exists and there's a section part in the URL, check if the section exists
      const mdContent = fs.readFileSync(filePath, 'utf8')

      // Check if the section ID is a line reference (e.g., L20 or L23-L50)
      const lineReferenceMatch = sectionId.match(/^L(\d+)(?:-L(\d+))?$/)

      if (lineReferenceMatch) {
        // Count the total number of lines in the file
        const totalLineCount = mdContent.split('\n').length

        // Extract line numbers from the reference
        const startLine = parseInt(lineReferenceMatch[1], 10)
        const endLine = lineReferenceMatch[2]
          ? parseInt(lineReferenceMatch[2], 10)
          : startLine

        // Check if the referenced line(s) are within the file's line count
        if (endLine > totalLineCount) {
          statusCode = '404'
          status = 'error'
          errorMessage = `Cannot find Line ${endLine} in file: ${filePath}. File has ${totalLineCount} lines.`
        }
      } else {
        // Use the cache if the file has been parsed before
        let tree = fileCache[filePath]
        if (!tree) {
          tree = unified().use(remarkParse).use(remarkGfm).parse(mdContent)
          fileCache[filePath] = tree // Store the parsed file in the cache
        }
        // Collect all heading IDs in the file
        // Use GitHub slugger to generate the heading slug for comparison
        const headingNodes = new Set()
        visit(tree, ['heading', 'html'], (node) => {
          if (node.type === 'heading') {
            const headingText = getText(node)
            const headingId =
              node.children[0].type === 'html'
                ? node.children[0].value.match(/name="(.+?)"/)?.[1]
                : node.children[0] &&
                    node.children[0].value &&
                    node.children[0].value.includes('{#')
                  ? node.children[0].value.match(/{#(.+?)}/)?.[1]
                  : slugger.slug(headingText)
            headingNodes.add(headingId)
          } else if (node.type === 'html') {
            // Match both name and id attributes in HTML anchors
            const anchorNameMatch = node.value.match(
              /<a\s+.*?(name|id)="(.+?)".*?>/
            )
            if (anchorNameMatch) {
              const anchorName = anchorNameMatch[2]
              headingNodes.add(anchorName)
            }
          }
        })

        // Decode the section ID from the URL
        const decodedSectionId = decodeURIComponent(sectionId)

        // Check if the section exists
        if (!headingNodes.has(decodedSectionId)) {
          statusCode = '404'
          status = 'error'
          errorMessage = `Cannot find section: #${sectionId} in file: ${filePath}.`
        }
      }
    }
  } catch (err) {
    console.error(`Error in checking if file ${link.url} exist! ${err}`)
  }

  // Return the status code, status message, and error message
  return { statusCode, status, errorMessage }
}

function getText(node) {
  /**
   * Get the text content of a node.
   * @param {Object} node - The node object.
   * @returns {string} The text content of the node.
   */
  if (
    node.type === 'text' ||
    node.type === 'inlineCode' ||
    node.type === 'image'
  ) {
    return node.type === 'image' ? node.alt : node.value
  }

  if (Array.isArray(node.children)) {
    return node.children.map(getText).join('')
  }

  return ''
}

export { checkFileExistence }

import fs from 'fs'
import path from 'path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import GithubSlugger from 'github-slugger'

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
      const tree = unified().use(remarkParse).use(remarkGfm).parse(mdContent)

      // Collect all heading IDs in the file
      // Use GitHub slugger to generate the heading slug for comparison
      const headingNodes = new Set()
      visit(tree, 'heading', (node) => {
        const headingText = node.children
          .map((child) => child.value || '')
          .join('')
        const headingId =
          node.children[0].type === 'html'
            ? node.children[0].value.match(/name="(.+?)"/)?.[1]
            : node.children[0].value.includes('{#')
              ? node.children[0].value.match(/{#(.+?)}/)?.[1]
              : slugger.slug(headingText)
        headingNodes.add(headingId)
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
  } catch (err) {
    console.error(`Error in checking if file ${link.url} exist! ${err}`)
  }

  // Return the status code, status message, and error message
  return { statusCode, status, errorMessage }
}

export { checkFileExistence }

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { validateConfig } from './lib/validate-config.js'
import { prepareFilesList } from './lib/prepare-file-list.js'
import { extractMarkdownHyperlinks } from './lib/extract-markdown-hyperlinks.js'
import { extractAsciiDocLinks } from './lib/extract-asciidoc-links.js'
import { getUniqueLinks } from './lib/get-unique-links.js'
import { checkHyperlinks } from './lib/batch-check-links.js'
import { updateLinkStatusObj } from './lib/update-linkstatus-obj.js'

// Function to check if git is installed
function isGitInstalled() {
  try {
    execSync('git --version', { stdio: 'ignore' })
    return true
  } catch (error) {
    return false
  }
}

export async function* linkspector(configFile, cmd) {
  //Use default configuration if no config file is specified
  let config = {}
  let defaultConfig = {
    dirs: ['.'],
    useGitIgnore: true,
  }

  try {
    let configContent = readFileSync(configFile, 'utf8')
    // parse configFile
    // Check if the YAML content is empty
    if (!configContent.trim()) {
      throw new Error('The configuration file is empty.')
    }

    // Parse the YAML content
    config = yaml.load(configContent)

    // Check if the parsed YAML object is null or lacks properties
    if (config === null || Object.keys(config).length === 0) {
      throw new Error('Failed to parse the YAML content.')
    }

    try {
      const isValid = await validateConfig(config)
      if (!isValid) {
        console.error('Validation failed!')
        process.exit(1)
      }
    } catch (error) {
      console.error(`💥 Error: Please check your configuration file.`)
      process.exit(1)
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      if (!cmd.json) {
        console.log(
          'Configuration file not found. Using default configuration.'
        )
      }
      config = defaultConfig
    } else {
      throw new Error(err)
    }
  }

  // Prepare the list of files to check
  let filesToCheck = prepareFilesList(config)

  // Convert all paths in filesToCheck to relative paths
  filesToCheck = filesToCheck.map((file) => path.relative(process.cwd(), file))

  // Check if only modified files should be checked
  if (config.modifiedFilesOnly) {
    // Check if git is installed
    if (!isGitInstalled()) {
      console.error(
        'Error: Git is not installed or not found in the system path.'
      )
      process.exit(1)
    }

    // Get the list of modified files from the last git commit
    const modifiedFiles = execSync('git diff --name-only HEAD HEAD~1', {
      encoding: 'utf8',
    }).split('\n')

    // Filter out files that are not in the list of files to check or do not have the correct extension
    const modifiedFilesToCheck = modifiedFiles.filter((file) => {
      const fileExtension = path.extname(file).substring(1).toLowerCase()
      return (
        filesToCheck.includes(file) &&
        (config.fileExtensions || ['md']).includes(fileExtension)
      )
    })

    // If no modified files are in the list of files to check, exit with a message
    if (modifiedFilesToCheck.length === 0) {
      if (cmd.json) {
        console.log('{}')
      } else {
        console.log(
          'Skipped link checking. Modified files are not specified in the configuration.'
        )
      }
      process.exit(0)
    }

    // Otherwise, only check the modified files
    filesToCheck = modifiedFilesToCheck
  }

  // Process each file
  for (const file of filesToCheck) {
    const relativeFilePath = path.relative(process.cwd(), file)

    // Get the file extension
    const fileExtension = path.extname(file).substring(1).toLowerCase() // Get the file extension without the leading dot and convert to lowercase

    let astNodes

    // Check the file extension and use the appropriate function to extract links
    if (
      ['asciidoc', 'adoc', 'asc'].includes(fileExtension) &&
      config.fileExtensions &&
      config.fileExtensions.includes(fileExtension)
    ) {
      astNodes = await extractAsciiDocLinks(file, config)
    } else {
      const fileContent = readFileSync(file, 'utf8')
      astNodes = extractMarkdownHyperlinks(fileContent, config)
    }

    // Get unique hyperlinks
    const uniqueLinks = getUniqueLinks(astNodes)

    // Check the status of hyperlinks
    const linkStatus = await checkHyperlinks(uniqueLinks, config, file)

    // Update linkStatusObjects with information about removed links
    const updatedLinkStatus = updateLinkStatusObj(astNodes, linkStatus, config)

    // Yield an object with the relative file path and its result
    yield {
      file: relativeFilePath,
      result: updatedLinkStatus,
    }
  }
}

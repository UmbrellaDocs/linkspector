import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import puppeteer from 'puppeteer'
import { validateConfig } from './lib/validate-config.js'
import { prepareFilesList } from './lib/prepare-file-list.js'
import { extractMarkdownHyperlinks } from './lib/extract-markdown-hyperlinks.js'
import { extractAsciiDocLinks } from './lib/extract-asciidoc-comprehensive.js'
import { getUniqueLinks } from './lib/get-unique-links.js'
import { checkHyperlinks } from './lib/batch-check-links.js'
import { updateLinkStatusObj } from './lib/update-linkstatus-obj.js'

// Function to replace placeholders with environment variables
function replaceEnvVariables(config) {
  const configString = JSON.stringify(config)
  const replacedConfigString = configString.replace(
    /\$\{(\w+)\}/g,
    (_, name) => process.env[name] || ''
  )
  return JSON.parse(replacedConfigString)
}

// Function to check if git is installed
function isGitInstalled() {
  try {
    execSync('git --version', { stdio: 'ignore' })
    return true
  } catch (error) {
    return false
  }
}

// Process a single file and return its results
async function processFile(
  file,
  config,
  urlCache,
  getBrowser,
  fetchSkipDomains
) {
  const relativeFilePath = path.relative(process.cwd(), file)
  const fileExtension = path.extname(file).substring(1).toLowerCase()

  let astNodes

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

  const uniqueLinks = getUniqueLinks(astNodes)

  const linkStatus = await checkHyperlinks(
    uniqueLinks,
    { ...config, urlCache, getBrowser, fetchSkipDomains },
    file
  )

  const updatedLinkStatus = updateLinkStatusObj(astNodes, linkStatus)

  return {
    file: relativeFilePath,
    result: updatedLinkStatus,
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
      if (!cmd.json) {
        console.log('Configuration file is empty. Using default configuration.')
      }
      config = defaultConfig
    } else {
      // Parse the YAML content
      config = yaml.load(configContent)

      // Check if the parsed YAML object is null or lacks properties
      if (config === null || Object.keys(config).length === 0) {
        if (!cmd.json) {
          console.log(
            'Configuration file has no valid settings. Using default configuration.'
          )
        }
        config = defaultConfig
      } else {
        // Replace environment variables in the configuration
        config = replaceEnvVariables(config)

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
      }
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
          'No modified files to check, skipping checking. To enable checking all files set modifiedFilesOnly: false and rerun the check.'
        )
      }
      process.exit(0)
    }

    // Otherwise, only check the modified files
    filesToCheck = modifiedFilesToCheck
  }

  // Global URL cache shared across all files
  const urlCache = new Map()

  // Domain skip-list: domains that fail fetch but succeed with Puppeteer
  const fetchSkipDomains = new Set()

  // Lazy browser launch — only created when first needed by Puppeteer pass
  let browser = null
  let browserPromise = null

  function getBrowser() {
    if (!browserPromise) {
      const launchArgs = ['--disable-features=DialMediaRouteProvider']
      if (config.ignoreSslErrors) {
        launchArgs.push('--ignore-certificate-errors')
      }
      browserPromise = puppeteer
        .launch({
          headless: 'new',
          args: launchArgs,
        })
        .then((b) => {
          browser = b
          return b
        })
    }
    return browserPromise
  }

  try {
    // Yield metadata so consumers know total file count upfront
    yield { type: 'meta', totalFiles: filesToCheck.length }

    // Process files in parallel batches
    const fileConcurrency = 5
    for (let i = 0; i < filesToCheck.length; i += fileConcurrency) {
      const batch = filesToCheck.slice(i, i + fileConcurrency)
      const results = await Promise.all(
        batch.map((file) =>
          processFile(file, config, urlCache, getBrowser, fetchSkipDomains)
        )
      )

      for (const result of results) {
        yield { type: 'file', file: result.file, result: result.result }
      }
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

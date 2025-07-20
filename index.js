#!/usr/bin/env node

import { program } from 'commander'
import kleur from 'kleur'
import ora from 'ora'
import { linkspector } from './linkspector.js'
import {
  validateAndFixRDJSON,
  createEmptyRDJSON,
  validateDiagnostic,
} from './lib/validate-rdjson.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pkg = require('./package.json')

program
  .version(pkg.version)
  .description('🔍 Uncover broken links in your content.')
  .command('check')
  .description('Check hyperlinks based on the configuration file.')
  .option('-c, --config <path>', 'Specify a custom configuration file path')
  .option('-j, --json', 'Output the results in JSON format')
  .option('-s, --showstat', 'Display statistics about the links checked')
  .action(async (cmd) => {
    // Validate that -j and -s options are not used together
    if (cmd.json && cmd.showstat) {
      console.error(
        kleur.red(
          'Error: The --json and --showstat options cannot be used together.'
        )
      )
      process.exit(1)
    }

    const configFile = cmd.config || '.linkspector.yml' // Use custom config file path if provided

    let currentFile = '' // Variable to store the current file name
    let results = [] // Array to store the results if json is true

    // Initialize statistics counters
    let stats = {
      filesChecked: 0,
      totalLinks: 0,
      httpLinks: 0,
      fileLinks: 0,
      emailLinks: 0,
      correctLinks: 0,
      failedLinks: 0,
    }

    const spinner = cmd.json ? null : ora().start()

    try {
      let hasErrorLinks = false
      // Initialize the results object
      let results = {
        source: {
          name: 'linkspector',
          url: 'https://github.com/UmbrellaDocs/linkspector',
        },
        severity: 'ERROR',
        diagnostics: [],
      }

      for await (const { file, result } of linkspector(configFile, cmd)) {
        // Update the current file name
        currentFile = file
        if (!cmd.json) {
          spinner.text = `Checking ${currentFile}...`
        }

        // Increment file count for statistics
        stats.filesChecked++

        for (const linkStatusObj of result) {
          // Count total links
          stats.totalLinks++

          // Count links by type
          if (linkStatusObj.link && linkStatusObj.link.match(/^https?:\/\//)) {
            stats.httpLinks++
          } else if (
            linkStatusObj.link &&
            linkStatusObj.link.startsWith('mailto:')
          ) {
            stats.emailLinks++
          } else if (
            linkStatusObj.link &&
            (linkStatusObj.link.startsWith('#') ||
              linkStatusObj.link.includes('.md') ||
              linkStatusObj.link.includes('#'))
          ) {
            stats.fileLinks++
          } else if (linkStatusObj.link) {
            // Count any remaining links as file links
            stats.fileLinks++
          }

          // Count correct vs failed links - Updated to handle skipped links
          if (linkStatusObj.status === 'error') {
            stats.failedLinks++
            if (cmd.json) {
              // Validate and fix the diagnostic before adding it
              const diagnostic = validateDiagnostic(
                {
                  message: `Cannot reach ${linkStatusObj.link} Status: ${linkStatusObj.status_code}${linkStatusObj.error_message ? ` ${linkStatusObj.error_message}` : ''}`,
                  location: {
                    path: currentFile,
                    range: {
                      start: {
                        line: linkStatusObj.line_number,
                        column: linkStatusObj.position.start.column,
                      },
                      end: {
                        line: linkStatusObj.position.end.line,
                        column: linkStatusObj.position.end.column,
                      },
                    },
                  },
                  severity: linkStatusObj.status.toUpperCase(),
                },
                currentFile
              )

              results.diagnostics.push(diagnostic)
            } else {
              // If json is false, print the results in the console
              spinner.stop()
              console.log(
                kleur.red(
                  `${currentFile}:${linkStatusObj.line_number}:${linkStatusObj.position.start.column}: 🚫 ${linkStatusObj.link} Status:${linkStatusObj.status_code}${linkStatusObj.error_message ? ` ${linkStatusObj.error_message}` : ' Cannot reach link'}`
                )
              )
              spinner.start(`Checking ${currentFile}...`)
            }
            hasErrorLinks = true
          } else if (
            linkStatusObj.status === 'alive' ||
            linkStatusObj.status === 'assumed alive'
          ) {
            stats.correctLinks++
          } else if (linkStatusObj.status === 'skipped') {
            // Skipped links don't count towards failed links
          } else {
            // Count other status as failed
            stats.failedLinks++
          }
        }
      }

      if (cmd.json) {
        let finalOutput

        // If there are no links with a status of "error", use empty RDJSON structure
        if (results.diagnostics.length === 0) {
          finalOutput = createEmptyRDJSON(hasErrorLinks)
        } else {
          finalOutput = results
        }

        // Validate and fix the RDJSON before outputting
        try {
          const validationResult = await validateAndFixRDJSON(finalOutput)

          if (validationResult.success) {
            // Output the validated/fixed RDJSON
            console.log(JSON.stringify(validationResult.data, null, 2))

            // Log validation messages to stderr if there were fixes applied
            if (
              validationResult.appliedFixes &&
              validationResult.appliedFixes.length > 0
            ) {
              console.error(
                `\n# RDJSON Validation: ${validationResult.message}`
              )
              console.error(
                `# Applied fixes: ${validationResult.appliedFixes.length}`
              )
            }
          } else {
            // If validation failed, output error message and fallback data
            console.error(
              `\n# RDJSON Validation Error: ${validationResult.message}`
            )

            // Try to output a minimal valid structure as fallback
            const fallbackOutput = createEmptyRDJSON(hasErrorLinks)
            console.log(JSON.stringify(fallbackOutput, null, 2))
          }
        } catch (error) {
          // If validation process itself fails, output error and fallback
          console.error(
            `\n# RDJSON Validation Process Failed: ${error.message}`
          )
          const fallbackOutput = createEmptyRDJSON(hasErrorLinks)
          console.log(JSON.stringify(fallbackOutput, null, 2))
        }
      }

      // Display statistics if --showstat option is used
      if (cmd.showstat) {
        spinner.stop()
        console.log('\n' + kleur.bold('💀📊 Linkspector check stats'))
        console.log('┌───────────────────────────────┬────────┐')
        console.log(
          `│ 🟰 ${kleur.bold('Total files checked')}        │ ${kleur.cyan(padNumber(stats.filesChecked))} │`
        )
        console.log('├───────────────────────────────┼────────┤')
        console.log(
          `│ 🔗 ${kleur.bold('Total links checked')}        │ ${kleur.cyan(padNumber(stats.totalLinks))} │`
        )
        console.log('├───────────────────────────────┼────────┤')
        console.log(
          `│ 🌐 ${kleur.bold('Hyperlinks')}                 │ ${kleur.cyan(padNumber(stats.httpLinks))} │`
        )
        console.log('├───────────────────────────────┼────────┤')
        console.log(
          `│ 📁 ${kleur.bold('File and header links')}      │ ${kleur.cyan(padNumber(stats.fileLinks))} │`
        )
        console.log('├───────────────────────────────┼────────┤')
        console.log(
          `│ ✉️  ${kleur.bold('Email links (Skipped)')}      │ ${kleur.cyan(padNumber(stats.emailLinks))} │`
        )
        console.log('├───────────────────────────────┼────────┤')
        console.log(
          `│ ✅ ${kleur.bold('Working links')}              │ ${kleur.green(padNumber(stats.correctLinks))} │`
        )
        console.log('├───────────────────────────────┼────────┤')
        console.log(
          `│ 🚫 ${kleur.bold('Failed links')}               │ ${kleur.red(padNumber(stats.failedLinks))} │`
        )
        console.log('└───────────────────────────────┴────────┘')
        console.log('')
      }

      if (!hasErrorLinks) {
        if (!cmd.json && !cmd.showstat) {
          spinner.stop()
          console.log(
            kleur.green(
              '✨ Success: All hyperlinks in the specified files are valid.'
            )
          )
        }
        process.exit(0)
      } else {
        if (!cmd.json && !cmd.showstat) {
          spinner.stop()
          console.error(
            kleur.red(
              '💥 Error: Some hyperlinks in the specified files are invalid.'
            )
          )
        } else if (cmd.showstat) {
          console.error(
            kleur.red(
              '💥 Error: Some hyperlinks in the specified files are invalid.'
            )
          )
        }
        process.exit(1)
      }
    } catch (error) {
      if (spinner) spinner.stop()
      console.error(kleur.red(`💥 Main error: ${error.message}`))
      process.exit(1)
    }

    // Helper function to pad numbers for consistent table formatting
    function padNumber(num) {
      return num.toString().padStart(6, ' ')
    }
  })

// Parse the command line arguments
program.parse(process.argv)

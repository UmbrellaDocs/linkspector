#!/usr/bin/env node

import { program } from 'commander'
import kleur from 'kleur'
import { linkspector } from './linkspector.js'
import {
  validateAndFixRDJSON,
  createEmptyRDJSON,
  validateDiagnostic,
} from './lib/validate-rdjson.js'
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

let pkg
try {
  const require = createRequire(import.meta.url)
  pkg = require('./package.json')
} catch {
  // Fallback for standalone binaries (e.g. Bun-compiled) where createRequire
  // cannot resolve package.json from the virtual filesystem.
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'))
  } catch {
    pkg = { version: 'unknown' }
  }
}

program
  .version(pkg.version)
  .description('\u{1F50D} Uncover broken links in your content.')
  .command('check')
  .description('Check hyperlinks based on the configuration file.')
  .option('-c, --config <path>', 'Specify a custom configuration file path')
  .option('-j, --json', 'Output the results in JSON format')
  .option('-s, --showstat', 'Display statistics about the links checked')
  .option('-q, --quiet', 'Suppress all output except errors')
  .option('-a, --check-archived', 'Warn about links to archived GitHub repos')
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

    // Validate that -q is not used with -j or -s
    if (cmd.quiet && (cmd.json || cmd.showstat)) {
      console.error(
        kleur.red(
          'Error: The --quiet option cannot be used with --json or --showstat.'
        )
      )
      process.exit(1)
    }

    const configFile = cmd.config || '.linkspector.yml'

    // Determine renderer: TUI for interactive terminals, plain for CI/pipes
    const isTUI =
      process.stdout.isTTY && !process.env.CI && !cmd.json && !cmd.quiet
    let renderer

    if (isTUI) {
      try {
        const { createTuiRenderer } =
          await import('./lib/renderers/tui-renderer.js')
        renderer = createTuiRenderer(cmd, pkg.version)
      } catch {
        // TUI not available (e.g. standalone binary) — fall back to plain
        const { createPlainRenderer } =
          await import('./lib/renderers/plain-renderer.js')
        renderer = createPlainRenderer(cmd)
      }
    } else {
      const { createPlainRenderer } =
        await import('./lib/renderers/plain-renderer.js')
      renderer = createPlainRenderer(cmd)
    }

    // Initialize statistics counters
    let stats = {
      filesChecked: 0,
      totalLinks: 0,
      httpLinks: 0,
      fileLinks: 0,
      emailLinks: 0,
      anchors: 0,
      correctLinks: 0,
      failedLinks: 0,
      warningLinks: 0,
    }

    // JSON results accumulator
    let results = {
      source: {
        name: 'linkspector',
        url: 'https://github.com/UmbrellaDocs/linkspector',
      },
      severity: 'ERROR',
      diagnostics: [],
    }

    try {
      let hasErrorLinks = false

      for await (const item of linkspector(configFile, cmd)) {
        // Handle metadata yield
        if (item.type === 'meta') {
          renderer.onStart(item.totalFiles)
          continue
        }

        // Handle file result yield
        const { file, result, anchorCount } = item
        renderer.onFileStart(file)

        stats.filesChecked++
        stats.anchors += anchorCount || 0

        for (const linkStatusObj of result) {
          stats.totalLinks++

          // Categorize link type
          if (linkStatusObj.link && linkStatusObj.link.match(/^https?:\/\//)) {
            stats.httpLinks++
          } else if (
            linkStatusObj.link &&
            linkStatusObj.link.startsWith('mailto:')
          ) {
            stats.emailLinks++
          } else if (linkStatusObj.link) {
            stats.fileLinks++
          }

          // Count correct vs failed links
          if (linkStatusObj.status === 'error') {
            stats.failedLinks++
            if (cmd.json) {
              const diagnostic = validateDiagnostic(
                {
                  message: `Cannot reach ${linkStatusObj.link} Status: ${linkStatusObj.status_code}${linkStatusObj.error_message ? ` ${linkStatusObj.error_message}` : ''}`,
                  location: {
                    path: file,
                    range: {
                      start: {
                        line: linkStatusObj.line_number,
                        column: linkStatusObj.position?.start?.column ?? 1,
                      },
                      end: {
                        line:
                          linkStatusObj.position?.end?.line ??
                          linkStatusObj.line_number,
                        column: linkStatusObj.position?.end?.column ?? 1,
                      },
                    },
                  },
                  severity: linkStatusObj.status.toUpperCase(),
                },
                file
              )
              results.diagnostics.push(diagnostic)
            } else {
              renderer.onError(file, linkStatusObj)
            }
            hasErrorLinks = true
          } else if (linkStatusObj.status === 'warning') {
            stats.warningLinks++
            stats.correctLinks++
            if (cmd.json) {
              const diagnostic = validateDiagnostic(
                {
                  message: `Archived repo: ${linkStatusObj.link}${linkStatusObj.error_message ? ` (${linkStatusObj.error_message})` : ''}`,
                  location: {
                    path: file,
                    range: {
                      start: {
                        line: linkStatusObj.line_number,
                        column: linkStatusObj.position?.start?.column ?? 1,
                      },
                      end: {
                        line:
                          linkStatusObj.position?.end?.line ??
                          linkStatusObj.line_number,
                        column: linkStatusObj.position?.end?.column ?? 1,
                      },
                    },
                  },
                  severity: 'WARNING',
                },
                file
              )
              results.diagnostics.push(diagnostic)
            } else {
              renderer.onWarning(file, linkStatusObj)
            }
          } else if (
            linkStatusObj.status === 'alive' ||
            linkStatusObj.status === 'assumed alive'
          ) {
            stats.correctLinks++
          } else if (linkStatusObj.status === 'skipped') {
            // Skipped links don't count towards failed links
          } else {
            stats.failedLinks++
          }
        }

        renderer.onFileComplete(file, result, stats)
      }

      // Handle JSON output
      if (cmd.json) {
        let finalOutput
        if (results.diagnostics.length === 0) {
          finalOutput = createEmptyRDJSON(hasErrorLinks)
        } else {
          finalOutput = results
        }

        try {
          const validationResult = await validateAndFixRDJSON(finalOutput)
          if (validationResult.success) {
            console.log(JSON.stringify(validationResult.data, null, 2))
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
            console.error(
              `\n# RDJSON Validation Error: ${validationResult.message}`
            )
            const fallbackOutput = createEmptyRDJSON(hasErrorLinks)
            console.log(JSON.stringify(fallbackOutput, null, 2))
          }
        } catch (error) {
          console.error(
            `\n# RDJSON Validation Process Failed: ${error.message}`
          )
          const fallbackOutput = createEmptyRDJSON(hasErrorLinks)
          console.log(JSON.stringify(fallbackOutput, null, 2))
        }
      }

      // Let the renderer show final output (non-JSON, non-quiet)
      if (!cmd.json && !cmd.quiet) {
        await renderer.onComplete(stats, hasErrorLinks)
      }

      process.exit(hasErrorLinks ? 1 : 0)
    } catch (error) {
      renderer.cleanup()
      console.error(kleur.red(`\u{1F4A5} Main error: ${error.message}`))
      process.exit(1)
    }
  })

// Parse the command line arguments
program.parse(process.argv)

import { describe, it, expect } from 'vitest'
import { linkspector } from '../../../linkspector.js'
import path from 'path'

describe('RDJSON Integration Tests', () => {
  const fixturesPath = path.join(
    process.cwd(),
    'test/fixtures/rdjson-validation'
  )

  it('should produce valid RDJSON output for files with broken links', async () => {
    const configFile = path.join(fixturesPath, 'test-config.yml')
    const cmd = { json: true }

    let results = {
      source: {
        name: 'linkspector',
        url: 'https://github.com/UmbrellaDocs/linkspector',
      },
      severity: 'ERROR',
      diagnostics: [],
    }

    let hasErrors = false

    for await (const { file, result } of linkspector(configFile, cmd)) {
      for (const linkStatusObj of result) {
        if (linkStatusObj.status === 'error') {
          hasErrors = true
          results.diagnostics.push({
            message: `Cannot reach ${linkStatusObj.link} Status: ${linkStatusObj.status_code}${linkStatusObj.error_message ? ` ${linkStatusObj.error_message}` : ''}`,
            location: {
              path: file,
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
          })
        }
      }
    }

    // Verify RDJSON structure
    expect(results).toHaveProperty('source')
    expect(results.source).toHaveProperty('name', 'linkspector')
    expect(results.source).toHaveProperty(
      'url',
      'https://github.com/UmbrellaDocs/linkspector'
    )
    expect(results).toHaveProperty('severity', 'ERROR')
    expect(results).toHaveProperty('diagnostics')
    expect(Array.isArray(results.diagnostics)).toBe(true)

    if (hasErrors) {
      expect(results.diagnostics.length).toBeGreaterThan(0)

      // Verify each diagnostic has required fields
      results.diagnostics.forEach((diagnostic) => {
        expect(diagnostic).toHaveProperty('message')
        expect(diagnostic).toHaveProperty('location')
        expect(diagnostic.location).toHaveProperty('path')
        expect(diagnostic.location).toHaveProperty('range')
        expect(diagnostic.location.range).toHaveProperty('start')
        expect(diagnostic.location.range.start).toHaveProperty('line')
        expect(diagnostic.location.range.start).toHaveProperty('column')
        expect(diagnostic).toHaveProperty('severity')
      })
    }
  }, 30000) // 30 second timeout for network requests

  it('should produce valid RDJSON output for files with no broken links', async () => {
    const configFile = path.join(fixturesPath, 'test-config-valid.yml')
    const cmd = { json: true }

    let results = {
      source: {
        name: 'linkspector',
        url: 'https://github.com/UmbrellaDocs/linkspector',
      },
      severity: 'INFO',
      diagnostics: [],
    }

    for await (const { file, result } of linkspector(configFile, cmd)) {
      for (const linkStatusObj of result) {
        if (linkStatusObj.status === 'error') {
          results.diagnostics.push({
            message: `Cannot reach ${linkStatusObj.link}`,
            location: {
              path: file,
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
            severity: 'ERROR',
          })
        }
      }
    }

    // Verify RDJSON structure for success case
    expect(results).toHaveProperty('source')
    expect(results.source).toHaveProperty('name', 'linkspector')
    expect(results.source).toHaveProperty(
      'url',
      'https://github.com/UmbrellaDocs/linkspector'
    )
    expect(results).toHaveProperty('severity', 'INFO')
    expect(results).toHaveProperty('diagnostics')
    expect(Array.isArray(results.diagnostics)).toBe(true)
    expect(results.diagnostics.length).toBe(0)
  }, 30000) // 30 second timeout for network requests
})

import { describe, it, expect } from 'vitest'
import {
  validateAndFixRDJSON,
  createEmptyRDJSON,
  validateDiagnostic,
} from '../../../lib/validate-rdjson.js'

describe('RDJSON Validation', () => {
  it('should validate valid RDJSON data', async () => {
    const validData = {
      source: {
        name: 'linkspector',
        url: 'https://github.com/UmbrellaDocs/linkspector',
      },
      severity: 'ERROR',
      diagnostics: [],
    }

    const result = await validateAndFixRDJSON(validData)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(validData)
    expect(result.message).toBe('RDJSON is valid')
  })

  it('should create empty RDJSON structure', () => {
    const emptyWithErrors = createEmptyRDJSON(true)
    expect(emptyWithErrors.severity).toBe('ERROR')
    expect(emptyWithErrors.diagnostics).toEqual([])

    const emptyWithoutErrors = createEmptyRDJSON(false)
    expect(emptyWithoutErrors.severity).toBe('INFO')
    expect(emptyWithoutErrors.diagnostics).toEqual([])
  })

  it('should validate and fix diagnostic objects', () => {
    const diagnostic = validateDiagnostic(
      {
        message: 'Test error',
        location: {
          path: 'test.md',
          range: {
            start: { line: 5 },
          },
        },
      },
      'test.md'
    )

    expect(diagnostic.message).toBe('Test error')
    expect(diagnostic.location.path).toBe('test.md')
    expect(diagnostic.location.range.start.line).toBe(5)
    expect(diagnostic.location.range.start.column).toBe(1)
    expect(diagnostic.location.range.end.line).toBe(5)
    expect(diagnostic.location.range.end.column).toBe(1)
    expect(diagnostic.severity).toBe('ERROR')
  })

  it('should handle invalid diagnostic objects', () => {
    const diagnostic = validateDiagnostic({}, 'test.md')

    expect(diagnostic.message).toBe('Unknown error')
    expect(diagnostic.location.path).toBe('test.md')
    expect(diagnostic.location.range.start.line).toBe(1)
    expect(diagnostic.location.range.start.column).toBe(1)
    expect(diagnostic.severity).toBe('ERROR')
  })

  it('should handle invalid line numbers', () => {
    const diagnostic = validateDiagnostic(
      {
        message: 'Test',
        location: {
          path: 'test.md',
          range: {
            start: { line: -5, column: 0 },
            end: { line: 0, column: -1 },
          },
        },
      },
      'test.md'
    )

    expect(diagnostic.location.range.start.line).toBe(1)
    expect(diagnostic.location.range.start.column).toBe(1)
    expect(diagnostic.location.range.end.line).toBe(1)
    expect(diagnostic.location.range.end.column).toBe(1)
  })

  it('should handle null or undefined input', async () => {
    const result1 = await validateAndFixRDJSON(null)
    expect(result1.success).toBe(false)
    expect(result1.message).toBe('Invalid input: RDJSON data must be an object')

    const result2 = await validateAndFixRDJSON(undefined)
    expect(result2.success).toBe(false)
    expect(result2.message).toBe('Invalid input: RDJSON data must be an object')
  })
})

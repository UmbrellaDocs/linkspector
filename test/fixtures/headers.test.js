import { expect, test, vi, beforeEach } from 'vitest'
import { checkHyperlinks } from '../../lib/batch-check-links.js'

// Add the environment variable substitution function that matches what's in linkspector.js
function replaceEnvVariables(obj) {
  const objString = JSON.stringify(obj)
  const replacedObjString = objString.replace(
    /\$\{(\w+)\}/g,
    (_, name) => process.env[name] || ''
  )
  return JSON.parse(replacedObjString)
}

// Mock puppeteer
vi.mock('puppeteer', () => {
  return {
    default: {
      launch: vi.fn().mockImplementation(() => {
        return {
          newPage: vi.fn().mockImplementation(() => {
            return {
              setUserAgent: vi.fn(),
              setRequestInterception: vi.fn(),
              on: vi.fn(),
              goto: vi.fn().mockImplementation((url, options) => {
                // Track which headers were passed
                capturedHeaders = options.headers || {}

                return {
                  status: vi.fn().mockReturnValue(200),
                  ok: vi.fn().mockReturnValue(true),
                }
              }),
              close: vi.fn(),
            }
          }),
          close: vi.fn(),
        }
      }),
    },
  }
})

// Variable to capture headers passed to page.goto
let capturedHeaders = {}

beforeEach(() => {
  // Reset captured headers before each test
  capturedHeaders = {}

  // Reset mocks
  vi.clearAllMocks()
})

test('applies correct HTTP headers based on URL patterns', async () => {
  // Prepare test data
  const nodes = [
    {
      type: 'link',
      url: 'https://example1.com/test',
      position: { start: { line: 1, column: 1 }, end: { line: 1, column: 30 } },
    },
  ]

  const httpHeaders = [
    {
      url: ['https://example1.com'],
      headers: {
        Authorization: 'Bearer token123',
        'X-Custom-Header': 'CustomValue',
      },
    },
  ]

  // Run the function
  await checkHyperlinks(nodes, { httpHeaders }, '/path/to/file')

  // Verify the correct headers were applied
  expect(capturedHeaders).toEqual({
    Authorization: 'Bearer token123',
    'X-Custom-Header': 'CustomValue',
  })
})

test('applies no headers when URL does not match patterns', async () => {
  // Prepare test data
  const nodes = [
    {
      type: 'link',
      url: 'https://different-domain.com/test',
      position: { start: { line: 1, column: 1 }, end: { line: 1, column: 30 } },
    },
  ]

  const httpHeaders = [
    {
      url: ['https://example1.com', 'https://example2.com'],
      headers: {
        Authorization: 'Bearer token123',
        'X-Custom-Header': 'CustomValue',
      },
    },
  ]

  // Run the function
  await checkHyperlinks(nodes, { httpHeaders }, '/path/to/file')

  // Verify no headers were applied for non-matching URL
  expect(capturedHeaders).toEqual({})
})

test('supports environment variable substitution in headers', async () => {
  // Mock process.env
  const originalEnv = process.env
  process.env = {
    ...originalEnv,
    AUTH_TOKEN: 'supersecrettoken',
  }

  // Prepare test data
  const nodes = [
    {
      type: 'link',
      url: 'https://example3.com/api',
      position: { start: { line: 1, column: 1 }, end: { line: 1, column: 30 } },
    },
  ]

  let httpHeaders = [
    {
      url: ['https://example3.com'],
      headers: {
        Authorization: 'Bearer ${AUTH_TOKEN}',
        'X-API-Key': 'fixed-value',
      },
    },
  ]

  // Process environment variables in headers similar to what linkspector.js does
  httpHeaders = replaceEnvVariables(httpHeaders)

  // Run the function
  await checkHyperlinks(nodes, { httpHeaders }, '/path/to/file')

  // Verify the headers with environment variable substitution
  expect(capturedHeaders).toEqual({
    Authorization: 'Bearer supersecrettoken',
    'X-API-Key': 'fixed-value',
  })

  // Restore original env
  process.env = originalEnv
})

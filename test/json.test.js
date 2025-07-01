import { describe, it, expect } from 'vitest'
import { updateLinkStatusObj } from '../lib/update-linkstatus-obj'

describe('updateLinkStatusObj', () => {
  it('should handle JSON parsing when file extension is json', () => {
    const astNodes = [
      {
        url: 'http://example.com',
        position: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 20 },
        },
      },
      {
        url: 'http://example.org',
        position: {
          start: { line: 2, column: 1 },
          end: { line: 2, column: 20 },
        },
      },
    ]
    const linkStatus = []
    const config = { fileExtensions: ['json'] }

    const result = updateLinkStatusObj(astNodes, linkStatus, config)

    expect(result).toEqual([
      {
        link: 'http://example.com',
        status: null,
        status_code: null,
        line_number: null,
        position: null,
        error_message: null,
        title: null,
        children: null,
      },
      {
        link: 'http://example.org',
        status: null,
        status_code: null,
        line_number: null,
        position: null,
        error_message: null,
        title: null,
        children: null,
      },
    ])
  })
})

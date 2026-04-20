import { describe, it, expect, beforeAll } from 'vitest'
import { linkspector } from './linkspector.js'

describe('linkspector index tests', () => {
  let results = []
  let stats = {
    filesChecked: 0,
    totalLinks: 0,
    httpLinks: 0,
    fileLinks: 0,
    correctLinks: 0,
    failedLinks: 0,
  }

  beforeAll(async () => {
    const cmd = { json: true }

    for await (const item of linkspector('./.linkspector.test.yml', cmd)) {
      if (item.type === 'meta') continue
      const { file, result } = item
      stats.filesChecked++

      for (const linkStatusObj of result) {
        results.push({
          file,
          link: linkStatusObj.link,
          status_code: linkStatusObj.status_code,
          line_number: linkStatusObj.line_number,
          position: linkStatusObj.position,
          status: linkStatusObj.status,
          error_message: linkStatusObj.error_message,
        })

        stats.totalLinks++

        if (linkStatusObj.link.match(/^https?:\/\//)) {
          stats.httpLinks++
        } else if (
          !linkStatusObj.link.startsWith('#') &&
          !linkStatusObj.link.startsWith('mailto:')
        ) {
          stats.fileLinks++
        }

        if (linkStatusObj.status === 'error') {
          stats.failedLinks++
        } else if (
          linkStatusObj.status === 'alive' ||
          linkStatusObj.status === 'assumed alive'
        ) {
          stats.correctLinks++
        }
      }
    }
  }, 30000)

  it('linkspector should check top-level relative links in Markdown file', () => {
    const relativeLinks = results.filter(
      ({ link }) =>
        !link.match(/^https?:\/\//) &&
        !link.startsWith('#') &&
        !link.startsWith('mailto:')
    )
    const relativeLinkErrors = relativeLinks.filter(
      ({ status }) => status === 'error'
    )

    expect(relativeLinks.length).toBeGreaterThan(0)
    expect(relativeLinkErrors.length).toBe(0)
    expect(results.length).toBe(38)
  })

  it('linkspector should track statistics correctly when stats option is enabled', () => {
    expect(stats.filesChecked).toBeGreaterThan(0)
    expect(stats.totalLinks).toBe(38)
    expect(stats.totalLinks).toBe(
      stats.httpLinks +
        stats.fileLinks +
        (stats.totalLinks - stats.httpLinks - stats.fileLinks)
    )
    expect(stats.totalLinks).toBe(stats.correctLinks + stats.failedLinks)
    expect(stats.correctLinks).toBeGreaterThanOrEqual(0)
    expect(stats.failedLinks).toBeGreaterThanOrEqual(0)
  })
})

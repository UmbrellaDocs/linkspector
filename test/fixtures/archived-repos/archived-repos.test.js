import { describe, it, expect } from 'vitest'
import { linkspector } from '../../../linkspector.js'

describe('GitHub archived repo detection', () => {
  it('should warn about archived repos when checkGithubArchived is enabled', async () => {
    const configFile = 'test/fixtures/archived-repos/config-archived.yml'
    const cmd = { json: true }
    const results = []

    for await (const item of linkspector(configFile, cmd)) {
      if (item.type === 'meta') continue
      for (const linkStatusObj of item.result) {
        results.push(linkStatusObj)
      }
    }

    const archivedLink = results.find(
      (r) =>
        r.link ===
        'https://github.com/gaurav-nelson/github-action-markdown-link-check'
    )
    const activeLink = results.find(
      (r) => r.link === 'https://github.com/UmbrellaDocs/linkspector'
    )

    expect(archivedLink).toBeDefined()
    expect(archivedLink.status).toBe('warning')
    expect(archivedLink.error_message).toBe('Repository is archived')

    expect(activeLink).toBeDefined()
    expect(activeLink.status).toBe('alive')
  })

  it('should not warn when checkGithubArchived is not enabled', async () => {
    const configFile = 'test/fixtures/archived-repos/config-archived.yml'
    const cmd = { json: true }
    const results = []

    // Override: read config but don't set checkGithubArchived
    // We use a separate config without checkGithubArchived
    for await (const item of linkspector(
      'test/fixtures/archived-repos/config-no-archived.yml',
      cmd
    )) {
      if (item.type === 'meta') continue
      for (const linkStatusObj of item.result) {
        results.push(linkStatusObj)
      }
    }

    const archivedLink = results.find(
      (r) =>
        r.link ===
        'https://github.com/gaurav-nelson/github-action-markdown-link-check'
    )

    expect(archivedLink).toBeDefined()
    expect(archivedLink.status).toBe('alive')
  })
})

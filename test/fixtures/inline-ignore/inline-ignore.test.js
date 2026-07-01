import { expect, test } from 'vitest'
import { linkspector } from '../../../linkspector.js'

let cmd = {
  json: true,
}

test('linkspector should skip links inside disable/enable comment blocks', async () => {
  let results = []

  for await (const item of linkspector(
    './test/fixtures/inline-ignore/inlineIgnoreTest.yml',
    cmd
  )) {
    if (item.type === 'meta') continue
    const { file, result } = item
    for (const linkStatusObj of result) {
      results.push({
        file,
        link: linkStatusObj.link,
        status_code: linkStatusObj.status_code,
        line_number: linkStatusObj.line_number,
        status: linkStatusObj.status,
      })
    }
  }

  const checkedLinks = results.map((r) => r.link)

  // Links that should be checked (outside disable blocks)
  expect(checkedLinks).toContain('https://www.google.com')
  expect(checkedLinks).toContain('https://github.com')
  expect(checkedLinks).toContain('https://www.example.com')
  expect(checkedLinks).toContain('https://www.wikipedia.org')

  // Links inside <!-- linkspector-disable --> blocks should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page1'
  )
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page2'
  )

  // Link after <!-- linkspector-disable-next-line --> should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page3'
  )

  // Links inside <!-- markdown-link-check-disable --> blocks should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page4'
  )

  // Link after <!-- markdown-link-check-disable-next-line --> should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page5'
  )

  // Link with <!-- markdown-link-check-disable-line --> on same line should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page8'
  )

  // Link after <!-- markdownlint-disable-next-line --> should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page9'
  )

  // Link with <!-- markdownlint-disable-line --> on same line should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page10'
  )

  // Link with <!-- linkspector-disable-line --> on same line should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page11'
  )

  // Links after unclosed <!-- linkspector-disable --> should be excluded
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page6'
  )
  expect(checkedLinks).not.toContain(
    'https://this-domain-does-not-exist-linkspector.example.com/page7'
  )

  // Valid links: google, github, example, wikipedia, bing
  expect(checkedLinks).toContain('https://www.bing.com')
  expect(results.length).toBe(5)
}, 30000)

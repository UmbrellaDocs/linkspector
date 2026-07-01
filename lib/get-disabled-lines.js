import { visit } from 'unist-util-visit'

const DIRECTIVE_RE =
  /^<!--\s*(linkspector-disable-next-line|linkspector-disable-line|linkspector-disable|linkspector-enable|markdown-link-check-disable-next-line|markdown-link-check-disable-line|markdown-link-check-disable|markdown-link-check-enable|markdownlint-disable-next-line|markdownlint-disable-line)\b.*?-->$/

function normalizeDirective(raw) {
  if (raw.endsWith('-disable-next-line')) return 'linkspector-disable-next-line'
  if (raw.endsWith('-disable-line')) return 'linkspector-disable-line'
  if (raw.endsWith('-disable')) return 'linkspector-disable'
  if (raw.endsWith('-enable')) return 'linkspector-enable'
  return raw
}

function getDisabledLines(tree) {
  const disabled = new Set()
  const comments = []

  visit(tree, 'html', (node) => {
    const value = node.value.trim()
    const match = DIRECTIVE_RE.exec(value)
    if (match) {
      comments.push({
        directive: normalizeDirective(match[1]),
        line: node.position.start.line,
      })
    }
  })

  let disableStart = null
  let disabledToEof = false

  for (const { directive, line } of comments) {
    switch (directive) {
      case 'linkspector-disable':
        if (disableStart === null) {
          disableStart = line
        }
        break
      case 'linkspector-enable':
        if (disableStart !== null) {
          for (let i = disableStart; i <= line; i++) {
            disabled.add(i)
          }
          disableStart = null
        }
        break
      case 'linkspector-disable-next-line':
        disabled.add(line + 1)
        break
      case 'linkspector-disable-line':
        disabled.add(line)
        break
    }
  }

  if (disableStart !== null) {
    disabledToEof = true
  }

  return {
    isDisabled(line) {
      if (disabled.has(line)) return true
      if (disabledToEof && line >= disableStart) return true
      return false
    },
  }
}

export { getDisabledLines }

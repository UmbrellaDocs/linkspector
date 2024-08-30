import fs from 'fs'
import readline from 'readline'
import { doReplacements } from './handle-links-modification.js'

function extractAsciiDocLinks(filePath, options) {
  return new Promise((resolve) => {
    const links = []
    const internalRefs = new Map()
    const externalRefs = new Map()
    const externalURLs = new Map()

    let insideCommentBlock = false

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    })

    let lineNumber = 0

    const urlRegex =
      /(?:https?|ftp|irc|mailto):\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g

    rl.on('line', (line) => {
      lineNumber++
      // Ignore comment blocks
      if (line.startsWith('////')) {
        insideCommentBlock = !insideCommentBlock
      }
      if (insideCommentBlock) {
        return
      }
      // Ignore single-line comments
      if (line.startsWith('//')) {
        return
      }
      // Extract external hyperlinks
      let match
      while ((match = urlRegex.exec(line)) !== null) {
        const url = match[0].replace(/^link:/, '') // Remove 'link:' prefix if present
        const position = {
          start: {
            line: lineNumber,
            column: match.index,
            offset: match.index,
          },
          end: {
            line: lineNumber,
            column: match.index + match[0].length,
            offset: match.index + match[0].length,
          },
        }
        const linkNode = {
          type: 'link',
          title: null,
          url,
          children: [],
          position,
        }
        const existingLink = links.find(
          (link) =>
            link.url === linkNode.url &&
            link.position.start.line === linkNode.position.start.line &&
            link.position.start.column === linkNode.position.start.column
        )
        if (!existingLink) {
          links.push(linkNode) // Add link to the array only if it's not already there
        }
        continue
      }
      // Extract internal and external references
      if (line.match(/\[\[[^\]]+\]\]/g)) {
        let extractLink = line.match(/\[\[[^\]]+\]\]/g)
        for (let i = 0; i < extractLink.length; i++) {
          let newAnchor = extractLink[i]
          newAnchor = newAnchor.replace('[[', '')
          newAnchor = newAnchor.replace(']]', '')
          newAnchor = newAnchor.replace(/,.*/g, '') // take into account ','
          const matchIndex = line.indexOf(extractLink[i]) // Get the index of the match
          const startColumn = matchIndex + 2 // Add 2 to account for the [[ characters
          const endColumn = startColumn + newAnchor.length
          const startPosition = {
            line: lineNumber,
            column: startColumn,
            offset: matchIndex,
          }
          const endPosition = {
            line: lineNumber,
            column: endColumn,
            offset: matchIndex + newAnchor.length,
          }
          const position = {
            start: startPosition,
            end: endPosition,
          }
          const linkNode = {
            type: 'internal-ref',
            title: null,
            url: newAnchor,
            children: [],
            position,
          }
          internalRefs.set(newAnchor, linkNode)
        }
        return
      }
      if (line.match(/^[\s]*[\*\-][\s]+\[\[\[[^\]]+\]\]\]/g)) {
        let extractLink = line.match(/\[\[\[[^\]]+\]\]\]/g)
        for (let i = 0; i < extractLink.length; i++) {
          let newAnchor = extractLink[i]
          newAnchor = newAnchor.replace('[[[', '')
          newAnchor = newAnchor.replace(']]]', '')
          newAnchor = newAnchor.replace(/,.*/g, '') // take into account ','
          const matchIndex = line.indexOf(extractLink[i]) // Get the index of the match
          const startColumn = matchIndex + 4 // Add 4 to account for the [*-] and [[[ characters
          const endColumn = startColumn + newAnchor.length
          const startPosition = {
            line: lineNumber,
            column: startColumn,
            offset: matchIndex,
          }
          const endPosition = {
            line: lineNumber,
            column: endColumn,
            offset: matchIndex + newAnchor.length,
          }
          const position = {
            start: startPosition,
            end: endPosition,
          }
          const linkNode = {
            type: 'internal-ref',
            title: null,
            url: newAnchor,
            children: [],
            position,
          }
          internalRefs.set(newAnchor, linkNode)
        }
        return
      }
      if (line.match(/\[#[^\]]+\]/g)) {
        const extractLink = line.match(/\[#[^\]]+\]/g)
        extractLink.forEach((link) => {
          const newAnchor = link.replace(/^\[#|]$/g, '')
          const matchIndex = line.indexOf(link) // Get the index of the match
          const startColumn = matchIndex + 2 // Add 2 to account for the [# characters
          const endColumn = startColumn + newAnchor.length
          const startPosition = {
            line: lineNumber,
            column: startColumn,
            offset: matchIndex,
          }
          const endPosition = {
            line: lineNumber,
            column: endColumn,
            offset: matchIndex + newAnchor.length,
          }
          const position = {
            start: startPosition,
            end: endPosition,
          }
          const linkNode = {
            type: 'internal-ref',
            title: null,
            url: newAnchor,
            children: [],
            position,
          }
          internalRefs.set(newAnchor, linkNode)
        })
        return
      }
      if (line.match(/(anchor:[^\[]+)\[[^\]]*\]/g)) {
        let extractLink = line.match(/(anchor:[^\[]+)\[[^\]]*\]/g)
        extractLink.forEach((link) => {
          let newAnchor = link.replace(/^anchor:|\[/g, '')

          const matchIndex = line.indexOf(link) // Get the index of the match
          const startColumn = matchIndex + 7 // Add 7 to account for the "anchor:" characters
          const endColumn = startColumn + newAnchor.length
          const startPosition = {
            line: lineNumber,
            column: startColumn,
            offset: matchIndex,
          }
          const endPosition = {
            line: lineNumber,
            column: endColumn,
            offset: matchIndex + newAnchor.length,
          }
          const position = {
            start: startPosition,
            end: endPosition,
          }
          const linkNode = {
            type: 'internal-ref',
            title: null,
            url: newAnchor,
            children: [],
            position,
          }
          internalRefs.set(newAnchor, linkNode)
        })
        return
      }
      if (line.match(/<<[^\>]+>>/g)) {
        let extractLink = line.match(/<<[^\>]+>>/g)
        for (let i = 0; i < extractLink.length; i++) {
          let newReference = extractLink[i]
          newReference = newReference.replace('<<', '')
          newReference = newReference.replace('>>', '')
          newReference = newReference.replace(/,.*/g, '') // take into account <<anchor, some text>>
          const matchIndex = line.indexOf(extractLink[i]) // Get the index of the match
          const startColumn = matchIndex + 2 // Add 2 to account for the << characters
          const endColumn = startColumn + newReference.length
          const startPosition = {
            line: lineNumber,
            column: startColumn,
            offset: matchIndex,
          }
          const endPosition = {
            line: lineNumber,
            column: endColumn,
            offset: matchIndex + newReference.length,
          }
          if (newReference.startsWith('#')) {
            const position = {
              start: startPosition,
              end: endPosition,
            }
            const linkNode = {
              type: 'internal-ref',
              title: null,
              url: newReference,
              children: [],
              position,
            }
            internalRefs.set(newReference, linkNode)
          } else if (newReference.match(/(\.adoc)|(\.asciidoc)|(\.asc)|(#)/g)) {
            newReference = newReference.replace(
              /(\.adoc|\.asciidoc|\.asc)(#)?/,
              function (_, extension) {
                return extension + '#'
              }
            )
            const position = {
              start: startPosition,
              end: endPosition,
            }
            const linkNode = {
              type: 'external-ref',
              title: null,
              url: newReference,
              children: [],
              position,
            }
            externalRefs.set(newReference, linkNode)
          } else {
            const position = {
              start: startPosition,
              end: endPosition,
            }
            const linkNode = {
              type: 'internal-ref',
              title: null,
              url: newReference,
              children: [],
              position,
            }
            internalRefs.set(newReference, linkNode)
          }
        }
        return
      }
      if (line.match(/xref:[^\[]+\[[^\]]*\]/g)) {
        let extractLink = line.match(/xref:[^\[]+\[[^\]]*\]/g)
        extractLink.forEach((link) => {
          let newReference = link.replace(/^xref:|\[/g, '')
          const matchIndex = line.indexOf(link) // Get the index of the match
          const startColumn = matchIndex + 5 // Add 5 to account for the "xref:" characters
          const endColumn = startColumn + newReference.length
          const startPosition = {
            line: lineNumber,
            column: startColumn,
            offset: matchIndex,
          }
          const endPosition = {
            line: lineNumber,
            column: endColumn,
            offset: matchIndex + newReference.length,
          }
          if (newReference.match(/(\.adoc)|(\.asciidoc)|(\.asc)|(#)/g)) {
            newReference = newReference.replace(
              /(\.adoc|\.asciidoc|\.asc)(#)?/,
              (_, extension) => extension + '#'
            )
            const position = {
              start: startPosition,
              end: endPosition,
            }
            const linkNode = {
              type: 'external-ref',
              title: null,
              url: newReference,
              children: [],
              position,
            }
            externalRefs.set(newReference, linkNode)
          } else {
            const position = {
              start: startPosition,
              end: endPosition,
            }
            const linkNode = {
              type: 'internal-ref',
              title: null,
              url: newReference,
              children: [],
              position,
            }
            internalRefs.set(newReference, linkNode)
          }
        })
        return
      }
      if (line.match(/link:[^\[]+\[[^\]]*\]/g)) {
        let extractLink = line.match(/link:[^\[]+\[[^\]]*\]/g)
        extractLink.forEach((link) => {
          let newReference = link.replace(/^link:|\[/g, '')
          const matchIndex = line.indexOf(link) // Get the index of the match
          const startColumn = matchIndex + 5 // Add 5 to account for the "link:" characters
          const endColumn = startColumn + newReference.length
          const startPosition = {
            line: lineNumber,
            column: startColumn,
            offset: matchIndex,
          }
          const endPosition = {
            line: lineNumber,
            column: endColumn,
            offset: matchIndex + newReference.length,
          }
          if (newReference.match(/^(https?:\/\/|ftp|irc|mailto):\/\//g)) {
            const position = {
              start: startPosition,
              end: endPosition,
            }
            const linkNode = {
              type: newReference.startsWith('http') ? 'link' : 'external-ref',
              title: null,
              url: newReference,
              children: [],
              position,
            }
            if (linkNode.type === 'link') {
              const existingLink = links.find(
                (link) =>
                  link.url === linkNode.url &&
                  link.position.start.line === linkNode.position.start.line &&
                  link.position.start.column === linkNode.position.start.column
              )
              if (!existingLink) {
                links.push(linkNode) // Add link to the array only if it's not already there
              }
            } else {
              externalRefs.set(newReference, linkNode)
            }
          } else {
            newReference = newReference.replace(/(\.html?5?)#.*/, '$1')
            const position = {
              start: startPosition,
              end: endPosition,
            }
            const linkNode = {
              type: 'external-ref',
              title: null,
              url: newReference,
              children: [],
              position,
            }
            externalRefs.set(newReference, linkNode)
          }
        })
        return
      }
      if (
        line.match(
          /(?:^|<|[\s>\(\)\[\];])((https?|file|ftp|irc):\/\/[^\s\[\]<]*[^\s.,\[\]<\)])/g
        )
      ) {
        let extractLink = line.match(
          /((https?|file|ftp|irc):\/\/[^\s\[\]<]*[^\s.,\[\]<\)])/g
        )
        for (let i = 0; i < extractLink.length; i++) {
          let newReference = extractLink[i]
          const matchIndex = line.indexOf(extractLink[i]) // Get the index of the match
          const startColumn = matchIndex
          const endColumn = startColumn + newReference.length
          const startPosition = {
            line: lineNumber,
            column: startColumn,
            offset: matchIndex,
          }
          const endPosition = {
            line: lineNumber,
            column: endColumn,
            offset: matchIndex + newReference.length,
          }
          const position = {
            start: startPosition,
            end: endPosition,
          }
          const linkNode = {
            type: 'link',
            title: null,
            url: newReference,
            children: [],
            position,
          }
          const existingLink = links.find(
            (link) =>
              link.url === linkNode.url &&
              link.position.start.line === linkNode.position.start.line &&
              link.position.start.column === linkNode.position.start.column
          )
          if (!existingLink) {
            links.push(linkNode) // Add link to the array only if it's not already there
          }
        }
        return
      }
    })
    rl.on('close', () => {
      const result = [
        ...links.values(),
        ...internalRefs.values(),
        ...externalRefs.values(),
        ...externalURLs.values(),
      ]
      resolve(doReplacements(result, options))
    })
  })
}

export { extractAsciiDocLinks }

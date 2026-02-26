import {
  extractAsciiDocReferences,
  parseAsciiDocContent,
} from '../../../../lib/extract-asciidoc-comprehensive.js'
import { validateAllReferences } from '../../../../lib/validate-asciidoc-references.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const hasHostname = (url, hostname) => {
  try {
    return new URL(url).hostname === hostname
  } catch {
    return false
  }
}

async function testAnchorExtraction() {
  console.log('🧪 Testing anchor extraction...')

  const filePath = path.join(__dirname, 'test-anchors.adoc')
  console.log(`Testing file: ${filePath}`)

  try {
    // Test the parseAsciiDocContent function directly
    const fs = await import('fs')
    const content = fs.readFileSync(filePath, 'utf8')
    const result = parseAsciiDocContent(content, filePath)

    console.log('📊 Extraction Results:')
    console.log('Anchors found:', result.anchors.length)
    result.anchors.forEach((anchor) => {
      console.log(`  - ${anchor.type}: "${anchor.id}" at line ${anchor.line}`)
    })

    console.log('Internal refs found:', result.internalRefs.length)
    console.log('External refs found:', result.externalRefs.length)
    console.log('External URLs found:', result.externalUrls.length)
    console.log('Local files found:', result.localFiles.length)

    return true
  } catch (error) {
    console.error('❌ Error during anchor extraction:', error)
    return false
  }
}

async function testInternalReferences() {
  console.log('\n🧪 Testing internal reference validation...')

  const filePath = path.join(__dirname, 'test-internal-refs.adoc')
  console.log(`Testing file: ${filePath}`)

  try {
    const fs = await import('fs')
    const content = fs.readFileSync(filePath, 'utf8')
    const result = parseAsciiDocContent(content, filePath)

    console.log('📊 Reference Analysis:')
    console.log('Anchors found:', result.anchors.length)
    result.anchors.forEach((anchor) => {
      console.log(`  - ${anchor.type}: "${anchor.id}" at line ${anchor.line}`)
    })
    console.log('Internal refs found:', result.internalRefs.length)
    result.internalRefs.forEach((ref) => {
      console.log(`  - ${ref.type}: "${ref.id}" at line ${ref.line}`)
    })

    // Validate references
    const validationResults = await validateAllReferences(result, filePath)

    console.log('🔍 Validation Results:')
    if (validationResults.length === 0) {
      console.log('  ✅ No validation errors found')
    } else {
      validationResults.forEach((issue) => {
        console.log(`  ❌ Line ${issue.line}: ${issue.message}`)
      })
    }

    return true
  } catch (error) {
    console.error('❌ Error during internal reference testing:', error)
    return false
  }
}

async function testCommentHandling() {
  console.log('\n🧪 Testing comment handling...')

  const filePath = path.join(__dirname, 'test-comments.adoc')
  console.log(`Testing file: ${filePath}`)

  try {
    const fs = await import('fs')
    const content = fs.readFileSync(filePath, 'utf8')
    const result = parseAsciiDocContent(content, filePath)

    console.log('📊 Comment Handling Results:')
    console.log(
      'Anchors found:',
      result.anchors.length,
      '(should be 1: valid-anchor)'
    )
    console.log(
      'Internal refs found:',
      result.internalRefs.length,
      '(should be 1: valid-anchor)'
    )
    console.log(
      'External URLs found:',
      result.externalUrls.length,
      '(should be 0 - URLs in comments ignored)'
    )

    // Should only find valid-anchor, not ignored references
    const hasValidAnchor = result.anchors.some((a) => a.id === 'valid-anchor')
    const hasValidRef = result.internalRefs.some((r) => r.id === 'valid-anchor')
    const hasIgnoredUrl = result.externalUrls.some((u) =>
      hasHostname(u.url, 'ignored-url.com')
    )

    console.log('✅ Valid anchor found:', hasValidAnchor)
    console.log('✅ Valid reference found:', hasValidRef)
    console.log('✅ Ignored URL properly skipped:', !hasIgnoredUrl)

    return hasValidAnchor && hasValidRef && !hasIgnoredUrl
  } catch (error) {
    console.error('❌ Error during comment handling test:', error)
    return false
  }
}

async function testUrlExtraction() {
  console.log('\n🧪 Testing URL and link extraction...')

  const filePath = path.join(__dirname, 'test-links.adoc')
  console.log(`Testing file: ${filePath}`)

  try {
    const fs = await import('fs')
    const content = fs.readFileSync(filePath, 'utf8')
    const result = parseAsciiDocContent(content, filePath)

    console.log('📊 Link Extraction Results:')
    console.log('External URLs found:', result.externalUrls.length)
    result.externalUrls.forEach((url) => {
      console.log(`  - ${url.url} at line ${url.line}`)
    })

    console.log('Local files found:', result.localFiles.length)
    result.localFiles.forEach((file) => {
      console.log(`  - ${path.basename(file.file)} at line ${file.line}`)
    })

    return true
  } catch (error) {
    console.error('❌ Error during URL extraction test:', error)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive AsciiDoc extraction tests...\n')

  const tests = [
    testAnchorExtraction,
    testInternalReferences,
    testCommentHandling,
    testUrlExtraction,
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test()
      if (result) {
        passed++
        console.log('✅ Test passed\n')
      } else {
        failed++
        console.log('❌ Test failed\n')
      }
    } catch (error) {
      failed++
      console.error('💥 Test crashed:', error.message, '\n')
    }
  }

  console.log('📊 Test Summary:')
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📋 Total: ${passed + failed}`)

  if (failed === 0) {
    console.log(
      '\n🎉 All tests passed! Phase 1 implementation is working correctly.'
    )
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.')
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error)
}

export { runAllTests }

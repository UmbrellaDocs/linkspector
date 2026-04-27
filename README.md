[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-action%20linkspector-brightgreen?style=for-the-badge)](https://github.com/marketplace/actions/run-linkspector-with-reviewdog)
[![NPM](https://img.shields.io/npm/v/@umbrelladocs/linkspector?style=for-the-badge)](https://www.npmjs.com/package/@umbrelladocs/linkspector)
[![MCP](https://img.shields.io/badge/MCP%20Server-Linkspector_MCP-brightgreen?logo=modelcontextprotocol&style=for-the-badge)](https://github.com/UmbrellaDocs/linkspector-mcp)
<a href="https://liberapay.com/gaurav-nelson/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg"></a>

<p align="center">
  <a href="https://github.com/UmbrellaDocs/linkspector"><img src="https://i.ibb.co/VD70DX3/linkspectorelogonewtransparentupscale.png" alt="Logo" height=170></a>
</p>
<h3 align="center">Uncover broken links in your content.</h3>
<h1 align="center">Linkspector</h1>

Linkspector is a CLI tool that checks for dead hyperlinks in your files. It supports Markdown and AsciiDoc, with a rich interactive TUI for local use and clean output for CI/CD pipelines.

## Why Linkspector?

- **Fewer false positives** - Uses [Puppeteer](https://pptr.dev/) headless Chrome as a fallback, so JavaScript-rendered pages and bot-protected links are checked correctly.
- **Rich terminal UI** - Animated progress bar, live error stream, and grouped results when running interactively. Falls back to plain output in CI automatically.
- **Built for CI/CD** - First-class [GitHub Action](https://github.com/UmbrellaDocs/action-linkspector) with [RDJSON](https://github.com/reviewdog/reviewdog/tree/master/proto/rdf#rdjson) output for reviewdog integration.
- **Standalone binaries** - Download a single executable from [Releases](https://github.com/UmbrellaDocs/linkspector/releases). No Node.js required.

## Trusted by

<table>
<tr>
<td align="center" width="150">
<a href="https://github.com/dotnet/source-build/blob/main/.github/workflows/check-markdown-links.yml">
<img src="https://github.com/dotnet.png" width="50" height="50" alt="dotnet" /><br />
<b>.NET</b><br />
<sub>source-build</sub>
</a>
</td>
<td align="center" width="150">
<a href="https://github.com/SAP/abap-file-formats/blob/main/.github/workflows/markdown-link-check.yml">
<img src="https://github.com/SAP.png" width="50" height="50" alt="SAP" /><br />
<b>SAP</b><br />
<sub>abap-file-formats</sub>
</a>
</td>
<td align="center" width="150">
<a href="https://github.com/open-telemetry/opentelemetry-ruby/blob/main/.github/workflows/ci-markdown-link.yml">
<img src="https://github.com/open-telemetry.png" width="50" height="50" alt="OpenTelemetry" /><br />
<b>OpenTelemetry</b><br />
<sub>opentelemetry-ruby</sub>
</a>
</td>
<td align="center" width="150">
<a href="https://github.com/finos/spring-bot/blob/spring-bot-master/.github/workflows/checklinks.yml">
<img src="https://github.com/finos.png" width="50" height="50" alt="FINOS" /><br />
<b>FINOS</b><br />
<sub>spring-bot</sub>
</a>
</td>
<td align="center" width="150">
<a href="https://github.com/dotnet/dotnet-docker/blob/main/.github/workflows/check-markdown-links.yml">
<img src="https://github.com/dotnet.png" width="50" height="50" alt="dotnet" /><br />
<b>.NET</b><br />
<sub>dotnet-docker</sub>
</a>
</td>
</tr>
<tr>
<td align="center" width="150">
<a href="https://github.com/Azure-Samples/azure-spring-boot-samples/blob/main/.github/workflows/markdown-link-check.yml">
<img src="https://github.com/Azure-Samples.png" width="50" height="50" alt="Azure" /><br />
<b>Azure</b><br />
<sub>spring-boot-samples</sub>
</a>
</td>
<td align="center" width="150">
<a href="https://github.com/solarwinds/apm-ruby/blob/main/.github/workflows/ci-markdown-link.yml">
<img src="https://github.com/solarwinds.png" width="50" height="50" alt="SolarWinds" /><br />
<b>SolarWinds</b><br />
<sub>apm-ruby</sub>
</a>
</td>
<td align="center" width="150">
<a href="https://github.com/jenkinsci/autograding-plugin/blob/main/.github/workflows/check-md-links.yml">
<img src="https://github.com/jenkinsci.png" width="50" height="50" alt="Jenkins" /><br />
<b>Jenkins</b><br />
<sub>autograding-plugin</sub>
</a>
</td>
<td align="center" width="150">
<a href="https://github.com/riscv/learn/blob/main/.github/workflows/linkcheck.yml">
<img src="https://github.com/riscv.png" width="50" height="50" alt="RISC-V" /><br />
<b>RISC-V</b><br />
<sub>learn</sub>
</a>
</td>
<td align="center" width="150">
<a href="https://github.com/vllm-project/llm-compressor/blob/main/.github/workflows/linkcheck.yml">
<img src="https://github.com/vllm-project.png" width="50" height="50" alt="vLLM" /><br />
<b>vLLM</b><br />
<sub>llm-compressor</sub>
</a>
</td>
</tr>
<tr>
<td align="center" colspan="5">
<a href="https://github.com/search?q=uses%3A+umbrelladocs%2Faction-linkspector%40v1&type=code">
<b>and many more...</b>
</a>
</td>
</tr>
</table>

If you are using this on production, consider [buying me a coffee](https://liberapay.com/gaurav-nelson/) ☕.

---

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [AsciiDoc Support](#asciidoc-support)
- [Docker](#docker)
- [Building from Source](#building-from-source)
- [Contributing](#contributing)

---

## Installation

### npm (recommended)

> **Prerequisites:** Node.js 18.18.0+ and a supported Chromium/Chrome installation are required. On Linux you may also need system libraries. See [PREREQUISITES.md](PREREQUISITES.md) for full details.

```bash
npm install -g @umbrelladocs/linkspector
```

### Standalone binary

Download a prebuilt binary from [GitHub Releases](https://github.com/UmbrellaDocs/linkspector/releases). No Node.js or npm required.

| Platform | Architecture | File                          |
| -------- | ------------ | ----------------------------- |
| Linux    | x64          | `linkspector-linux-x64`       |
| Linux    | ARM64        | `linkspector-linux-arm64`     |
| macOS    | x64 (Intel)  | `linkspector-macos-x64`       |
| macOS    | ARM64 (M1+)  | `linkspector-macos-arm64`     |
| Windows  | x64          | `linkspector-windows-x64.exe` |

```bash
# Linux/macOS
chmod +x linkspector-linux-x64
sudo mv linkspector-linux-x64 /usr/local/bin/linkspector
```

> **Note:** The standalone binary requires **Google Chrome** or **Chromium** installed on your system for the Puppeteer fallback pass. Linkspector auto-detects Chrome in common paths. For non-standard locations, set `PUPPETEER_EXECUTABLE_PATH`:
>
> ```bash
> export PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
> linkspector check
> ```

### GitHub Action

See [action-linkspector](https://github.com/UmbrellaDocs/action-linkspector) for CI/CD integration.

---

## Usage

```bash
linkspector check [options]
```

### Options

| Flag                  | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `-c, --config <path>` | Custom configuration file path (default: `.linkspector.yml`) |
| `-j, --json`          | Output results in RDJSON format                              |
| `-s, --showstat`      | Display link check statistics                                |
| `-q, --quiet`         | No output, exit code only                                    |

### Examples

```bash
# Check with default config
linkspector check

# Custom config file
linkspector check -c /path/to/config.yml

# JSON output for CI (RDJSON format)
linkspector check -j

# Show statistics table
linkspector check -s

# Quiet mode (exit code only, useful in scripts)
linkspector check -q
```

### Output modes

**Interactive terminal (TUI)** - When running in a terminal, Linkspector shows an animated progress bar, live error stream grouped by file, and a summary bar:

```
  > Linkspector v0.4.8
  ──────────────────────────────────────────────
  * Checking: docs/api/auth.md
  Files   ████████████░░░░░░░░  12/47  25%
  Links   89 checked . 2 failed
  ──────────────────────────────────────────────

  docs/setup.md
    L12:5  x https://example.com/old-page     404 Not Found
    L34:3  x https://api.example.com/removed   ECONNREFUSED
```

**CI / piped output** - Automatically detected via `stdout.isTTY` and the `CI` environment variable. Uses plain text output compatible with existing CI pipelines:

```
docs/setup.md:12:5: https://example.com/old-page Status:404 Not Found
Error: Some hyperlinks in the specified files are invalid.
```

**JSON (`-j`)** - Outputs [RDJSON](https://github.com/reviewdog/reviewdog/tree/master/proto/rdf#rdjson) for reviewdog integration. Validated by [@umbrelladocs/rdformat-validator](https://www.npmjs.com/package/@umbrelladocs/rdformat-validator).

---

## Configuration

Linkspector uses `.linkspector.yml` in the current directory. If not found, it uses the default configuration:

```yaml
dirs:
  - .
useGitIgnore: true
```

### Configuration options

| Option                                            | Description                                            | Required                   |
| ------------------------------------------------- | ------------------------------------------------------ | -------------------------- |
| [`files`](#files-to-check)                        | Files to check for broken links                        | Yes, if `dirs` is not set  |
| [`dirs`](#directories-to-search)                  | Directories to search for files                        | Yes, if `files` is not set |
| [`excludedFiles`](#excluded-files)                | Files to skip                                          | No                         |
| [`excludedDirs`](#excluded-directories)           | Directories to skip                                    | No                         |
| [`fileExtensions`](#file-extensions)              | File extensions to check (default: `['md']`)           | No                         |
| [`baseUrl`](#base-url)                            | Base URL for relative links                            | No                         |
| [`ignorePatterns`](#ignore-patterns)              | Regex patterns for URLs to skip                        | No                         |
| [`replacementPatterns`](#replacement-patterns)    | Regex find/replace for URLs before checking            | No                         |
| [`aliveStatusCodes`](#alive-status-codes)         | Additional HTTP status codes considered valid          | No                         |
| [`useGitIgnore`](#use-gitignore)                  | Respect `.gitignore` rules (default: `true`)           | No                         |
| [`modifiedFilesOnly`](#check-modified-files-only) | Only check git-modified files                          | No                         |
| [`httpHeaders`](#http-headers)                    | Custom HTTP headers per domain                         | No                         |
| [`followRedirects`](#follow-redirects)            | Follow HTTP redirects (default: `true`)                | No                         |
| [`timeout`](#timeout)                             | Request timeout in ms (default: `30000`)               | No                         |
| [`retryCount`](#retry-count)                      | Retry attempts with exponential backoff (default: `3`) | No                         |
| [`userAgent`](#user-agent)                        | Custom User-Agent string                               | No                         |
| [`ignoreSslErrors`](#ignore-ssl-errors)           | Skip SSL certificate validation                        | No                         |

### Files to check

```yaml
files:
  - README.md
  - docs/guide.md
```

### Directories to search

```yaml
dirs:
  - ./
  - docs/
```

### Excluded files

```yaml
excludedFiles:
  - ./CHANGELOG.md
  - vendor/README.md
```

### Excluded directories

```yaml
excludedDirs:
  - ./node_modules
  - vendor/
```

### File extensions

```yaml
fileExtensions:
  - md
  - adoc
```

### Base URL

```yaml
baseUrl: https://example.com
```

### Ignore patterns

```yaml
ignorePatterns:
  - pattern: '^https://example\\.com/skip/.*$'
  - pattern: "^(ftp)://[^\\s/$?#]*\\.[^\\s]*$"
```

### Replacement patterns

```yaml
replacementPatterns:
  - pattern: "(https?://example\\.com)/(\\w+)/(\\d+)"
    replacement: '$1/id/$3'
```

### Alive status codes

```yaml
aliveStatusCodes:
  - 200
  - 201
  - 204
```

### Use .gitignore

```yaml
useGitIgnore: true
```

### Check modified files only

```yaml
modifiedFilesOnly: true
```

Requires `git` on your system PATH. Only checks files changed in the last commit.

### HTTP headers

Use environment variables for secrets:

```yaml
httpHeaders:
  - url:
      - https://example1.com
    headers:
      Foo: Bar
  - url:
      - https://example2.com
    headers:
      Authorization: ${AUTH_TOKEN}
```

### Follow redirects

```yaml
followRedirects: false # Report redirects as errors instead of following them
```

- `true` (default): Follows redirects; reports the final destination status.
- `false`: Reports any redirect (301, 302, etc.) as an error.

### Timeout

```yaml
timeout: 60000 # 60 seconds
```

Range: `1000`-`120000` ms. Applies to both fetch and Puppeteer passes.

### Retry count

```yaml
retryCount: 5
```

Range: `0`-`10`. Uses exponential backoff (1s, 2s, 4s...) and respects `Retry-After` headers.

### User agent

```yaml
userAgent: 'MyLinkChecker/1.0'
```

### Ignore SSL errors

```yaml
ignoreSslErrors: true
```

> **Warning:** Only enable this for trusted servers (e.g., internal servers with self-signed certificates).

### Full example

```yaml
files:
  - README.md
dirs:
  - ./docs
excludedFiles:
  - ./CHANGELOG.md
excludedDirs:
  - ./vendor
baseUrl: https://example.com
ignorePatterns:
  - pattern: '^https://example\\.com/skip/.*$'
replacementPatterns:
  - pattern: "(https?://example\\.com)/(\\w+)/(\\d+)"
    replacement: '$1/id/$3'
httpHeaders:
  - url:
      - https://api.example.com
    headers:
      Authorization: ${AUTH_TOKEN}
aliveStatusCodes:
  - 200
  - 204
useGitIgnore: true
followRedirects: true
timeout: 60000
retryCount: 5
userAgent: 'MyLinkChecker/1.0'
ignoreSslErrors: false
```

---

## AsciiDoc Support

Linkspector checks AsciiDoc files through the same CLI, including direct URLs and `link:` macros. Set `fileExtensions` to include AsciiDoc:

```yaml
fileExtensions:
  - md
  - adoc
```

The AsciiDoc parser handles:

- Anchors (`[[...]]`, `[[[...]]]`, `[#...]`, `anchor:...[]`)
- Internal references (`<<...>>`, `xref:...[]`)
- External document references (`file.adoc#anchor`)
- Link macros (`link:url[text]`)
- Comment-aware parsing (ignores `//` and `////...////` blocks)

---

## Docker

```bash
# Build the image
git clone git@github.com:UmbrellaDocs/linkspector.git
cd linkspector
docker build --no-cache --pull --build-arg LINKSPECTOR_PACKAGE= -t umbrelladocs/linkspector .

# Check links (mount your project at /app)
docker run --rm -it -v $PWD:/app umbrelladocs/linkspector \
  bash -c 'linkspector check'

# With custom config
docker run --rm -it -v $PWD:/app umbrelladocs/linkspector \
  bash -c 'linkspector check -c /app/custom-config.yml'
```

---

## Building from Source

### Prerequisites

- **npm build:** Node.js >= 20
- **Bun build:** [Bun](https://bun.sh) runtime

### Install dependencies

```bash
npm install
```

### Run tests

```bash
npm test
```

### Build standalone binaries

Two build systems are available:

| Command                    | Runtime     | TUI Support       | Notes                                      |
| -------------------------- | ----------- | ----------------- | ------------------------------------------ |
| `npm run build:binary`     | Node.js SEA | Plain output only | Uses esbuild + postject                    |
| `npm run build:binary:bun` | Bun         | Full TUI          | Smaller binary, supports cross-compilation |

```bash
# Node.js SEA binary (plain renderer, no TUI)
npm run build:binary

# Bun binary (full TUI with ink)
npm run build:binary:bun

# Bun cross-compilation
bun scripts/build-bun.mjs --target bun-linux-x64
bun scripts/build-bun.mjs --target bun-linux-arm64
bun scripts/build-bun.mjs --target bun-darwin-arm64
bun scripts/build-bun.mjs --target bun-windows-x64
```

### Build with Docker

```bash
# Linux binary for current architecture
docker build -f Dockerfile.buildbinary -o dist/ .

# Cross-architecture builds
docker buildx build --platform linux/arm64 -f Dockerfile.buildbinary -o dist/ .
```

---

## AI Agent / LLM Usage

AI coding agents (Claude Code, Cursor, GitHub Copilot, etc.) can use Linkspector directly via `npx`:

```bash
npx @umbrelladocs/linkspector check -j
```

The `-j` flag outputs structured [RDJSON](https://github.com/reviewdog/reviewdog/tree/master/proto/rdf#rdjson), ideal for machine consumption. Use `-q` for a simple pass/fail exit code.

This repository includes an [`llms.txt`](llms.txt) file with full usage and configuration details for AI agent discovery.

For deeper integration, use the [Linkspector MCP Server](https://github.com/UmbrellaDocs/linkspector-mcp) to expose Linkspector as a native tool in Claude Desktop, Claude Code, VS Code, Cursor, and other MCP-compatible clients.

---

## Contributing

See [CONTRIBUTING.md](/CONTRIBUTING.md) for guidelines.

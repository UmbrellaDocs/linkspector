<p align="center">
  <a href="https://github.com/UmbrellaDocs/linkspector"><img src="https://i.ibb.co/VD70DX3/linkspectorelogonewtransparentupscale.png" alt="Logo" height=170></a>
</p>
<h3 align="center">Uncover broken links in your content.</h3>
<h1 align="center">Linkspector</h1>

Linkspector is a CLI app that checks for dead hyperlinks in files.
It supports multiple markup languages such as Markdown, AsciiDoc (limited - hyperlinks only), and ReStructured Text (coming soon).

With Linkspector, you can easily check all hyperlinks in your files, ensuring that they are not broken and that your readers can access all the relevant content.
The app allows you to quickly and easily identify any broken links, so you can fix them before publishing your content.

Linkspector is a powerful tool for anyone who creates content using markup languages.

## How this is different from existing tools?

1. **Enhanced Link Checking with Puppeteer** :It uses [Puppeteer](https://pptr.dev/) to check links in Chrome's headless mode, reducing the number of false positives.
2. **Addresses limitations and adds user-requested features**: It is built to adress the shortcomings in [GitHub Action - Markdown link check](https://github.com/gaurav-nelson/github-action-markdown-link-check) and adds many user requested features.
3. **Single repository for seamless collaboration**: All the code it needs to run is in a single repository, making it easier for community to collaborate.
4. **Focused for CI/CD use**: Linkspector is purposefully tailored to run into your CI/CD pipelines. This ensures that link checking becomes an integral part of your development workflow.

## Installation

Before you can use Linkspector, you need to install it. You can do this using the following command:

```bash
npm install -g @umbrelladocs/linkspector
```

This command installs Linkspector globally, allowing you to use it from anywhere in your terminal. If you don't want to install using `npm` you can download the binary from GitHub releases.

## Checking Hyperlinks

To check hyperlinks in your markup language files, follow these steps:

1. Open your terminal.

1. Navigate to the directory containing the files you want to check.

1. Create a [configuration](#configuration) file called `.linkspector.yml`. By default, Linkspector looks for a configuration file named `.linkspector.yml` in the current directory. If you have a custom configuration file or want to specify its path, you can use the `-c` or `--config` option.

1. Use the `linkspector check` command to initiate the hyperlink check. For example:

   ```bash
   linkspector check
   ```

   To specify a custom configuration file path:

   ```bash
   linkspector check -c /path/to/custom-config.yml
   ```

1. Linkspector will start checking the hyperlinks in your files based on the configuration provided in the configuration file. It will display the results in your terminal.

1. After the check is complete, Linkspector will provide a summary of the results. If any dead links are found, they will be listed in the terminal, along with their status codes and error messages.

1. If no dead links are found, Linkspector will display a success message, indicating that all links are working.

## Configuration

The configuration file allows you to customize the behavior of Linkspector according to your specific needs. You can adjust the file paths, URL patterns, and other settings to ensure accurate and relevant link checking.

Use the following configuration options:

### Files to Check
The `files` section specifies the Markdown files that Linkspector should check for broken links. You can add the file paths you want to include in this list. For example:

```yaml
files:
  - README.md
  - file2.md
  - file3.md
```

### Directories to Search
The `dirs` section lists the directories where Linkspector should search for Markdown files. You can specify directories relative to the current working directory. For example:

```yaml
dirs:
  - ./
  - folder2
```

### Excluded Files
The `excludedFiles` section allows you to specify Markdown files that should be excluded from the link checking process. Add the paths of the files you want to exclude. For example:

```yaml
excludedFiles:
  - ./check.md
  - excluded-file2.md
```

### Excluded Directories
The `excludedDirs` section lets you specify directories that should be excluded from the link checking process. Provide the paths of the directories you want to exclude. For example:

```yaml
excludedDirs:
  - ./lib
  - excluded-folder2
```

### Base URL
The `baseUrl` option sets the base URL that will be used when checking relative links in Markdown files. In this example:

```yaml
baseUrl: https://example.com
```

The base URL is set to `https://example.com`.

### Ignore Patterns
The `ignorePatterns` section allows you to define regular expressions that match URLs to be ignored during the link checking process. For example:

```yaml
ignorePatterns:
  - pattern: "^https://example.com/skip/.*$"
  - pattern: "^(ftp)://[^\\s/$?#]*\\.[^\\s]*$"
```

In this example, URLs matching the specified patterns will be skipped during link checking.

### Replacement Patterns
The `replacementPatterns` section lets you define regular expressions and replacement strings to modify URLs during link checking. For example:

```yaml
replacementPatterns:
  - pattern: "(https?://example.com)/(\\w+)/(\\d+)"
    replacement: "$1/id/$3"
  - pattern: "\\[([^\\]]+)\\]\\((https?://example.com)/file\\)"
    replacement: "<a href=\"$2/file\">$1</a>"
```

These patterns and replacements will be applied to URLs found in the Markdown files.

### Alive Status Codes
The `aliveStatusCodes` section allows you to specify a list of HTTP status codes that are considered as "alive" links. In this example:

```yaml
aliveStatusCodes:
  - 200
  - 201
  - 204
```

Links returning any of these status codes will be considered valid.

### Use .gitignore
The `useGitIgnore` option, when set to `true`, indicates that Linkspector should use the rules defined in the `.gitignore` file to exclude files and directories. For example:

```yaml
useGitIgnore: true
```

When enabled, the app will respect the `.gitignore` rules during link checking.

### Check Modified Files Only
The `modifiedFilesOnly` option, when set to `true`, indicates that Linkspector should only check the files that have been modified in the last git commit. For example:

```yaml
modifiedFilesOnly: true
```
When enabled, Linkspector will use `git` to find the list of modified files and only check those files. Please note that this option requires `git` to be installed and available on your system path. If `git` is not installed or not found in the system path, Linkspector will throw an error.

Also, if no modified files are found in the list of files to check, Linkspector will skip link checking and exit with a message indicating that modified files are not specified in the configuration.


### Sample configuration
```yml
files:
  - README.md
  - file2.md
  - file3.md
dirs:
  - ./
  - folder2
excludedFiles:
  - ./check.md
  - excluded-file2.md
excludedDirs:
  - ./lib
  - excluded-folder2
baseUrl: https://example.com
ignorePatterns:
  - pattern: "^https://example.com/skip/.*$"
  - pattern: "^(ftp)://[^\\s/$?#]*\\.[^\\s]*$"
replacementPatterns:
  - pattern: "(https?://example.com)/(\\w+)/(\\d+)"
    replacement: "$1/id/$3"
  - pattern: "\\[([^\\]]+)\\]\\((https?://example.com)/file\\)"
    replacement: "<a href=\"$2/file\">$1</a>"
aliveStatusCodes:
  - 200
  - 201
  - 204
useGitIgnore: true
```

## Sample output

If there are failed links, linkspector shows the output as comma-seprated values and exit with error.
`File, HTTP status code, Line number, Error message`

```
REDISTRIBUTED.md, https://unlicense.org/, null, 186, net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH at https://unlicense.org/]
❌ Found link errors in one or more files.
```

If there are no errors, linkspector shows the following message:
```
✅ All links are working.
```

## What's planned
- [x] Spinner for local runs.
- [ ] Create a GitHub action.
- [x] Modified files only check.
- [x] Asciidoc support.
- [ ] ReStructured Text support.
- [ ] Disable binary files downlaod.
- [ ] JSON output for `failed-only` or `all` links.
- [ ] CSV output for `all` links.
- [ ] Experimaental mode to gather all links and check them in batches to study performance gains.
- [ ] Proxy support to connect puppeteer to a remote service.
- [ ] Puppeteer config support.

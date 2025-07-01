[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-action%20linkspector-brightgreen?style=for-the-badge)](https://github.com/marketplace/actions/run-linkspector-with-reviewdog)
[![NPM](https://img.shields.io/npm/v/@umbrelladocs/linkspector?style=for-the-badge)](https://www.npmjs.com/package/@umbrelladocs/linkspector)
<a href="https://liberapay.com/gaurav-nelson/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg"></a>

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

1. **Enhanced Link Checking with Puppeteer**: It uses [Puppeteer](https://pptr.dev/) to check links in Chrome's headless mode, reducing the number of false positives.
2. **Addresses limitations and adds user-requested features**: It is built to adress the shortcomings in [GitHub Action - Markdown link check](https://github.com/gaurav-nelson/github-action-markdown-link-check) and adds many user requested features.
3. **Single repository for seamless collaboration**: All the code it needs to run is in a single repository, making it easier for community to collaborate.
4. **Focused for CI/CD use**: Linkspector ([action-linkspector](https://github.com/UmbrellaDocs/action-linkspector)) is purposefully tailored to run into your CI/CD pipelines. This ensures that link checking becomes an integral part of your development workflow.

## Installation

Before you can use Linkspector, you need to install it. You can do this using the following command:

```bash
npm install -g @umbrelladocs/linkspector
```

This command installs Linkspector globally, allowing you to use it from anywhere in your terminal. If you don't want to install using `npm` you can download the binary from GitHub releases.

### GitHub action

For more details, see [action-linkspector](https://github.com/UmbrellaDocs/action-linkspector)

## Checking Hyperlinks

To check hyperlinks in your markup language files, follow these steps:

1. Open your terminal.

1. Navigate to the directory containing the files you want to check.

1. (**Optional**) Create a [configuration](#configuration) file called `.linkspector.yml`. By default, Linkspector looks for a configuration file named `.linkspector.yml` in the current directory. If you have a custom configuration file or want to specify its path, you can use the `-c` or `--config` option.

1. Use the `linkspector check` command to initiate the hyperlink check. For example:

   ```bash
   linkspector check
   ```

   - To specify a custom configuration file path:

     ```bash
     linkspector check -c /path/to/custom-config.yml
     ```

   - To output the results in JSON format:

     ```bash
     linkspector check -j
     ```

     The JSON output follows [rdjson](https://github.com/reviewdog/reviewdog/tree/master/proto/rdf#rdjson) format.

1. Linkspector starts checking the hyperlinks in your files based on the configuration provided in the configuration file or using the default configuration. It then displays the results in your terminal.

1. After the check is complete, Linkspector provides a summary of the results. If any dead links are found, they are listed in the terminal, along with their status codes and error messages.
   - To display statistics about the checked links, use the `-s` or `--showstat` option:

     ```bash
     linkspector check -s
     ```

     This command shows a summary table with the number of files checked, total links, hyperlinks, file and header links, and the count of correct and failed links.
     Note that this option cannot be used together with the JSON output option (`-j`).

1. If no dead links are found, Linkspector displays a success message, indicating that all links are working.

## Configuration

Linkspector uses a configuration file named `.linkspector.yml` to customize its behavior. If this file is not found in the current directory when the program is run, Linkspector displays a message saying "Configuration file not found. Using default configuration." and uses a default configuration.

### Default Configuration

The default configuration is as follows:

```yaml
dirs:
  - .
useGitIgnore: true
```

If you are defining a custom configuration, you must include the `dirs` or `files` section in the configuration file.

Following are the available configuration options:

| Option                                            | Description                                                                                           | Required                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------- |
| [`files`](#files-to-check)                        | The list of Markdown files to check for broken links.                                                 | Yes, if `dirs` is not specified.  |
| [`dirs`](#directories-to-search)                  | The list of directories to search for Markdown files.                                                 | Yes, if `files` is not specified. |
| [`excludedFiles`](#excluded-files)                | The list of Markdown files to exclude from the link checking process.                                 | No                                |
| [`excludedDirs`](#excluded-directories)           | The list of directories to exclude from the link checking process.                                    | No                                |
| [`baseUrl`](#base-url)                            | The base URL to use when checking relative links in Markdown files.                                   | No                                |
| [`ignorePatterns`](#ignore-patterns)              | The list of regular expressions that match URLs to be ignored during link checking.                   | No                                |
| [`replacementPatterns`](#replacement-patterns)    | The list of regular expressions and replacement strings to modify URLs during link checking.          | No                                |
| [`aliveStatusCodes`](#alive-status-codes)         | The list of HTTP status codes that are considered as "alive" links.                                   | No                                |
| [`useGitIgnore`](#use-gitignore)                  | Indicates whether to use the rules defined in the `.gitignore` file to exclude files and directories. | No                                |
| [`modifiedFilesOnly`](#check-modified-files-only) | Indicates whether to check only the files that have been modified in the last git commit.             | No                                |
| [`httpHeaders`](#http-headers)                    | The list of URLs and their corresponding HTTP headers to be used during link checking.                | No                                |
| [`followRedirects`](#follow-redirects)            | Controls how HTTP redirects (e.g., 301, 302) are handled.                                             | No                                |

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
  - pattern: '^https://example.com/skip/.*$'
  - pattern: "^(ftp)://[^\\s/$?#]*\\.[^\\s]*$"
```

In this example, URLs matching the specified patterns will be skipped during link checking.

### Replacement Patterns

The `replacementPatterns` section lets you define regular expressions and replacement strings to modify URLs during link checking. For example:

```yaml
replacementPatterns:
  - pattern: "(https?://example.com)/(\\w+)/(\\d+)"
    replacement: '$1/id/$3'
  - pattern: "\\[([^\\]]+)\\]\\((https?://example.com)/file\\)"
    replacement: '<a href="$2/file">$1</a>'
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

Also, if no modified files are found in the list of files to check, Linkspector will skip link checking and exit with a message indicating that no modified files have been edited so it will skip checking.

### HTTP headers

The `httpHeaders` option allows you to specify HTTP headers for specific URLs that require authorization. You can use environment variables for secure values.

1. Create a `.env` file in the root directory of your project and add the environment variables. For example:

   ```env
   AUTH_TOKEN=abcdef123456
   ```

1. Add the `httpHeaders` section to the configuration file and specify the URLs and headers. For example:

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
         Foo: Bar
   ```

### Follow Redirects

The `followRedirects` option controls how Linkspector handles HTTP redirects (e.g., status codes 301, 302).

- **Type:** `boolean`
- **Default:** `true`

**Behavior:**

- When `followRedirects: true` (default):
  Linkspector will follow HTTP redirects to their final destination. The status of the link will be determined by the status code of this final destination. For example, if `http://example.com/old` redirects to `http://example.com/new` and `/new` returns a 200 OK, the original link `/old` will be reported as 'alive' (200), with a message indicating it was redirected.

- When `followRedirects: false`:
  Linkspector will _not_ follow HTTP redirects. If a link returns a redirect status code (e.g., 301, 302, 307, 308), it will be reported as an 'error'. The reported status code will be the original redirect status code (e.g., 301), and the error message will indicate that the link redirected but `followRedirects` was set to `false`.

**Example:**

To disable following redirects:

```yaml
followRedirects: false
```

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
  - pattern: '^https://example.com/skip/.*$'
  - pattern: "^(ftp)://[^\\s/$?#]*\\.[^\\s]*$"
replacementPatterns:
  - pattern: "(https?://example.com)/(\\w+)/(\\d+)"
    replacement: '$1/id/$3'
  - pattern: "\\[([^\\]]+)\\]\\((https?://example.com)/file\\)"
    replacement: '<a href="$2/file">$1</a>'
httpHeaders:
  - url:
      - https://example1.com
    headers:
      Authorization: Basic Zm9vOmJhcg==
      Foo: Bar
aliveStatusCodes:
  - 200
  - 201
  - 204
useGitIgnore: true
followRedirects: false # Example of including it in a full config
```

## Sample output

If there are failed links, linkspector shows the output as comma-seprated values and exit with error.
`File, HTTP status code, Line number, Error message`

```
REDISTRIBUTED.md, https://unlicense.org/, null, 186, net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH at https://unlicense.org/]
💥 Error: Some hyperlinks in the specified files are invalid.
```

If there are no errors, linkspector shows the following message:

```
✨ Success: All hyperlinks in the specified files are valid.
```

## Using Linkspector with Docker

To use Linkspector with Docker, follow these steps:

1. Clone the Linkspector repository to your local machine and switch to the cloned directory:
   ```bash
   git clone git@github.com:UmbrellaDocs/linkspector.git
   cd linkspector
   ```
1. Build the docker image locally, while being at the root (`.`) of this project:

   ```bash
   docker build --no-cache --pull --build-arg LINKSPECTOR_PACKAGE= -t umbrelladocs/linkspector .
   ```

1. To perform a check using the default configuration, while being at the root (`$PWD`) of the project to be checked:

   ```bash
   docker run --rm -it -v $PWD:/app \
          --name linkspector umbrelladocs/linkspector \
          bash -c 'linkspector check'
   ```

   To specify a custom configuration file path:

   ```bash
   docker run --rm -it -v $PWD:/app -v $PWD/custom-config.yml:/path/to/custom-config.yml \
          --name linkspector umbrelladocs/linkspector \
          bash -c 'linkspector check -c /path/to/custom-config.yml'
   ```

## Contributing

If you would like to contribute to Linkspector, please read the [contributing guidelines](/CONTRIBUTING.md).

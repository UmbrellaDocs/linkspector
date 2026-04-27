import kleur from 'kleur'
import ora from 'ora'

export function createPlainRenderer(cmd) {
  const spinner = cmd.json || cmd.quiet ? null : ora().start()
  let currentFile = ''

  function padNumber(num) {
    return num.toString().padStart(6, ' ')
  }

  return {
    onStart(_totalFiles) {
      // Nothing to do — spinner already started
    },

    onFileStart(file) {
      currentFile = file
      if (spinner) {
        spinner.text = `Checking ${currentFile}...`
      }
    },

    onError(file, linkStatusObj) {
      if (cmd.quiet) return
      spinner.stop()
      console.log(
        kleur.red(
          `${file}:${linkStatusObj.line_number}:${linkStatusObj.position?.start?.column ?? '?'}: \u{1F6AB} ${linkStatusObj.link} Status:${linkStatusObj.status_code}${linkStatusObj.error_message ? ` ${linkStatusObj.error_message}` : ' Cannot reach link'}`
        )
      )
      spinner.start(`Checking ${currentFile}...`)
    },

    onWarning(file, linkStatusObj) {
      if (cmd.quiet) return
      spinner.stop()
      console.log(
        kleur.yellow(
          `${file}:${linkStatusObj.line_number}:${linkStatusObj.position?.start?.column ?? '?'}: WARNING ${linkStatusObj.link} ${linkStatusObj.error_message || 'Repository is archived'}`
        )
      )
      spinner.start(`Checking ${currentFile}...`)
    },

    onFileComplete(_file, _results, _stats) {
      // Nothing extra in plain mode — errors already printed inline
    },

    onShowStats(stats) {
      if (spinner) spinner.stop()
      console.log(
        '\n' + kleur.bold('\u{1F480}\u{1F4CA} Linkspector check stats')
      )
      console.log(
        '\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510'
      )
      console.log(
        `\u2502 \u{1F7F0} ${kleur.bold('Total files checked')}        \u2502 ${kleur.cyan(padNumber(stats.filesChecked))} \u2502`
      )
      console.log(
        '\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524'
      )
      console.log(
        `\u2502 \u{1F517} ${kleur.bold('Total links checked')}        \u2502 ${kleur.cyan(padNumber(stats.totalLinks))} \u2502`
      )
      console.log(
        '\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524'
      )
      console.log(
        `\u2502 \u{1F310} ${kleur.bold('Hyperlinks')}                 \u2502 ${kleur.cyan(padNumber(stats.httpLinks))} \u2502`
      )
      console.log(
        '\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524'
      )
      console.log(
        `\u2502 \u{1F4C1} ${kleur.bold('File and header links')}      \u2502 ${kleur.cyan(padNumber(stats.fileLinks))} \u2502`
      )
      console.log(
        '\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524'
      )
      console.log(
        `\u2502 \u{1F4E7} ${kleur.bold('Email links (Skipped)')}      \u2502 ${kleur.cyan(padNumber(stats.emailLinks))} \u2502`
      )
      console.log(
        '\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524'
      )
      console.log(
        `\u2502 \u{1F516} ${kleur.bold('Anchors/IDs')}                \u2502 ${kleur.cyan(padNumber(stats.anchors))} \u2502`
      )
      console.log(
        '\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524'
      )
      console.log(
        `\u2502 \u2705 ${kleur.bold('Working links')}              \u2502 ${kleur.green(padNumber(stats.correctLinks))} \u2502`
      )
      console.log(
        '\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524'
      )
      console.log(
        `\u2502 \u{1F6AB} ${kleur.bold('Failed links')}               \u2502 ${kleur.red(padNumber(stats.failedLinks))} \u2502`
      )
      if (stats.warningLinks > 0) {
        console.log(
          '\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524'
        )
        console.log(
          `\u2502 \u26A0\uFE0F  ${kleur.bold('Archived repos (warning)')}   \u2502 ${kleur.yellow(padNumber(stats.warningLinks))} \u2502`
        )
      }
      console.log(
        '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518'
      )
      console.log('')
    },

    onComplete(stats, hasErrors) {
      if (cmd.showstat) {
        this.onShowStats(stats)
      }
      if (!cmd.showstat) {
        if (spinner) spinner.stop()
        if (!hasErrors) {
          console.log(
            kleur.green(
              '\u2728 Success: All hyperlinks in the specified files are valid.'
            )
          )
        } else {
          console.error(
            kleur.red(
              '\u{1F4A5} Error: Some hyperlinks in the specified files are invalid.'
            )
          )
        }
      } else if (hasErrors) {
        console.error(
          kleur.red(
            '\u{1F4A5} Error: Some hyperlinks in the specified files are invalid.'
          )
        )
      }
    },

    cleanup() {
      if (spinner) spinner.stop()
    },
  }
}

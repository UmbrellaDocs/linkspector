#!/usr/bin/env node

import { program } from "commander";
import kleur from "kleur";
import ora from "ora";
import { linkspector } from "./linkspector.js";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// Define the program and its options
program
  .version(pkg.version)
  .description("🔍 Uncover broken links in your content.")
  .command("check")
  .description("Check hyperlinks based on the configuration file.")
  .option("-c, --config <path>", "Specify a custom configuration file path")
  .action(async (cmd) => {
    const configFile = cmd.config || ".linkspector.yml"; // Use custom config file path if provided

    let currentFile = ""; // Variable to store the current file name

    try {
      let hasErrorLinks = false;

      // Start the loading spinner with the first file name
      const spinner = ora().start();

      for await (const { file, result } of linkspector(configFile)) {
        // Update the current file name
        currentFile = file;

        for (const linkStatusObj of result) {
          spinner.text = `Checking ${currentFile}...`;
          if (linkStatusObj.status === "error") {
            hasErrorLinks = true;
            // Stop the spinner before printing an error message
            spinner.stop();
            console.error(
              kleur.red(
                `🚫 ${currentFile}, ${linkStatusObj.link}, ${linkStatusObj.status_code}, ${linkStatusObj.line_number}, ${linkStatusObj.error_message}`
              )
            );
            // Start the spinner again after printing an error message
            spinner.start(`Checking ${currentFile}...`);
          }
        }
      }

      spinner.stop();

      if (!hasErrorLinks) {
        console.log(
          kleur.green(
            "✨ Success: All hyperlinks in the specified files are valid."
          )
        );
        process.exit(0);
      } else {
        console.error(
          kleur.red(
            "❌ Error: Some links in the specified files are not valid."
          )
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(kleur.red(`💥 Error: ${error.message}`));
      process.exit(1);
    }
  });

// Parse the command line arguments
program.parse(process.argv);

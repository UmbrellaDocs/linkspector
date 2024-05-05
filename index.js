#!/usr/bin/env node

import { program } from "commander";
import kleur from "kleur";
import ora from "ora";
import { linkspector } from "./linkspector.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

program
  .version(pkg.version)
  .description("🔍 Uncover broken links in your content.")
  .command("check")
  .description("Check hyperlinks based on the configuration file.")
  .option("-c, --config <path>", "Specify a custom configuration file path")
  .option("-j, --json", "Output the results in JSON format")
  .action(async (cmd) => {
    const configFile = cmd.config || ".linkspector.yml"; // Use custom config file path if provided

    let currentFile = ""; // Variable to store the current file name
    let results = []; // Array to store the results if json is true

    const spinner = cmd.json ? null : ora().start();

    try {
      let hasErrorLinks = false;

      for await (const { file, result } of linkspector(configFile, cmd)) {
        // Update the current file name
        currentFile = file;
        if (!cmd.json) {
          spinner.text = `Checking ${currentFile}...\n`;
        }

        for (const linkStatusObj of result) {
          // If json is true, store the results in the results array
          if (cmd.json) {
            results.push({
              file: currentFile,
              link: linkStatusObj.link,
              status_code: linkStatusObj.status_code,
              line_number: linkStatusObj.line_number,
              position: linkStatusObj.position,
              status: linkStatusObj.status,
              error_message: linkStatusObj.error_message,
            });
          } else {
            // If json is false, print the results in the console
            if (linkStatusObj.status === "error") {
              spinner.stop();
              console.log(
                kleur.red(
                  `💥 ${currentFile} - Line ${linkStatusObj.line_number}: ${linkStatusObj.error_message}`
                )
              );
              spinner.start(`Checking ${currentFile}...\n`);
            }
          }

          if (linkStatusObj.status === "error") {
            hasErrorLinks = true;
          }
        }
      }

      if (cmd.json) {
        console.log(JSON.stringify(results, null, 2));
      }

      if (!hasErrorLinks) {
        if (!cmd.json) {
          spinner.stop();
          console.log(
            kleur.green(
              "✨ Success: All hyperlinks in the specified files are valid."
            )
          );
        }
        process.exit(0);
      } else {
        if (!cmd.json) {
          spinner.stop();
          console.error(
            kleur.red(
              "💥 Error: Some hyperlinks in the specified files are invalid."
            )
          );
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(kleur.red(`💥 Error: ${error.message}`));
      process.exit(1);
    }
  });

// Parse the command line arguments
program.parse(process.argv);

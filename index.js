#!/usr/bin/env node

import { program } from "commander";
import kleur from "kleur";
import ora from "ora";
import { linkspector } from "./linkspector.js";

// Define the program and its options
program
  .version("0.3.0")
  .description("🔍 Uncover broken links in your content.")
  .command("check")
  .description("Check hyperlinks based on the configuration file.")
  .option("-c, --config <path>", "Specify a custom configuration file path")
  .option("-v, --verbose", "Output the results in verbose format")
  .option("-j, --json", "Output the results in JSON format")
  .action(async (cmd) => {
    if (cmd.verbose && cmd.json) {
      console.error(
        kleur.red(
          "Error: You can use either -v (verbose) or -j (json) option, but not both."
        )
      );
      process.exit(1);
    }
    const configFile = cmd.config || ".linkspector.yml"; // Use custom config file path if provided

    let currentFile = ""; // Variable to store the current file name
    let results = []; // Array to store the results if json is true

    try {
      let hasErrorLinks = false;

      // Start the loading spinner with the first file name
      const spinner = cmd.json ? null : ora().start();

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
          }

          // If verbose is true, print out all links
          if (cmd.verbose) {
            if (!cmd.json) {
              spinner.stop();
            }
            console.log(
              `✅ ${currentFile}, ${linkStatusObj.link}, ${linkStatusObj.status_code}, ${linkStatusObj.line_number}, ${linkStatusObj.status}`
            );
            if (!cmd.json) {
              spinner.start(`Checking ${currentFile}...\n`);
            }
          }

          if (linkStatusObj.status === "error") {
            hasErrorLinks = true;
            if (!cmd.json) {
              spinner.stop();
              console.log(
                kleur.red(
                  `❌ Error: ${currentFile}, ${linkStatusObj.link}, ${linkStatusObj.status_code}, ${linkStatusObj.line_number}, ${linkStatusObj.status}, ${linkStatusObj.error_message}`
                )
              );
              spinner.start(`Checking ${currentFile}...\n`);
            }
          }
        }
      }

      if (!cmd.json) {
        spinner.stop();
      }

      if (cmd.json) {
        console.log(JSON.stringify(results, null, 2));
      }

      if (!hasErrorLinks) {
        if (!cmd.json) {
          console.log(
            kleur.green(
              "✨ Success: All hyperlinks in the specified files are valid."
            )
          );
        }
        process.exit(0);
      } else {
        if (!cmd.json) {
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

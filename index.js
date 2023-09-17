#!/usr/bin/env node

import { program } from "commander";
import kleur from "kleur";
import ora from "ora";
import { linkspector } from "./linkspector.js";

// Define the program and its options
program
  .version("0.2.1")
  .description("🔍 Uncover broken links in your content.")
  .command("check")
  .description("Check hyperlinks based on the configuration file.")
  .option("-c, --config <path>", "Specify a custom configuration file path")
  .action(async (cmd) => {
    const configFile = cmd.config || ".linkspector.yml"; // Use custom config file path if provided

    // Start the loading spinner
    const spinner = ora().start();

    try {
      let hasErrorLinks = false;

      for await (const { file, result } of linkspector(configFile)) {
        for (const linkStatusObj of result) {
          if (linkStatusObj.status === "error") {
            hasErrorLinks = true;
            // Stop the spinner before printing an error message
            spinner.stop();
            console.error(
              kleur.red(
                `🚫 ${file}, ${linkStatusObj.link}, ${linkStatusObj.status_code}, ${linkStatusObj.line_number}, ${linkStatusObj.error_message}`
              )
            );
            // Start the spinner again after printing an error message
            spinner.start();
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
      spinner.fail(kleur.red(`💥 Error: ${error.message}`));
      process.exit(1);
    }
  });

// Parse the command line arguments
program.parse(process.argv);


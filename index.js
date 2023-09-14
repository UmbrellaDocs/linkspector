#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import path from "path";
import yaml from "js-yaml";
import { program } from "commander";
import kleur from "kleur";
import { validateConfig } from "./lib/validate-config.js";
import { prepareFilesList } from "./lib/prepare-file-list.js";
import { extractMarkdownHyperlinks } from "./lib/extract-markdown-hyperlinks.js";
import { extractAsciiDocLinks } from "./lib/extract-asciidoc-hyperlinks.js";
import { getUniqueLinks } from "./lib/get-unique-links.js";
import { checkHyperlinks } from "./lib/batch-check-links.js";
import { updateLinkstatusObj } from "./lib/update-linkstatus-obj.js";

// Define the program and its options
program
  .version("0.1.0")
  .description("Check for dead hyperlinks in your markup language files.")
  .command("check")
  .description("Check hyperlinks based on the configuration file.")
  .option("-c, --config <path>", "Specify a custom configuration file path")
  .action(async (cmd) => {
    const configFile = cmd.config || ".linkspector.yml"; // Use custom config file path if provided

    // Check if the config file exists
    if (!existsSync(configFile)) {
      console.error(
        kleur.red(
          "Error: Configuration file not found. Create a '.linkspector.yml' file at the root of your project or use the '--config' option to specify another configuration file."
        )
      );
      process.exit(1);
    }

    // Read and validate the config file
    try {
      // Read the YAML file
      const configContent = readFileSync(configFile, "utf-8");

      // Check if the YAML content is empty
      if (!configContent.trim()) {
        console.error("Error: The configuration file is empty.");
        return false;
      }

      // Parse the YAML content
      const config = yaml.load(configContent);

      // Check if the parsed YAML object is null or lacks properties
      if (config === null || Object.keys(config).length === 0) {
        console.error("Error: Failed to parse the YAML content.");
        return false;
      }

      if (!validateConfig(config)) {
        console.error(kleur.red("Error: Invalid config file."));
        process.exit(1);
      }

      let hasErrorLinks = false;

      // Prepare the list of files to check
      const filesToCheck = prepareFilesList(config);

      // Initialize an array to store link status objects
      let linkStatusObjects = [];

      // Process each file
      for (const file of filesToCheck) {
        const relativeFilePath = path.relative(process.cwd(), file);

        // Get the file extension
        const fileExtension = path.extname(file).substring(1).toLowerCase(); // Get the file extension without the leading dot and convert to lowercase

        let astNodes;

        // Check the file extension and use the appropriate function to extract links
        if (
          ["asciidoc", "adoc", "asc"].includes(fileExtension) &&
          config.fileExtensions &&
          config.fileExtensions.includes(fileExtension)
        ) {
          astNodes = await extractAsciiDocLinks(file);
        } else {
          const fileContent = readFileSync(file, "utf8");
          astNodes = extractMarkdownHyperlinks(fileContent);
        }

        // Get unique hyperlinks
        const uniqueLinks = getUniqueLinks(astNodes);

        // Check the status of hyperlinks
        const linkStatus = await checkHyperlinks(uniqueLinks);
        // Update linkStatusObjects with information about removed links

        linkStatusObjects = await updateLinkstatusObj(
          linkStatusObjects,
          linkStatus
        );

        const errorLinks = linkStatusObjects.filter(
          (link) => link.status === "error"
        );

        if (errorLinks.length > 0) {
          for (const item of errorLinks) {
            console.error(
              kleur.red(
                `${relativeFilePath}, ${item.link}, ${item.status_code}, ${item.line_number}, ${item.error_message}`
              )
            );
          }
          hasErrorLinks = true;
        }
      }
      if (hasErrorLinks) {
        console.error(kleur.red("❌ Found link errors in one or more files."));
        process.exit(1);
      } else {
        console.log(kleur.green("✅ All links are working."));
      }
    } catch (error) {
      console.error(kleur.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

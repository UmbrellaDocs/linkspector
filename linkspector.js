import { readFileSync, existsSync } from "fs";
import path from "path";
import yaml from "js-yaml";
import { validateConfig } from "./lib/validate-config.js";
import { prepareFilesList } from "./lib/prepare-file-list.js";
import { extractMarkdownHyperlinks } from "./lib/extract-markdown-hyperlinks.js";
import { extractAsciiDocLinks } from "./lib/extract-asciidoc-hyperlinks.js";
import { getUniqueLinks } from "./lib/get-unique-links.js";
import { checkHyperlinks } from "./lib/batch-check-links.js";
import { updateLinkstatusObj } from "./lib/update-linkstatus-obj.js";

export async function* linkspector(configFile) {
  // Check if the config file exists
  if (!existsSync(configFile)) {
    throw new Error(
      "Configuration file not found. Create a '.linkspector.yml' file at the root of your project or use the '--config' option to specify another configuration file."
    );
  }

  // Read and validate the config file
  const configContent = readFileSync(configFile, "utf-8");

  // Check if the YAML content is empty
  if (!configContent.trim()) {
    throw new Error("The configuration file is empty.");
  }

  // Parse the YAML content
  const config = yaml.load(configContent);

  // Check if the parsed YAML object is null or lacks properties
  if (config === null || Object.keys(config).length === 0) {
    throw new Error("Failed to parse the YAML content.");
  }

  try {
    const isValid = await validateConfig(config);
    if (!isValid) {
      console.error("Validation failed!")
      process.exit(1);
    }
  } catch (error) {
    console.error(`💥 Error: Please check your configuration file.`)
    process.exit(1);
  }

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
    //console.log(JSON.stringify(uniqueLinks))

    // Check the status of hyperlinks
    const linkStatus = await checkHyperlinks(uniqueLinks);

    // Update linkStatusObjects with information about removed links
    linkStatusObjects = await updateLinkstatusObj(
      linkStatusObjects,
      linkStatus
    );

    // Yield an object with the relative file path and its result
    yield {
      file: relativeFilePath,
      result: linkStatusObjects,
    };
  }
}

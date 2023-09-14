import { readFileSync, existsSync } from "fs";
import { resolve, relative } from "path";
import { glob } from "glob";
import path from "path";
import ignore from "ignore";

/**
 * Normalize a file path by removing leading './' if present.
 * @param {string} filePath - The file path to normalize.
 * @returns {string} The normalized file path.
 */
function normalizeFilePath(filePath) {
  if (filePath.startsWith("./")) {
    return filePath.substring(2); // Remove leading './'
  }
  return filePath;
}

/**
 * Reads the .gitignore file and filters the list of files.
 * @param {string[]} filenames - An array of filenames to filter.
 * @returns {string[]} An array of filtered filenames.
 */
function filterFiles(filenames) {
  // Read the .gitignore file from the current directory
  const gitignore = readFileSync(".gitignore", "utf8");

  // Create an ignore object and add the .gitignore rules
  const ig = ignore();
  ig.add(gitignore);

  // Filter the filenames using the ignore object
  const filtered = ig.filter(filenames);

  // Return the filtered array
  return filtered;
}

// A function that removes duplicates from an array of strings
function removeDuplicates(array) {
  // Create a new Set object from the array
  const set = new Set(array);

  // Convert the Set object back to an array
  const unique = [...set];

  // Return the unique array
  return unique;
}

/**
 * Prepares a list of files based on the configuration options.
 * @param {string} config - The YML config object.
 * @returns {string[]} An array of file paths.
 */
function prepareFilesList(config) {
  try {
    let files = [];
    let specifiedFiles = config.files
      ? config.files.map((file) => file.trim())
      : [];
    let dirs = config.dirs ? config.dirs.map((dir) => dir.trim()) : [];
    let excludedFiles = config.excludedFiles
      ? config.excludedFiles.map((file) => normalizeFilePath(file.trim())) // Normalize paths
      : [];
    let excludedDirs = config.excludedDirs
      ? config.excludedDirs.map((dir) => {
          // Normalize the excluded directory path
          return normalizeFilePath(dir.trim());
        })
      : [];

    // Set a default file extension to "md" if not defined
    const fileExtensions = config.fileExtensions || ["md"];

    // Check if specified files exist and add them to the list
    specifiedFiles.forEach((file) => {
      const filePath = resolve(process.cwd(), file);
      const fileExtension = path.extname(filePath).substring(1); // Get the file extension without the leading dot

      if (existsSync(filePath)) {
        if (!files.includes(filePath)) {
          if (fileExtensions.includes(fileExtension)) {
            files.push(filePath);
          } else {
            console.warn(
              `ℹ️ The file "${file}" specified in the config does not have the correct extension. Use "fileExtensions" to configure the extensions.`
            );
          }
        } else {
          console.warn(
            `ℹ️ The file "${file}" specified in the config is already included.`
          );
        }
      } else {
        console.warn(
          `ℹ️ The file "${file}" specified in the config does not exist.`
        );
      }
    });

    // Search all specified dirs recursively using glob
    dirs.forEach((dir) => {
      let directory = dir;
      if (dir === "." || dir === "./") {
        // Use the current working directory if dir is '.' or './'
        directory = process.cwd() + "/";
      }

      // Check if the dir exists
      if (existsSync(directory)) {
        files.push(
          ...glob.sync(path.join(directory, "**", `*.${fileExtensions[0]}`))
        );
      } else {
        console.error(
          `ℹ️ The directory "${directory}" specified in the config does not exist.`
        );
      }
    });

    // Make the file paths relative to the current working directory
    let relativeFiles = files.map((file) => relative(process.cwd(), file));

    // Remove any duplicates from the list of files
    relativeFiles = removeDuplicates(relativeFiles);

    // Use filterFiles function to filter the files based on .gitignore
    if (config.useGitIgnore === true) {
      relativeFiles = filterFiles(relativeFiles);
    }

    // Use the ignore module to filter out excluded files and directories specified in YAML
    const ig = ignore();
    ig.add(excludedFiles);
    ig.add(excludedDirs.map((dir) => dir + "/**")); // Include subdirectories of excludedDirs

    relativeFiles = relativeFiles.filter((file) => {
      return !ig.ignores(file);
    });

    // Rest of your code for normalization and filtering

    return relativeFiles.map((file) => resolve(process.cwd(), file)); // Convert back to absolute paths
  } catch (err) {
    // Handle any other errors that may occur
    console.error(err.message);
    return [];
  }
}

export { prepareFilesList };

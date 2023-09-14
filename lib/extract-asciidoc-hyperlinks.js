import fs from "fs";
import readline from "readline";

function extractAsciiDocLinks(filePath) {
  return new Promise((resolve) => {
    const links = [];

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    let lineNumber = 0;

    // Updated regular expression to match only the URLs in the specified formats
    const urlRegex =
      /(?:https?|ftp|irc|mailto):\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;

    rl.on("line", (line) => {
      lineNumber++;

      let match;
      while ((match = urlRegex.exec(line)) !== null) {
        const url = match[0].replace(/^link:/, ""); // Remove 'link:' prefix if present
        const position = {
          start: { line: lineNumber, column: match.index, offset: match.index },
          end: {
            line: lineNumber,
            column: match.index + match[0].length,
            offset: match.index + match[0].length,
          },
        };

        // Updated logic to extract the optional link text from the line
        let title = null;
        let children = [];
        const linkTextRegex = /\[([^\]]+)\]/g; // Regular expression to match the link text inside brackets
        linkTextRegex.lastIndex = position.end.offset; // Set the starting index to the end of the URL
        const linkTextMatch = linkTextRegex.exec(line); // Try to find a link text after the URL
        if (linkTextMatch) {
          // If a link text is found, use it as the title and children value
          title = linkTextMatch[1];
          children.push({
            type: "text",
            value: title,
            position: {
              start: {
                line: lineNumber,
                column: linkTextMatch.index + 1,
                offset: linkTextMatch.index + 1,
              },
              end: {
                line: lineNumber,
                column: linkTextMatch.index + linkTextMatch[0].length - 1,
                offset: linkTextMatch.index + linkTextMatch[0].length - 1,
              },
            },
          });
          // Update the position end to include the link text
          position.end.column += linkTextMatch[0].length;
          position.end.offset += linkTextMatch[0].length;
        } else {
          // If no link text is found, use the URL as the children value
          children.push({
            type: "text",
            value: url,
            position: {
              start: {
                line: lineNumber,
                column: match.index + 1,
                offset: position.start.offset + 1,
              },
              end: {
                line: lineNumber,
                column: match.index + url.length + 1,
                offset: position.start.offset + url.length + 1,
              },
            },
          });
        }

        const linkNode = {
          type: "link",
          title: title,
          url: url,
          children: children,
          position: position,
        };

        links.push(linkNode);
      }
    });

    rl.on("close", () => {
      resolve(links);
    });
  });
}

export { extractAsciiDocLinks };

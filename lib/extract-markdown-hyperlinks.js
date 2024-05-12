import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { doReplacements } from "./handle-links-modification.js";

//
// Function: extractMarkdownHyperlinks
// Description: Extracts all links from a markdown string
// Arguments:
//   markdownText - The markdown string to extract links from
//   options (optional) - An object specifying additional settings
//     - ignorePatterns (optional) - An array of objects holding regular expressions to skip link checking
//     - replacementPatterns (optional) - An array of objects holding regular expressions for link replacements
//     - baseUrl (optional) - A string specifying the base URL to prefix to URLs that start with '/'
// Returns:
//   An array of MDAST nodes that represent headings, links, link references, definitions, and image references
// See https://github.com/syntax-tree/mdast for more information on the types of MDAST nodes
//

function extractMarkdownHyperlinks(markdownText, options) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdownText);

  const links = [];
  visit(tree, ["link", "definition", "image"], (node) => {
    links.push(node);
  });
  return doReplacements(links, options);
}

export { extractMarkdownHyperlinks };

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

//
// Function: extractMarkdownHyperlinks
// Description: Extracts all links from a markdown string
// Arguments:
//   markdownText - The markdown string to extract links from
//   options (optional) - An object specifying additional settings
//     - ignorePatterns (optional) - An array of objects holding regular expressions to skip link checking
//     - replacementPatterns (optional) - An array of objects holding regular expressions for link replacements
//     - baseURL (optional) - A string specifying the base URL to prefix to URLs that start with '/'
// Returns:
//   An array of MDAST nodes that represent headings, links, link references, definitions, and image references
// See https://github.com/syntax-tree/mdast for more information on the types of MDAST nodes
//

function extractMarkdownHyperlinks(markdownText, options = {}) {
  const { ignorePatterns = [], replacementPatterns = [], baseURL } = options;
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdownText);

  const links = [];
  visit(tree, ['link', 'definition'], (node) => {
    let { url } = node;
    // Skip link checking if it matches any ignore pattern
    if (ignorePatterns.some(({ pattern }) => {
      const regex = new RegExp(pattern);
      return regex.test(url);
    })) {
      return;
    }

    // Prefix the base URL to URLs that start with '/'
    if (baseURL && url.startsWith('/')) {
      url = baseURL + url;
    }

    // Replace link URL based on replacement patterns
    replacementPatterns.forEach(({ pattern, replacement }) => {
      url = url.replace(new RegExp(pattern), replacement);
    });
    node.url = url;

    links.push(node);
  });
  return links;
}

export { extractMarkdownHyperlinks };

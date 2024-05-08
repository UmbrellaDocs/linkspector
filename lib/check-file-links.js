import fs from "fs";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

function checkFileExistence(link, file) {
  let statusCode, status, errorMessage;

  try {
    let fileDir = path.dirname(file);
    let [urlWithoutSection, sectionId] = link.url.split("#");
    let filePath = path.resolve(fileDir, urlWithoutSection);

    if (link.url.startsWith("#")) {
      sectionId = link.url.slice(1);
      filePath = file;
    }

    if (fs.existsSync(filePath)) {
      statusCode = "200";
      status = "alive";
      if (sectionId) {
        let mdContent = fs.readFileSync(filePath, "utf8");
        const tree = unified().use(remarkParse).use(remarkGfm).parse(mdContent);

        let headingNodes = new Set();
        visit(tree, "heading", (node) => {
          let headingId;
          if (node.children[0].type === "html") {
            let match = node.children[0].value.match(/name="(.+?)"/);
            if (match) {
              headingId = match[1];
            }
          } else {
            let headingText = node.children[0].value;
            if (headingText.includes("{#")) {
              let match = headingText.match(/{#(.+?)}/);
              if (match) {
                headingId = match[1];
              }
            } else {
              headingId = headingText
                .toLowerCase()
                .replace(/ /g, "-")
                .replace(/\./g, "");
            }
          }
          headingNodes.add(headingId);
        });

        if (!headingNodes.has(sectionId)) {
          statusCode = "404";
          status = "error";
          errorMessage = `Cannot find section: ${sectionId} in file: ${link.url}.`;
        }
      }
    } else {
      statusCode = "404";
      status = "error";
      errorMessage = `Cannot find: ${link.url}.`;
    }
  } catch (err) {
    console.error(`Error in checking if file ${link.url} exist! ${err}`);
  }

  return { statusCode, status, errorMessage };
}

export { checkFileExistence };

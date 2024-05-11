"use strict";

function updateLinkStatusObj(astNodes, linkStatus) {
  const updatedLinkStatus = [...linkStatus];
  astNodes.forEach((node) => {
    const existingLink = linkStatus.find((link) => link.link === node.url);
    if (existingLink) {
      const existingPosition = existingLink.position;
      const nodePosition = node.position;
      if (
        existingPosition.start.line !== nodePosition.start.line ||
        existingPosition.start.column !== nodePosition.start.column ||
        existingPosition.end.line !== nodePosition.end.line ||
        existingPosition.end.column !== nodePosition.end.column
      ) {
        updatedLinkStatus.push({
          ...existingLink,
          line_number: nodePosition.start.line,
          position: nodePosition,
        });
      }
    } else {
      updatedLinkStatus.push({
        link: node.url,
        status: null,
        status_code: null,
        line_number: null,
        position: node.position,
        error_message: null,
        title: node.title,
        children: node.children,
      });
    }
  });
  return updatedLinkStatus;
}

export { updateLinkStatusObj };

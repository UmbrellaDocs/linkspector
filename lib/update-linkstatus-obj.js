'use strict';

function updateLinkstatusObj(astNodes, linkStatus) {
  const tempObject = {};
  astNodes.forEach((node) => {
    const url = node.url;
    if (tempObject[url]) {
      tempObject[url].push(node);
    } else {
      tempObject[url] = [node];
    }
  });

  for (const url in tempObject) {
    const nodes = tempObject[url];
    if (nodes.length > 1) {
      const firstNode = nodes[0];
      for (let i = 1; i < nodes.length; i++) {
        const newNode = nodes[i];
        const matchingLinkStatus = linkStatus.find((status) => status.link === newNode.url);
        if (matchingLinkStatus) {
          linkStatus.push({
            ...matchingLinkStatus,
            line_number: newNode.position.start.line,
            position: {
              start: {
                line: newNode.position.start.line,
                column: newNode.position.start.column,
                offset: newNode.position.start.offset,
              },
              end: {
                line: newNode.position.end.line,
                column: newNode.position.end.column,
                offset: newNode.position.end.offset,
              },
            },
          });
        }
      }
    }
  }

  return linkStatus;
}

export { updateLinkstatusObj };
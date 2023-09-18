import puppeteer from "puppeteer";
import url from "url";
import fs from "fs";

function isUrl(s) {
  try {
    new url.URL(s);
    return true;
  } catch (err) {
    return false;
  }
}

async function processLink(link, page, aliveStatusCodes) {
  let linkStatus = {
    link: link.url,
    status: null,
    status_code: null,
    line_number: link.position ? link.position.start.line : null,
    position: link.position,
    error_message: null,
  };

  try {
    if (isUrl(link.url)) {
      const response = await page.goto(link.url, { waitUntil: "load" });
      const statusCode = response.status();
      linkStatus.status_code = statusCode;

      if (aliveStatusCodes && aliveStatusCodes.includes(statusCode)) {
        linkStatus.status = "assumed alive";
      } else {
        linkStatus.status = response.ok() ? "alive" : "error";
      }
    } else {
      try {
        if (fs.existsSync(link.url)) {
          linkStatus.status_code = "200";
          linkStatus.status = "alive";
        } else {
          linkStatus.status_code = "404";
          linkStatus.status = "error";
          linkStatus.error_message = `Cannot find: ${link.url}.`
        }
      } catch (err){
        console.error(`Error in checking if file ${link.url} exist!`)
      }

    }
  } catch (error) {
    linkStatus.status = "error";
    linkStatus.error_message = error.message;
  }
  return linkStatus;
}

async function checkHyperlinks(nodes, options = {}) {
  const { batchSize = 100, retryCount = 3, aliveStatusCodes } = options;
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--disable-features=DialMediaRouteProvider"],
  });
  const linkStatusList = [];

  const filteredNodes = nodes.filter(
    (node) => node.type === "link" || node.type === "definition"
  );

  for (let i = 0; i < filteredNodes.length; i += batchSize) {
    const batch = filteredNodes.slice(i, i + batchSize);
    const promises = batch.map(async (link) => {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36"
      );

      await page.setRequestInterception(true);
      page.on("request", (request) => {
        if (request.isInterceptResolutionHandled()) return;
        const resourceType = request.resourceType();
        if (
          resourceType === "font" ||
          resourceType === "image" ||
          resourceType === "media" ||
          resourceType === "script" ||
          resourceType === "stylesheet" ||
          resourceType === "other" ||
          resourceType === "websocket"
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });

      let retryCountLocal = 0;
      let linkStatus;

      while (retryCountLocal < retryCount) {
        try {
          linkStatus = await processLink(link, page, aliveStatusCodes);
          break;
        } catch (error) {
          retryCountLocal++;
        }
      }

      await page.close();
      linkStatusList.push(linkStatus);
    });

    await Promise.all(promises);
  }

  await browser.close();
  return linkStatusList;
}

async function checkHyperlinksStream(nodes, options = {}, callback) {
  const { batchSize = 100, retryCount = 3, aliveStatusCodes } = options;
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--disable-features=DialMediaRouteProvider"],
  });
  const filteredNodes = nodes.filter(
    (node) => node.type === "link" || node.type === "definition"
  );

  for (let i = 0; i < filteredNodes.length; i += batchSize) {
    const batch = filteredNodes.slice(i, i + batchSize);
    const promises = batch.map(async (link) => {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36"
      );

      let retryCountLocal = 0;
      let linkStatus;

      while (retryCountLocal < retryCount) {
        try {
          linkStatus = await processLink(link, page, aliveStatusCodes);
          break;
        } catch (error) {
          retryCountLocal++;
        }
      }

      await page.close();
      callback(linkStatus);
    });

    await Promise.all(promises);
  }

  await browser.close();
}

export { checkHyperlinks, checkHyperlinksStream };

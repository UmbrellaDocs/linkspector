import { expect, test } from "vitest";
import { linkspector } from "./linkspector.js";

let cmd = {
  json: true,
};

test("linkspector should check image links in Markdown file", async () => {
  let hasErrorLinks = false;
  let currentFile = ""; // Variable to store the current file name
  let results = []; // Array to store the results if json is true

  for await (const { file, result } of linkspector(
    "./test/fixtures/markdown/image/imageTest.yml",
    cmd
  )) {
    currentFile = file;
    for (const linkStatusObj of result) {
      if (cmd.json) {
        results.push({
          file: currentFile,
          link: linkStatusObj.link,
          status_code: linkStatusObj.status_code,
          line_number: linkStatusObj.line_number,
          position: linkStatusObj.position,
          status: linkStatusObj.status,
          error_message: linkStatusObj.error_message,
        });
      }
      if (linkStatusObj.status === "error") {
        hasErrorLinks = true;
      }
    }
  }

  expect(hasErrorLinks).toBe(false);
  expect(results.length).toBe(1);
  expect(results[0].link).toBe(
    "https://commons.wikimedia.org/wiki/Main_Page#/media/File:Praia_do_Ribeiro_do_Cavalo2.jpg"
  );
  expect(results[0].status).toBe("alive");
});

test("linkspector should check relative links in Markdown file", async () => {
  let hasErrorLinks = false;
  let currentFile = ""; // Variable to store the current file name
  let results = []; // Array to store the results if json is true

  for await (const { file, result } of linkspector(
    "./test/fixtures/markdown/relative/.relativeTest.yml",
    cmd
  )) {
    currentFile = file;
    for (const linkStatusObj of result) {
      if (cmd.json) {
        results.push({
          file: currentFile,
          link: linkStatusObj.link,
          status_code: linkStatusObj.status_code,
          line_number: linkStatusObj.line_number,
          position: linkStatusObj.position,
          status: linkStatusObj.status,
          error_message: linkStatusObj.error_message,
        });
      }
      if (linkStatusObj.status === "error") {
        hasErrorLinks = true;
      }
    }
  }

  expect(hasErrorLinks).toBe(true);
  expect(results.length).toBe(8);
  expect(results[0].status).toBe("alive");
  expect(results[1].status).toBe("alive");
  expect(results[2].status).toBe("alive");
  expect(results[3].status).toBe("alive");
  expect(results[4].status).toBe("alive");
  expect(results[5].status).toBe("alive");
  expect(results[6].status).toBe("error");
  expect(results[7].status).toBe("error");
});

test("linkspector should check top-level relative links in Markdown file", async () => {
  let hasErrorLinks = false;
  let currentFile = ""; // Variable to store the current file name
  let results = []; // Array to store the results if json is true

  for await (const { file, result } of linkspector(
    "./.linkspector.test.yml",
    cmd
  )) {
    currentFile = file;
    for (const linkStatusObj of result) {
      if (cmd.json) {
        results.push({
          file: currentFile,
          link: linkStatusObj.link,
          status_code: linkStatusObj.status_code,
          line_number: linkStatusObj.line_number,
          position: linkStatusObj.position,
          status: linkStatusObj.status,
          error_message: linkStatusObj.error_message,
        });
      }
      if (linkStatusObj.status === "error") {
        hasErrorLinks = true;
      }
    }
  }

  expect(hasErrorLinks).toBe(false);
  expect(results.length).toBe(5);
});

test("linkspector should add back the removed duplicates when returning the results", async () => {
  let hasErrorLinks = false;
  let currentFile = ""; // Variable to store the current file name
  let results = []; // Array to store the results if json is true

  for await (const { file, result } of linkspector(
    "./test/fixtures/markdown/duplicates/duplicateTest.yml",
    cmd
  )) {
    currentFile = file;
    for (const linkStatusObj of result) {
      if (cmd.json) {
        results.push({
          file: currentFile,
          link: linkStatusObj.link,
          status_code: linkStatusObj.status_code,
          line_number: linkStatusObj.line_number,
          position: linkStatusObj.position,
          status: linkStatusObj.status,
          error_message: linkStatusObj.error_message,
        });
      }
      if (linkStatusObj.status === "error") {
        hasErrorLinks = true;
      }
    }
  }

  expect(hasErrorLinks).toBe(true);
  expect(results.length).toBe(4);
  expect(results[0].status).toBe("alive");
  expect(results[1].status).toBe("error");
  expect(results[2].status).toBe("alive");
  expect(results[3].status).toBe("error");
});

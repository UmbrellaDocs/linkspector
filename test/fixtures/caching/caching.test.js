import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { linkspector } from '../../../linkspector.js';
import path from 'path';

// --- Mocking fetch and Counters ---
let fetchCounters;
const mockResponses = {
  'https://www.google.com': { ok: true, status: 200, status_text: 'OK' },
  'https://www.bing.com': { ok: true, status: 200, status_text: 'OK' },
  'https://nonexistent.example.com/bad': { ok: false, status: 404, status_text: 'Not Found' }
};
const originalFetch = global.fetch;

// Default config path, can be overridden by passing a different path to the helper
const defaultConfigPath = 'test/fixtures/caching/linkspector.config.caching.yml';

// Helper function to run linkspector
async function runLinkspectorWithSettings(cmdSettings, customConfigPath) {
  const results = [];
  const resolvedConfigPath = customConfigPath || defaultConfigPath;
  // Ensure cmdSettings always has a default for json if not provided, as linkspector might expect it.
  const fullCmdSettings = { json: false, ...cmdSettings };
  for await (const result of linkspector(resolvedConfigPath, fullCmdSettings)) {
    results.push(result);
  }
  return results;
}

// Expected results structure (simplified, focusing on what's being tested)
const getExpectedResultForFile = (fileName, link, status, statusCode, statusText, lineNumber, startColumn, endColumn, isError, errorMessage) => ({
  link,
  status,
  status_code: statusCode,
  status_text: statusText,
  line_number: lineNumber,
  // Position matching can be very specific, ensure these match the markdown exactly
  // For simplicity, we'll check the presence of position and line number.
  // More precise position matching can be added if needed.
  position: expect.objectContaining({
    start: expect.objectContaining({ line: lineNumber, column: startColumn }),
    end: expect.objectContaining({ line: lineNumber, column: endColumn }),
  }),
  isError,
  error_message: errorMessage,
});


describe('Linkspector Caching Behavior', () => {
  beforeEach(() => {
    // Reset counters and mock fetch before each test
    fetchCounters = {
      'https://www.google.com': 0,
      'https://nonexistent.example.com/bad': 0,
      'https://www.bing.com': 0
    };
    global.fetch = async (url) => {
      if (fetchCounters[url] !== undefined) {
        fetchCounters[url]++;
      }
      const respDetails = mockResponses[url] || { ok: false, status: 500, status_text: 'Server Error' };
      return {
        ...respDetails,
        headers: new Map(),
        redirected: false,
        url: url,
        // Adding text() method to mock response, as it might be used by the link checker
        text: async () => `${respDetails.status_text}`
      };
    };
  });

  afterAll(() => {
    // Restore original fetch after all tests
    global.fetch = originalFetch;
  });

  it('should use cache when --use-cache is enabled', async () => {
    const results = await runLinkspectorWithSettings({ useCache: true });

    // Assert fetch call counts
    expect(fetchCounters['https://www.google.com']).toBe(1);
    expect(fetchCounters['https://nonexistent.example.com/bad']).toBe(1);
    expect(fetchCounters['https://www.bing.com']).toBe(1);

    // Assert linkspector results
    expect(results.length).toBe(2);

    const file1Result = results.find(r => r.file.endsWith('cache_test_file1.md'));
    expect(file1Result).toBeDefined();
    expect(file1Result.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining(getExpectedResultForFile('cache_test_file1.md', 'https://www.google.com', 'alive', 200, 'OK', 1, 13, 35, false, null)),
        expect.objectContaining(getExpectedResultForFile('cache_test_file1.md', 'https://nonexistent.example.com/bad', 'error', 404, 'Not Found', 2, 12, 51, true, 'HTTP error 404: Not Found')),
      ])
    );

    const file2Result = results.find(r => r.file.endsWith('cache_test_file2.md'));
    expect(file2Result).toBeDefined();
    expect(file2Result.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining(getExpectedResultForFile('cache_test_file2.md', 'https://www.bing.com', 'alive', 200, 'OK', 1, 21, 41, false, null)),
        // Cached results:
        expect.objectContaining(getExpectedResultForFile('cache_test_file2.md', 'https://www.google.com', 'alive', 200, 'OK', 2, 13, 35, false, null)),
        expect.objectContaining(getExpectedResultForFile('cache_test_file2.md', 'https://nonexistent.example.com/bad', 'error', 404, 'Not Found', 3, 12, 51, true, 'HTTP error 404: Not Found')),
      ])
    );
  });

  it('should NOT use cache when --use-cache is disabled', async () => {
    const results = await runLinkspectorWithSettings({ useCache: false });

    // Assert fetch call counts
    expect(fetchCounters['https://www.google.com']).toBe(2); // Called for each file
    expect(fetchCounters['https://nonexistent.example.com/bad']).toBe(2); // Called for each file
    expect(fetchCounters['https://www.bing.com']).toBe(1); // Only in one file

    // Assert linkspector results (should be same content as caching enabled, but fetch counts differ)
    expect(results.length).toBe(2);

    const file1Result = results.find(r => r.file.endsWith('cache_test_file1.md'));
    expect(file1Result).toBeDefined();
     expect(file1Result.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining(getExpectedResultForFile('cache_test_file1.md', 'https://www.google.com', 'alive', 200, 'OK', 1, 13, 35, false, null)),
        expect.objectContaining(getExpectedResultForFile('cache_test_file1.md', 'https://nonexistent.example.com/bad', 'error', 404, 'Not Found', 2, 12, 51, true, 'HTTP error 404: Not Found')),
      ])
    );

    const file2Result = results.find(r => r.file.endsWith('cache_test_file2.md'));
    expect(file2Result).toBeDefined();
    expect(file2Result.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining(getExpectedResultForFile('cache_test_file2.md', 'https://www.bing.com', 'alive', 200, 'OK', 1, 21, 41, false, null)),
        expect.objectContaining(getExpectedResultForFile('cache_test_file2.md', 'https://www.google.com', 'alive', 200, 'OK', 2, 13, 35, false, null)),
        expect.objectContaining(getExpectedResultForFile('cache_test_file2.md', 'https://nonexistent.example.com/bad', 'error', 404, 'Not Found', 3, 12, 51, true, 'HTTP error 404: Not Found')),
      ])
    );
  });

  it('should respect MAX_CACHE_SIZE limit', async () => {
    // Specific fetch counters and mock for this test
    const cacheLimitFetchCounters = {
      'https://cachetest.example.com/link1': 0,
      'https://cachetest.example.com/link2': 0,
      'https://cachetest.example.com/link3': 0,
    };
    const originalFetchForThisTest = global.fetch; // Store potentially existing mock

    global.fetch = async (url) => {
      if (cacheLimitFetchCounters[url] !== undefined) {
        cacheLimitFetchCounters[url]++;
      }
      // Assuming all these links are 'alive' for simplicity of this test
      return { 
        ok: true, 
        status: 200, 
        status_text: 'OK', 
        headers: new Map(), 
        redirected: false, 
        url: url,
        text: async () => 'OK' 
      };
    };

    const limitTestConfigPath = 'test/fixtures/caching/linkspector.config.caching_limit.yml';
    // Results are not the primary focus here, but fetch counts are.
    // We run linkspector with caching enabled.
    await runLinkspectorWithSettings({ useCache: true }, limitTestConfigPath);

    // Assert fetch call counts based on maxCacheSize: 2
    // File1: link1, link2 fetched. Cache: {link1, link2}. Size: 2.
    // File2: link3 fetched. Cache is full. link3 not added. link1 is from cache.
    // File3: link2 from cache. link3 not in cache (wasn't added), so fetched again.
    expect(cacheLimitFetchCounters['https://cachetest.example.com/link1']).toBe(1);
    expect(cacheLimitFetchCounters['https://cachetest.example.com/link2']).toBe(1);
    expect(cacheLimitFetchCounters['https://cachetest.example.com/link3']).toBe(2);

    // Restore the fetch mock that was active before this test
    // (important if tests run in parallel or beforeEach is complex)
    global.fetch = originalFetchForThisTest;
  });
});

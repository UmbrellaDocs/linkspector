// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // the global timeout in milliseconds 10 seconds
    testTimeout: 10000,
  },
})

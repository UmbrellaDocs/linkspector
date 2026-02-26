// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Global timeout for network-heavy integration tests
    testTimeout: 30000,
  },
})

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Unit tests only, and only over pure functions.
 *
 * Nothing here touches Prisma, Clerk or DataForSEO. The code worth testing in AI Presence is
 * the arithmetic — what counts as a citation, what a component with no data does to the
 * score, when a delta must stay null — and all of it is already separated from I/O. A test
 * that needed a database would be testing the database.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

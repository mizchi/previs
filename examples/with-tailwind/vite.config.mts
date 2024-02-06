import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    "import.meta.main": JSON.stringify(false),
  },
  // @ts-ignore vitest
  test: {
    includeSource: ['**/*.{ts,tsx}'],
  }
});
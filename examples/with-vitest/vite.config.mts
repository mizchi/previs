import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    "import.meta.main": JSON.stringify(false),
  }
});
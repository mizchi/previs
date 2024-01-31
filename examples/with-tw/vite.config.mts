import { defineConfig } from 'npm:vite@5.0.11';

export default defineConfig({
  define: {
    "import.meta.main": JSON.stringify(false),
  }
});
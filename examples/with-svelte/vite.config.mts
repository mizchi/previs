import { defineConfig } from 'npm:vite@5.0.11';
import { svelte } from 'npm:@sveltejs/vite-plugin-svelte@3.0.2';
import preprocess from 'npm:svelte-preprocess@5.1.3';

export default defineConfig({
  plugins: [
    svelte({
      // @ts-ignore type unmatched
      preprocess: preprocess({}),
    })],
});

import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";

import { config as rollupConfig } from './rollup.config.mjs';

const config = async ({ outputFormat }) => defineConfig({
  esbuild: {
    target: "esnext"
  },
  optimizeDeps:{
    esbuildOptions: {
      target: "esnext",
    }
  },
  plugins: [
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: "__tla",
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: i => `__tla_${i}`
    }),
  ],
  build: {
    target: 'esnext',
    rollupOptions: (await rollupConfig({ outputFormat })),
  }
});

const viteConfig = await config({ outputFormat: 'esm' });

export default viteConfig;
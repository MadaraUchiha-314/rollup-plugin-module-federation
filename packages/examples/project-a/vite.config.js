import { defineConfig } from 'vite'; // eslint-disable-line import/no-extraneous-dependencies
import Inspect from 'vite-plugin-inspect'; // eslint-disable-line import/no-extraneous-dependencies

import { config as rollupConfig } from './rollup.config.mjs';

const config = async ({ outputFormat }) => defineConfig({
  plugins: [
    Inspect({
      build: true,
      outputDir: '.vite-inspect',
    }),
  ],
  build: {
    target: 'esnext',
    rollupOptions: await rollupConfig({ outputFormat }),
  },
});

const viteConfig = await config({ outputFormat: 'esm' });

export default viteConfig;

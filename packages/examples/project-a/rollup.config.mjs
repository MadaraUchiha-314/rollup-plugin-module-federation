import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import brotli from 'rollup-plugin-brotli';

import federation from 'rollup-plugin-module-federation';

import { federationconfig } from './federation.config.js';

const config = async ({ outputFormat }) => ({
  output: {
    dir: `dist/rollup/${outputFormat}`,
    format: outputFormat,
    sourcemap: true,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    federation(await federationconfig('rollup')),
    nodeResolve({
      browser: true,
    }),
    json(),
    commonjs(),
    brotli(),
    copy({
      targets: [
        {
          src: `./public/${outputFormat}/index.html`,
          dest: `dist/rollup/${outputFormat}`,
        },
      ],
    }),
  ],
});

const multiBuildConfig = [
  await config({ outputFormat: 'esm' }),
  await config({ outputFormat: 'system' }),
];

export default multiBuildConfig;

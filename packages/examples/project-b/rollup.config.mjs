import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';

import federation from 'rollup-plugin-module-federation';

import { federationconfig } from './federation.config.js';

const config = ({ outputFormat }) => ({
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
    federation(federationconfig('rollup', outputFormat)),
    nodeResolve({
      browser: true,
    }),
    json(),
    commonjs(),
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

export default [
  config({ outputFormat: 'esm' }),
  config({ outputFormat: 'system' }),
];

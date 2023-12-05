import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';

// import federation from '@originjs/vite-plugin-federation';
import federation from 'rollup-plugin-module-federation';

import { federationconfig } from './federation.config.js';

const outputDir = 'dist/rollup';

export default {
  output: {
    dir: outputDir,
    format: 'es',
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    federation(federationconfig('rollup')),
    nodeResolve({
      browser: true,
    }),
    json(),
    commonjs(),
    copy({
      targets: [
        {
          src: './public/index.html',
          dest: outputDir,
        },
      ],
    }),
  ],
};

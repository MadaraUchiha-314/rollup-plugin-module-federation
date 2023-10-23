import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { federationconfig } from './federation.config.js';

import federation from "@originjs/vite-plugin-federation";
// import federation from 'rollup-plugin-module-federation';

export default {
  output: {
    dir: 'dist/rollup',
    format: 'es',
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    federation(federationconfig),
    nodeResolve(),
    commonjs(),
  ],
};

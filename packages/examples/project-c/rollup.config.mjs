import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';

const outputDir = 'dist/rollup';

export default {
  input: {
    index: './src/index.js',
  },
  output: {
    dir: outputDir,
    format: 'es',
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    nodeResolve({}),
    json(),
    commonjs(),
  ],
};

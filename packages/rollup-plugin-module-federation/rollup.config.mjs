import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

const config = ({ outputFormat }) => ({
  input: {
    index: 'src/index.ts',
  },
  output: {
    dir: `dist/${outputFormat}`,
    format: outputFormat,
  },
  plugins: [
    typescript(),
    json(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    nodeResolve(),
    commonjs(),
  ],
});

export default [
  config({ outputFormat: 'esm' }),
  config({ outputFormat: 'cjs' }),
];

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

export default {
  input: {
    index: 'src/index.js',
    __federatedImport__: 'src/__federatedImport__.js',
  },
  output: {
    dir: 'dist',
    format: 'es',
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    nodeResolve(),
    commonjs(),
  ],
};

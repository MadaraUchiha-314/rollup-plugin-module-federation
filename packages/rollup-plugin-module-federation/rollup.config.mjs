import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';

export default {
  input: {
    index: 'src/index.ts',
    __federatedImport__: 'src/__federatedImport__.js',
  },
  output: {
    dir: 'dist',
    format: 'es',
  },
  plugins: [
    typescript(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    nodeResolve(),
    commonjs(),
  ],
};

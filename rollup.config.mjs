import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy'

export default {
  input: {
    index: 'src/index.js',
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
    terser(),
    copy({
      targets: [
        {
          src: './src/__federatedImport__.js', dest: './dist'
        }
      ]
    })
  ],
};

import federation from '../../src/index.js';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

export default ({
    output: {
        dir: 'dist',
        format: 'es',
    },
    plugins: [
       
        replace({
          'process.env.NODE_ENV': JSON.stringify('production'),
          preventAssignment: true,
        }),
        federation({
            name: 'rr-random-package',
            filename: 'my-remote-entry.js',
            exposes: {
              './react': 'react',
              './pqr': './src/pqr.js',
              './index': './src/index.js',
            },
            shared: {
              react: {},
              'react-dom': {},
              uuid: {
                // import: false,
              },
            },
        }),
        nodeResolve(),

        commonjs(),
    ]
})
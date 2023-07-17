import federation from '../../src/index.js';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default ({
    input: {
        index: 'src/index.js',
    },
    output: {
        dir: 'dist',
        format: 'es'
    },
    plugins: [
        commonjs(),
        nodeResolve(),
        federation({
            name: 'rr-random-package',
            filename: 'my-remote-entry.js',
            exposes: {
              './index': './src/index.js',
              './react': 'react',
              './pqr': './src/pqr.js'
            },
            shared: {
              react: {},
              'react-dom': {},
              uuid: {
                import: false,
              },
            },
        }),
    ]
})
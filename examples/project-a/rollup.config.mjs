import federation from '../../src/index.js';

export default ({
    input: {
        index: 'src/index.js',
    },
    output: {
        dir: 'dist',
        format: 'es'
    },
    plugins: [
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
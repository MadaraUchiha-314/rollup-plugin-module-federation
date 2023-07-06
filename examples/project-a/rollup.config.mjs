import federation from '../../src/index.js';

export default ({
    input: 'src/index.js',
    output: {
        dir: 'dist',
        format: 'es'
    },
    plugins: [
        federation(),
    ]
})
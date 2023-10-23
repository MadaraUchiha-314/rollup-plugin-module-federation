export const federationconfig = {
  name: 'rr_random_package',
  filename: 'my-remote-entry.js',
  exposes: {
    './react': 'react',
    './pqr': './src/pqr.js',
    './index': './src/index.js',
  },
  shared: {
    react: {},
    'react-dom': {},
    uuid: {},
    redux: {},
  },
};

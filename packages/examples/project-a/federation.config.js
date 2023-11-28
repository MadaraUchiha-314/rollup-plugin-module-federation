export const federationconfig = {
  name: 'rr_random_package',
  filename: 'my-remote-entry.js',
  exposes: {
    './react': {
      import: 'react',
    },
    './pqr': {
      import: './src/pqr.js',
    },
    './index': {
      import: './src/index.js',
    },
  },
  shared: {
    react: {
      eager: true,
    },
    'react-dom': {},
    uuid: {},
    redux: {},
  },
};

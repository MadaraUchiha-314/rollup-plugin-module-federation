export const federationconfig = {
  name: 'rr_random_package',
  filename: 'my-remote-entry.js',
  exposes: {
    './react': 'react',
    './pqr': './src/pqr.js',
    './index': {
      import: './src/index.js',
    },
  },
  remotes: {
    'project-b': {
      external: 'project-b@https://example.com/my-remote-entry.js',
    }
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

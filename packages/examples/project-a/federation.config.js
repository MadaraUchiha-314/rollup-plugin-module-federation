export const federationconfig = {
  name: 'sample_project_a',
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
      external:
        'project-b@http://localhost:8080/packages/examples/project-b/dist/rollup/my-remote-entry.js',
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

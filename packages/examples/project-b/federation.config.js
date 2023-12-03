export const federationconfig = {
  name: 'sample_project_b',
  filename: 'my-remote-entry.js',
  exposes: {
    './button': './src/index.js',
  },
  shared: {
    react: {},
  },
};

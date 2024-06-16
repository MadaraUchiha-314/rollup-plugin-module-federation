export const federationconfig = () => ({
  name: 'sample_project_b',
  filename: 'my-remote-entry.js',
  exposes: {
    './button': './src/button.js',
    './link': './src/link.js',
  },
  shared: {
    react: {
      import: false,
    },
    axios: {},
  },
});

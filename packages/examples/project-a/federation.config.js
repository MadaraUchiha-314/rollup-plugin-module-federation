const getProjectBRemoteEntry = (bundler) => {
  const remoteEntryName = 'my-remote-entry.js';
  if (process.env.CI && process.env.VERCEL) {
    const projectName = 'rollup-plugin-module-federation-project-b';
    /**
     * NOTE: We are not referencing the PR url. We are always referencing the main branch deploymnt of project-b.
     * TODO: Point to the PR deployment url.
     */
    const url = `https://${projectName}.vercel.app/${bundler}/${remoteEntryName}`;
    return url;
  }
  /**
   * TODO: When we migrate to vite or something similar, we need to figure out the url from that.
   */
  const domain = 'localhost:8080';
  const packageName = 'project-b';
  const url = `http://${domain}/packages/examples/${packageName}/dist/${bundler}/${remoteEntryName}`;
  return url;
};

export const federationconfig = (bundler) => ({
  name: 'sample_project_a',
  filename: 'my-remote-entry.js',
  exposes: {
    './react': 'react',
    './pqr': './src/pqr.js',
    './index': {
      import: './src/index.js',
    },
  },
  remoteType: 'module',
  remotes: {
    'project-b': {
      external: getProjectBRemoteEntry(bundler),
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
});

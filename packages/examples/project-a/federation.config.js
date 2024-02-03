const getProjectBRemoteEntry = (bundler) => {
  const remoteEntryName = 'my-remote-entry.js';
  if (process.env.CI && process.env.VERCEL) {
    const projectName = 'rollup-plugin-module-federation-project-b';
    /**
     * NOTE-0: We are not referencing the PR url. We are always referencing the main branch deploymnt of project-b.
     * TODO: Point to the PR deployment url.
     * NOTE-1: We are always pointing to the ESM version of the remote. This is because "@module-federation/runtime" doesn't support other remote tyes.
     * TODO: Change this when multiple remote types are supported.
     */
    const url = `https://${projectName}.vercel.app/${bundler}/esm/${remoteEntryName}`;
    return url;
  }
  /**
   * TODO: When we migrate to vite or something similar, we need to figure out the url from that.
   */
  const domain = 'localhost:8080';
  const packageName = 'project-b';
  const url = `http://${domain}/packages/examples/${packageName}/dist/${bundler}/esm/${remoteEntryName}`;
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

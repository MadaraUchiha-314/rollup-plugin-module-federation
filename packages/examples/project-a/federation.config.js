
const getProjectBRemoteEntry = (bundler) => {
  const remoteEntryName = 'my-remote-entry.js';
  const packageName = 'project-b';
  if (process.env.CI && process.env.VERCEL) {
    const domain = `${packageName}-git-${process.env.VERCEL_GIT_COMMIT_REF}-${process.env.VERCEL_GIT_REPO_SLUG}`;
    const url = `https://${domain}.vercel.app/${bundler}/${remoteEntryName}`;
    return url;
  } else {
    /**
     * TODO: When we migrate to vite or something similar, we need to figure out the url from that.
     */
    const domain = 'localhost:8080';
    const url = `http://${domain}/packages/examples/${packageName}/dist/${bundler}/${remoteEntryName}`;
    return url;
  }
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

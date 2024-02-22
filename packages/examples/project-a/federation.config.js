import { sha256 } from 'js-sha256'; // eslint-disable-line import/no-extraneous-dependencies

const getProjectBRemoteEntry = async (bundler) => {
  const remoteEntryName = 'my-remote-entry.js';
  if (process.env.CI && process.env.VERCEL) {
    const projectName = 'rollup-plugin-module-federation-project-b';
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    const owner = process.env.VERCEL_GIT_REPO_OWNER;
    const prefix = 'git-';
    /**
     * Taken from: https://vercel.com/docs/deployments/generated-urls#truncation
     */
    const hash = sha256(prefix + branch + projectName).slice(0, 6);
    /**
     * Taken from: https://vercel.com/docs/deployments/generated-urls#url-with-git-branch
     * Because the documentation provided is not matching with what we see deployed we have hard-coded certain things. Will iterate as we go along.
     * If we are building in the main branch, then we will just include the production url.
     * TODO: Remove all these hacks.
     */
    const subDomain = branch === 'main'
      ? projectName
      : `${projectName.slice(0, 35)}-git-${hash}-${owner}`;
    const url = `https://${subDomain}.vercel.app/${bundler}/esm/${remoteEntryName}`;
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

export const federationconfig = async (bundler) => ({
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
      external: await getProjectBRemoteEntry(bundler),
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
  ...(bundler === 'rollup'
    ? {
      runtimePlugins: ['./ExampleRuntimePlugin.js'],
    }
    : {}),
});

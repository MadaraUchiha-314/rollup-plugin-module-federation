import crypto from 'node:crypto';

// Taken from: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#basic_example
async function digestMessage(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return hash;
}

const getProjectBRemoteEntry = async (bundler) => {
  const remoteEntryName = 'my-remote-entry.js';
  if (process.env.CI && process.env.VERCEL) {
    const projectName = 'rollup-plugin-module-federation-project-b';
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    const scope = process.env.VERCEL_GIT_REPO_SLUG
    const prefix = 'git-';
    /**
     * Taken from: https://vercel.com/docs/deployments/generated-urls#truncation
     */
    const hash = (await digestMessage(prefix + branch + projectName)).slice(0, 6);
    /**
     * Taken from: https://vercel.com/docs/deployments/generated-urls#url-with-git-branch
     */
    let subDomain = `${projectName}-git-${branch}-${scope}`;
    if (subDomain.length > 63) {
      subDomain = `${subDomain.slice(0, 56)}-${hash}`;
    }
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
      external: (await getProjectBRemoteEntry(bundler)),
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

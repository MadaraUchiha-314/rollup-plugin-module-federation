const getProjectBRemoteEntry = async (bundler) => {
  const remoteEntryName = bundler === 'webpack' ? 'my-remote-entry.js' : 'mf-manifest.json';
  if (process.env.CI && process.env.NETLIFY) {
    const projectName = 'rollup-plugin-module-federation';
    const packageName = 'project-b';
    const reviewId = process.env.REVIEW_ID;
    const branch = process.env.BRANCH;
    const prefix = branch === 'main' ? '' : `deploy-preview-${reviewId}--`;
    const url = `https://${prefix}${projectName}.netlify.app/packages/examples/${packageName}/dist/${bundler}/esm/${remoteEntryName}`;
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

export const federationconfig = async (bundler, outputFormat) => ({
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
    'project-b': await getProjectBRemoteEntry(bundler),
  },
  shared: {
    react: {
      eager: true,
    },
    'react-dom': {},
    uuid: {},
    redux: {},
  },
  library: {
    type: outputFormat === 'esm' ? 'module' : outputFormat,
  },
  ...(bundler === 'rollup' || bundler === 'rspack'
    ? {
      runtimePlugins: ['./ExampleRuntimePlugin.js'],
      manifest: true,
      getPublicPath: 'return window.location.href',
    }
    : {}),
});

import CopyPlugin from 'copy-webpack-plugin';
import ModuleFederationPlugin from 'webpack/lib/container/ModuleFederationPlugin.js';
import { federationconfig } from './federation.config.js';

import path from 'node:path';

const __dirname = path.resolve('.');

export default {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist/webpack'),
    filename: 'index.js',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      ...federationconfig,
      /**
       * Additional stuff for webpack.
       */
      library: {
        type: 'module',
      },
    }),
    new CopyPlugin({
      patterns: [{ from: 'public/index.html' }],
    }),
  ],
};

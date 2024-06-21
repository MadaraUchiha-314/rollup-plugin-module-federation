import CopyPlugin from 'copy-webpack-plugin';
import ModuleFederationPlugin from 'webpack/lib/container/ModuleFederationPlugin.js';
import { federationconfig } from './federation.config.js';

import path from 'node:path';

const __dirname = path.resolve('.');

const config = ({ outputFormat }) => ({
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, `dist/webpack/${outputFormat}`),
    filename: 'index.js',
    library: {
      type: outputFormat === 'esm' ? 'module' : outputFormat,
    },
  },
  ...(outputFormat === 'esm'
    ? {
        experiments: {
          outputModule: true,
        },
      }
    : {}),
  plugins: [
    new ModuleFederationPlugin({
      ...federationconfig('webpack', outputFormat),
    }),
    new CopyPlugin({
      patterns: [{ from: `public/${outputFormat}/index.html` }],
    }),
  ],
});

const multiBuildConfig = [
  config({ outputFormat: 'esm' }),
  config({ outputFormat: 'system' }),
];

export default multiBuildConfig;

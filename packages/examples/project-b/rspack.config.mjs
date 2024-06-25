import rspack from '@rspack/core';
import { federationconfig } from './federation.config.js';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import path from 'node:path';

const __dirname = path.resolve('.');
const { CopyRspackPlugin: CopyPlugin } = rspack;

const config = ({ outputFormat }) => ({
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, `dist/rspack/${outputFormat}`),
    filename: 'index.js',
    library: {
      type: outputFormat === 'esm' ? 'module' : outputFormat,
    },
  },
  ...(outputFormat === 'esm'
    ? {
        experiments: {
          rspackFuture: {
            newTreeshaking: true,
          },
          outputModule: true,
        },
      }
    : {}),
  plugins: [
    new ModuleFederationPlugin({
      ...federationconfig('rspack', outputFormat),
    }),
    new CopyPlugin({
      patterns: [{ from: `public/${outputFormat}/index.html` }],
    }),
  ],
});

export default [
  config({ outputFormat: 'esm' }),
  config({ outputFormat: 'system' }),
];

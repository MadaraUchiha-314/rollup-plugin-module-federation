import rspack from '@rspack/core';
import { federationconfig } from './federation.config.js';
import path from 'node:path';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';

const __dirname = path.resolve('.');

const { CopyRspackPlugin: CopyPlugin } = rspack;

const config = async ({ outputFormat }) => ({
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, `dist/rspack/${outputFormat}`),
    publicPath: 'http://localhost:8080',
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
      ...(await federationconfig('rspack')),
      /**
       * Additional stuff for webpack.
       */
      library: {
        type: outputFormat === 'esm' ? 'module' : outputFormat,
      },
    }),
    new CopyPlugin({
      patterns: [{ from: `public/${outputFormat}/index.html` }],
    }),
  ],
});

const multiBuildConfig = [await config({ outputFormat: 'esm' })];

console.log(JSON.stringify(multiBuildConfig, null, 2));

export default multiBuildConfig;

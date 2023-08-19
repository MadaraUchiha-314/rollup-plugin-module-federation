# rollup-plugin-module-federation

![Build](https://github.com/MadaraUchiha-314/rollup-plugin-module-federation/actions/workflows/ci.yaml/badge.svg)
![Node version](https://img.shields.io/node/v/rollup-plugin-module-federation)
![NPM package version](https://img.shields.io/npm/v/rollup-plugin-module-federation)

A rollup plugin for [module federation](https://github.com/module-federation).

## Install

```sh
npm install --save-dev rollup-plugin-module-federation
```

```sh
yarn add --dev rollup-plugin-module-federation
```

## Usage

```js
import federation from 'rollup-plugin-module-federation';

export default {
  plugins: [
    federation({
      name: 'rr-random-package',
      filename: 'my-remote-entry.js',
      exposes: {
        './react': 'react',
        './pqr': './src/pqr.js',
        './index': './src/index.js',
      },
      shared: {
        react: {},
        'react-dom': {},
        uuid: {},
      },
    }),
  ],
};
```

## Local development

```sh
npm install
npm run build --workspaces --if-present
```

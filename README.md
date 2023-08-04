# rollup-plugin-module-federation

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
```

### Building `project-a`

```sh
cd examples/project-a
npm install
npm run build
```

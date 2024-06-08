import { moduleFederationPlugin } from '@module-federation/sdk';
import type { Manifest } from '@module-federation/sdk';
import type { PackageJson } from 'type-fest';
import type { ExposesObject, SharedObject, RemotesObject } from './types';
import { OutputBundle } from 'rollup';

/**
 * Implements the manifest generation logic according to the spec: https://github.com/module-federation/core/issues/2496
 * @param federationConfig
 * @returns
 */
export function generateManifest(
  pkgJson: PackageJson,
  federationConfig: moduleFederationPlugin.ModuleFederationPluginOptions,
  shared: SharedObject,
  exposes: ExposesObject,
  remotes: RemotesObject,
  bundle: OutputBundle,
): Manifest {
  const INSTANCE_NAME =
    federationConfig.name ?? pkgJson.name ?? 'DEFAULT_INSTANCE_NAME';
  return {
    id: INSTANCE_NAME,
    name: INSTANCE_NAME,
    metaData: {
      name: INSTANCE_NAME,
      type: 'app',
      buildInfo: {
        buildVersion: pkgJson.version ?? '0.0.0',
        buildName: pkgJson.name ?? 'DEFAULT_PKG_JSON_NAME', // TODO: Need to sanitize this
      },
      remoteEntry: {
        name: federationConfig?.filename || 'remoteEntry.js',
        path: '',
        type: federationConfig?.library?.type === 'module' ? 'esm' : 'global',
      },
      types: {
        path: '',
        name: '',
        zip: '',
        api: '',
      },
      globalName: INSTANCE_NAME,
      pluginVersion: '',
      publicPath: '',
    },
    shared: Object.entries(shared).map(([key, value]) => ({
      id: '',
      name: '',
      version: '',
      singleton: false,
      requiredVersion: '',
      hash: '',
      assets: {
        js: {
          async: [],
          sync: [],
        },
        css: {
          async: [],
          sync: [],
        },
      },
    })),
    exposes: Object.entries(exposes).map(([key, value]) => ({
      id: '',
      name: '',
      assets: {
        js: {
          async: [],
          sync: [],
        },
        css: {
          async: [],
          sync: [],
        },
      },
      path: '',
    })),
    remotes: Object.entries(remotes).map(([key, value]) => ({
      federationContainerName: '',
      moduleName: '',
      alias: '',
      entry: '',
    })),
  };
}

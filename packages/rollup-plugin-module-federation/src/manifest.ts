import {
  DEFAULT_CONTAINER_NAME,
  DEFAULT_PKG_NAME,
  MODULE_VERSION_UNSPECIFIED,
  REMOTE_ENTRY_NAME,
} from './constants';
import type { moduleFederationPlugin, Manifest } from '@module-federation/sdk';
import type { PackageJson } from 'type-fest';
import type { ExposesObject, SharedObject, RemotesObject } from './types';
import type { OutputBundle } from 'rollup';

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
    federationConfig.name ?? pkgJson.name ?? DEFAULT_PKG_NAME;
  return {
    id: INSTANCE_NAME,
    name: INSTANCE_NAME,
    metaData: {
      name: INSTANCE_NAME,
      type: 'app',
      buildInfo: {
        buildVersion: pkgJson.version ?? MODULE_VERSION_UNSPECIFIED,
        buildName: pkgJson.name ?? DEFAULT_PKG_NAME, // TODO: Need to sanitize this
      },
      remoteEntry: {
        name: federationConfig?.filename || `${REMOTE_ENTRY_NAME}.js`,
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
    shared: Object.entries(shared).map(([sharedPkgName, sharedPkgConfig]) => ({
      id: `${INSTANCE_NAME}/${sharedPkgConfig.packageName ?? sharedPkgName}`,
      name: sharedPkgConfig.packageName ?? sharedPkgName,
      version: sharedPkgConfig?.version ? sharedPkgConfig?.version: MODULE_VERSION_UNSPECIFIED,
      singleton: sharedPkgConfig.singleton ?? false,
      requiredVersion: sharedPkgConfig.requiredVersion ? sharedPkgConfig.requiredVersion : MODULE_VERSION_UNSPECIFIED,
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

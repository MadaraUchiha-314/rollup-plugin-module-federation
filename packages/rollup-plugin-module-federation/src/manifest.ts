import {
  DEFAULT_PKG_NAME,
  MODULE_VERSION_UNSPECIFIED,
  REMOTE_ENTRY_NAME,
} from './constants';
import type {
  moduleFederationPlugin,
  Manifest,
  ManifestShared,
} from '@module-federation/sdk';
import type { PackageJson } from 'type-fest';
import type { ExposesObject, RemotesObject, FederatedModuleInfo, FederatedModuleType, SharedOrExposedModuleInfo } from './types';
import type { OutputBundle, OutputChunk } from 'rollup';
import type { UserOptions, ShareArgs } from '@module-federation/runtime/types';

export function getChunkMetaDataForModule(
  moduleName: string,
  moduleType: FederatedModuleType,
  remoteEntryFileName: string,
  federatedModuleInfo: Record<string, FederatedModuleInfo>,
  bundle: OutputBundle,
): { sync: string[], async: string[] } {
  if (moduleType === 'remote') {
    throw new Error('Trying to get the chunk meta-data for remotes which does not make any sense!');
  }
  const moduleInfo = Object.values(federatedModuleInfo).find((mInfo) => {
    return (mInfo.name === moduleName) || mInfo.alternateReferences?.includes(moduleName);
  });
  if (!moduleInfo) {
    return {
      async: [],
      sync: []
    };
  }
  /**
   * Eager modules are includes in the remote entry.
   */
  const chunkNameWithExtension =  (moduleInfo as SharedOrExposedModuleInfo)?.versionInfo?.eager ? remoteEntryFileName: (moduleInfo as SharedOrExposedModuleInfo).chunkNameWithExtension;
  return {
    sync: Array.from(new Set([chunkNameWithExtension])),
    async: Array.from(new Set((bundle[chunkNameWithExtension] as OutputChunk)?.dynamicImports ?? [])),
  }
}

export function getSharedManifest(
  instanceName: string,
  remoteEntryFileName: string,
  sharedPkgName: string,
  sharedPkgConfig: ShareArgs,
  federatedModuleInfo: Record<string, FederatedModuleInfo>,
  bundle: OutputBundle,
): ManifestShared {
  return {
    id: `${instanceName}:${sharedPkgName}`,
    name: sharedPkgName,
    version: sharedPkgConfig?.version
      ? sharedPkgConfig?.version
      : MODULE_VERSION_UNSPECIFIED,
    singleton: sharedPkgConfig.shareConfig?.singleton ?? false,
    requiredVersion: sharedPkgConfig.shareConfig?.requiredVersion
      ? sharedPkgConfig.shareConfig.requiredVersion
      : MODULE_VERSION_UNSPECIFIED,
    hash: '', // Doesn't seem to be generated by rspack. Need to check.
    assets: {
      js: getChunkMetaDataForModule(sharedPkgName, 'shared', remoteEntryFileName, federatedModuleInfo, bundle),
      css: {
        async: [],
        sync: [],
      },
    },
  };
}

/**
 * Implements the manifest generation logic according to the spec: https://github.com/module-federation/core/issues/2496
 * @param federationConfig
 * @returns
 */
export function generateManifest({
  pkgJson,
  federationConfig,
  exposes,
  remotes,
  initConfig,
  federatedModuleInfo,
  bundle,
  remoteEntryFileName,
}: {
  pkgJson: PackageJson,
  federationConfig: moduleFederationPlugin.ModuleFederationPluginOptions,
  exposes: ExposesObject,
  remotes: RemotesObject,
  initConfig: UserOptions,
  federatedModuleInfo: Record<string, FederatedModuleInfo>,
  bundle: OutputBundle,
  remoteEntryFileName: string,
}): Manifest {
  const instanceName =
    initConfig.name ?? pkgJson.name ?? DEFAULT_PKG_NAME;
  return {
    id: instanceName,
    name: instanceName,
    metaData: {
      name: instanceName,
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
      globalName: instanceName,
      pluginVersion: '',
      publicPath: '',
    },
    shared: Object.entries(initConfig.shared ?? {}).reduce<ManifestShared[]>(
      (sharedManifest, [sharedPkgName, sharedPkgConfig]) => {
        if (Array.isArray(sharedPkgConfig)) {
          return sharedManifest.concat(
            sharedPkgConfig.map((config) =>
              getSharedManifest(instanceName, remoteEntryFileName, sharedPkgName, config, federatedModuleInfo, bundle),
            ),
          );
        } else {
          sharedManifest.push(
            getSharedManifest(instanceName, remoteEntryFileName, sharedPkgName, sharedPkgConfig, federatedModuleInfo, bundle),
          );
        }
        return sharedManifest;
      },
      [],
    ),
    exposes: Object.entries(exposes).map(
      ([exposedModuleName, exposedModuleConfig]) => ({
        id: `${instanceName}:${exposedModuleName.replace('./', '')}`,
        name: exposedModuleName.replace('./', ''),
        assets: {
          js: getChunkMetaDataForModule(exposedModuleName, 'exposed', remoteEntryFileName, federatedModuleInfo, bundle),
          css: {
            async: [],
            sync: [],
          },
        },
        path: exposedModuleName,
      }),
    ),
    remotes: Object.entries(remotes).map(([key, value]) => ({
      federationContainerName: '',
      moduleName: '',
      alias: '',
      entry: '',
    })),
  };
}

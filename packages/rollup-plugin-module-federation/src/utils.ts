import { dirname, sep } from 'node:path';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { PACKAGE_JSON, DEFAULT_CONTAINER_NAME } from './constants';
import {
  generateExposeFilename,
  generateShareFilename,
  moduleFederationPlugin,
} from '@module-federation/sdk';

import type { UserOptions } from '@module-federation/runtime/types';
import type { PackageJson } from 'type-fest';
import type {
  SharedObject,
  ExposesObject,
  RemotesObject,
  FederatedModuleInfo,
  SharedOrExposedModuleInfo,
} from './types';

export function getModulePathFromResolvedId(id: string): string {
  return id?.split('?')?.[0] ?? null;
}

export function sanitizeModuleName(name: string): string {
  /**
   * Removes file name extensions from the module names.
   * Exposed modeules or even shared modules in some cases have file extension in them.
   * Doesn't seem like the module-federation/sdk provides any functions to remove this.
   */
  return name.replace(/\.[^/.]+$/, '');
}

export function getChunkNameForModule({
  sanitizedModuleNameOrPath,
  type,
}: {
  sanitizedModuleNameOrPath: string | null;
  type: 'shared' | 'exposed' | 'remote';
}) {
  /**
   * Returning an empty string might cause undefined behavior.
   */
  if (!sanitizedModuleNameOrPath) {
    throw Error(`Invalid module name provided: ${sanitizedModuleNameOrPath}`);
  }
  if (type === 'shared') {
    return generateShareFilename(sanitizedModuleNameOrPath, false);
  }
  if (type === 'exposed') {
    return generateExposeFilename(sanitizedModuleNameOrPath, false);
  }
  throw Error(`Generating chunk name for ${type} is not supported`);
}

export function getFileNameFromChunkName(chunkName: string): string {
  return `${chunkName}.js`;
}

export function getNearestPackageJson(path: string): PackageJson | null {
  const dir = lstatSync(path).isFile() ? dirname(path) : path;
  const pkgJsonPath = `${dir}${sep}${PACKAGE_JSON}`;
  if (existsSync(pkgJsonPath)) {
    return JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  }
  const parentDir = dirname(dir);
  if (parentDir === dir) {
    return null;
  }
  return getNearestPackageJson(parentDir);
}

/**
 * Get the resolved version for the module.
 * @param {string} moduleNameOrPath The module name for which a version required.
 * @returns
 */
const getVersionForModule = (
  federatedModuleInfo: Record<string, FederatedModuleInfo>,
  moduleNameOrPath: string,
) =>
  (
    Object.values(federatedModuleInfo).find(
      (moduleInfo) => moduleInfo.moduleNameOrPath === moduleNameOrPath,
    ) as SharedOrExposedModuleInfo
  ).versionInfo.version ?? null;

export function getSharedConfig(
  shared: moduleFederationPlugin.Shared,
): SharedObject {
  if (Array.isArray(shared)) {
    return shared.reduce<SharedObject>(
      (sharedObject, sharedEntity): SharedObject => {
        if (typeof sharedEntity === 'string') {
          return {
            ...sharedObject,
            [sharedEntity]: {
              import: sharedEntity,
            },
          };
        } else if (typeof sharedEntity === 'object') {
          return {
            ...sharedObject,
            ...getSharedConfig(sharedEntity),
          };
        } else {
          throw Error(
            'Could not parse item shared object[]. Item is: ',
            sharedEntity,
          );
        }
      },
      {},
    );
  } else {
    return Object.entries(shared).reduce<SharedObject>(
      (sharedObject, [key, sharedEntity]): SharedObject => {
        if (typeof sharedEntity === 'string') {
          return {
            ...sharedObject,
            [key]: {
              import: sharedEntity,
            },
          };
        } else if (typeof sharedEntity === 'object') {
          return {
            ...sharedObject,
            [key]: {
              /**
               * If someone is providing an explcit import, it will be used, else we use the key itself as the import.
               */
              import: key,
              ...sharedEntity,
            },
          };
        } else {
          throw Error(
            'Could not parse item shared object{}. Item is: ',
            sharedEntity,
          );
        }
      },
      {},
    );
  }
}

export function getExposesConfig(
  exposes: moduleFederationPlugin.Exposes,
): ExposesObject {
  if (Array.isArray(exposes)) {
    return exposes.reduce<ExposesObject>(
      (exposedModules, exposedEntity): ExposesObject => {
        if (typeof exposedEntity === 'string') {
          return {
            ...exposedModules,
            [exposedEntity]: {
              import: exposedEntity,
            },
          };
        } else if (typeof exposedEntity === 'object') {
          return {
            ...exposedModules,
            ...getExposesConfig(exposedEntity),
          };
        } else {
          throw Error(
            'Could not parse item shared object[]. Item is: ',
            exposedEntity,
          );
        }
      },
      {},
    );
  } else {
    return Object.entries(exposes).reduce<ExposesObject>(
      (exposedModules, [key, exposedEntity]): ExposesObject => {
        if (typeof exposedEntity === 'string') {
          return {
            ...exposedModules,
            [key]: {
              import: exposedEntity,
            },
          };
        } else if (Array.isArray(exposedEntity)) {
          throw Error(
            'Specifying an array as an entrypoint for exposed modules is not supported yet',
          );
        } else if (typeof exposedEntity === 'object') {
          return {
            ...exposedModules,
            [key]: exposedEntity,
          };
        } else {
          throw Error(
            'Could not parse item exposed object{}. Item is: ',
            exposedEntity,
          );
        }
      },
      {},
    );
  }
}

export function getRemotesConfig(
  remotes: moduleFederationPlugin.Remotes,
): RemotesObject {
  if (Array.isArray(remotes)) {
    return remotes.reduce<RemotesObject>(
      (remoteModules, remoteEntity): RemotesObject => {
        if (typeof remoteEntity === 'string') {
          return {
            ...remoteModules,
            [remoteEntity]: {
              external: remoteEntity,
            },
          };
        } else if (typeof remoteEntity === 'object') {
          return {
            ...remoteModules,
            ...getRemotesConfig(remoteEntity),
          };
        } else {
          throw Error(
            'Could not parse item shared object[]. Item is: ',
            remoteEntity,
          );
        }
      },
      {},
    );
  } else {
    return Object.entries(remotes).reduce<RemotesObject>(
      (remoteModules, [key, remoteEntity]): RemotesObject => {
        if (typeof remoteEntity === 'string') {
          return {
            ...remoteModules,
            [key]: {
              external: remoteEntity,
            },
          };
        } else if (Array.isArray(remoteEntity)) {
          throw Error(
            'Specifying an array as an entrypoint for exposed modules is not supported yet',
          );
        } else if (typeof remoteEntity === 'object') {
          return {
            ...remoteModules,
            [key]: remoteEntity,
          };
        } else {
          throw Error(
            'Could not parse item exposed object{}. Item is: ',
            remoteEntity,
          );
        }
      },
      {},
    );
  }
}

/**
 * Get the resolved version for the module.
 * @param {string} moduleNameOrPath The module name for which a version required.
 * @returns
 */
export function getRequiredVersionForModule(
  federatedModuleInfo: Record<string, FederatedModuleInfo>,
  moduleNameOrPath: string,
) {
  return (
    (
      Object.values(federatedModuleInfo).find(
        (moduleInfo) => moduleInfo.moduleNameOrPath === moduleNameOrPath,
      ) as SharedOrExposedModuleInfo
    ).versionInfo.requiredVersion ?? false
  );
}

export function getInitConfig(
  name: string | undefined,
  shared: SharedObject,
  remotes: RemotesObject,
  federatedModuleInfo: Record<string, FederatedModuleInfo>,
  remoteType: string,
): UserOptions {
  return {
    name: name ?? DEFAULT_CONTAINER_NAME,
    shared: Object.entries(shared).reduce(
      (sharedConfig, [pkgName, sharedConfigForPkg]) => {
        const sharedOptionForPkg = {
          version:
            sharedConfigForPkg?.version ??
            getVersionForModule(
              federatedModuleInfo,
              sharedConfigForPkg.import ? sharedConfigForPkg.import : pkgName,
            ),
          shareConfig: {
            singleton: sharedConfigForPkg.singleton,
            requiredVersion: getRequiredVersionForModule(
              federatedModuleInfo,
              sharedConfigForPkg.import ? sharedConfigForPkg.import : pkgName,
            ),
            eager: sharedConfigForPkg.eager,
          },
          scope: sharedConfigForPkg.shareScope,
          // We just add a fake function that won't be used so that typescript is satisfied.
          // We either need lib() or get() and we can't provide get()
          lib: () => null,
          /**
           * If its a package for which the user has specified import: false, then we load whatever version is given to us from the shared scope.
           */
          strategy: sharedConfigForPkg.import
            ? 'version-first'
            : 'loaded-first',
        };
        return {
          ...sharedConfig,
          // The key here is the module name or path to the imported module.
          [sharedConfigForPkg.import ? sharedConfigForPkg.import : pkgName]:
            sharedOptionForPkg,
        };
      },
      {},
    ),
    plugins: [],
    remotes: Object.entries(remotes).map(([remoteName, remoteConfig]) => {
      return {
        name: remoteName,
        // TODO: Remove this type coercion once we get an answer from module federation team.
        entry: remoteConfig.external as string,
        shareScope: remoteConfig.shareScope,
        type:
          remoteType === 'module' || remoteType === 'import'
            ? 'esm'
            : remoteType === 'system'
            ? 'system'
            : 'global',
      };
    }),
  };
}

import { dirname, sep } from 'node:path';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { PACKAGE_JSON } from './constants.js';
import {
  generateExposeFilename,
  generateShareFilename,
} from '@module-federation/sdk';
import type { UserOptions } from '@module-federation/runtime/dist/type.cjs.js';

import type { PackageJson } from 'type-fest';
import type { Exposes, Remotes, Shared } from '../types';
import type {
  SharedObject,
  ExposesObject,
  RemotesObject,
  ShareInfo,
} from './types';

export function getModulePathFromResolvedId(id: string): string {
  return id.split('?')[0];
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
    throw Error(`Invalid module name provided: ${sanitizeModuleName}`);
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
  return `.${sep}${chunkName}.js`;
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

export function getSharedConfig(shared: Shared): SharedObject {
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

export function getExposesConfig(exposes: Exposes): ExposesObject {
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

export function getRemotesConfig(remotes: Remotes): RemotesObject {
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

export function getInitConfig(
  name: string,
  shared: SharedObject,
  remotes: RemotesObject,
): UserOptions {
  return {
    name,
    shared: Object.entries(shared).reduce<ShareInfo>(
      (sharedConfig, [pkgName, sharedConfigForPkg]): ShareInfo => {
        const sharedOptionForPkg = {
          version: sharedConfigForPkg.version as string,
          shareConfig: {
            singleton: sharedConfigForPkg.singleton,
            requiredVersion: sharedConfigForPkg?.requiredVersion ?? false,
            eager: sharedConfigForPkg.eager,
          },
          scope: sharedConfigForPkg.shareScope,
          // We just add a fake function that won't be used so that typescript is satisfied.
          // We either need lib() or get() and we can't provide get()
          lib: () => null,
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
    /**
     * TODO: Find a type definition of how plugins can be injected during build time.
     */
    plugins: [],
    remotes: Object.entries(remotes).map(([remoteName, remoteConfig]) => {
      return {
        name: remoteName,
        entry: remoteConfig.external,
        shareScope: remoteConfig.shareScope,
      };
    }),
  };
}

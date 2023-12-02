import { dirname, sep } from 'node:path';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { PACKAGE_JSON } from './constants.js';

import type { PackageJson } from 'type-fest';
import type { Exposes, Remotes, Shared } from '../types';
import type { SharedObject, ExposesObject, RemotesObject } from './types';

export function getModulePathFromResolvedId(id: string): string {
  return id.split('?')[0];
}

export function sanitizeModuleName(name: string): string {
  return name.replace(/\.|\//g, '_');
}

export function getChunkNameForModule({
  sanitizedModuleNameOrPath,
  type,
}: {
  sanitizedModuleNameOrPath: string | null;
  type: 'shared' | 'exposed' | 'remote';
}) {
  return `__federated__${type}__${sanitizedModuleNameOrPath}`;
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
            [key]: sharedEntity,
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

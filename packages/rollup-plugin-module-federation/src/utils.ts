import { dirname, sep } from 'node:path';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { PACKAGE_JSON } from './constants.js';

import type { PackageJson } from 'type-fest';
import type { Shared } from '../types';
import type { SharedObject } from './types';

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
  sanitizedModuleNameOrPath: string;
  type: 'shared' | 'exposed';
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
            ...(sharedEntity as SharedObject),
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

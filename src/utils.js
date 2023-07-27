import { dirname, sep } from 'node:path';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { PACKAGE_JSON } from './constants.js';

export function getModulePathFromResolvedId(id) {
    return id.split('?')[0];
}

export function sanitizeModuleName(name) {
    return name.replace(/\.|\//g, '_');
}

export function getChunkNameForModule({ sanitizedModuleNameOrPath, type }) {
    return `__federated__${type}__${sanitizedModuleNameOrPath}`;
}

export function getFileNameFromChunkName(chunkName) {
    return `.${sep}${chunkName}.js`;
}

export function getNearestPackageJson(path) {
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
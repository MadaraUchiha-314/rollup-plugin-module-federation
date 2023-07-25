import { dirname } from 'node:path';
import { existsSync, readFileSync, lstatSync } from 'node:fs';

export function getModulePathFromResolvedId(id) {
    return id.split('?')[0];
}

export function sanitizeModuleName(name) {
    return name.replace(/\.|\//g, '_');
}

export function getChunkNameForModule({ sanitizedModuleName, type }) {
    return `__federated__${type}__${sanitizedModuleName}`;
}

export function getNearestPackageJson(path) {
    const dir = lstatSync(path).isFile() ? dirname(path) : path;
    const pkgJsonPath = `${dir}/package.json`;
    if (existsSync(pkgJsonPath)) {
        return readFileSync(pkgJsonPath, 'utf-8');
    }
    const parentDir = dirname(dir);
    if (parentDir === dir) {
        return null;
    }
    return getNearestPackageJson(parentDir);
}
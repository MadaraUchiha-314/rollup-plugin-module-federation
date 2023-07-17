export function getModulePathFromResolvedId(id) {
    return id.split('?')[0];
}

export function sanitizeModuleName(name) {
    return name.replace(/\.|\//g, '_');
}

export function getChunkNameForModule({ name, type }) {
    return `__federated__${type}__${name}`;
}
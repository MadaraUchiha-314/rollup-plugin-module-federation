export function __federatedImport__(moduleName) {
    if (Object.prototype.hasOwnProperty.call(moduleMap, moduleName)) {
        return import(moduleMap[moduleName].chunkPath);
    }
    throw Error(`${moduleName} not available in shared scope.`);
}
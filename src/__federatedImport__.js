export function __federatedImport__(moduleName) {
    if (Object.prototype.hasOwnProperty.call(moduleMap, moduleName)) {
        /**
         * TODO: Check in the shared scope if a satisfying version already exists.
         */
        return import(moduleMap[moduleName].chunkPath);
    }
    throw Error(`${moduleName} not available in shared scope.`);
}
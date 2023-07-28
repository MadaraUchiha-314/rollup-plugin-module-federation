import maxSatisfying from "semver/ranges/max-satisfying";

let sharedScope = null;

export function setSharedScope(inheritedSharedScope) {
    sharedScope = inheritedSharedScope;
}

export async function __federatedImport__(moduleName) {
    if (Object.prototype.hasOwnProperty.call(moduleMap, moduleName)) {
        const availableVersions = Object.keys(sharedScope?.[moduleName] ?? {});
        const { requiredVersion } = moduleMap[moduleName];
        if (requiredVersion) {
            const maxSatisfyingVersion = maxSatisfying(availableVersions, requiredVersion);
            if (maxSatisfyingVersion) {
                const module = (await sharedScope[moduleName][maxSatisfyingVersion].get())();
                return module;
            }
        }
        return import(moduleMap[moduleName].chunkPath);
    }
    throw Error(`${moduleName} not available in shared scope.`);
}
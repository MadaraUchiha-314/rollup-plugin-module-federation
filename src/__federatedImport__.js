import maxSatisfying from "semver/ranges/max-satisfying";

let sharedScope = null;

export function setSharedScope(inheritedSharedScope) {
    sharedScope = inheritedSharedScope;
}

export async function __federatedImport__(modulePath) {
    if (Object.prototype.hasOwnProperty.call(moduleMap, modulePath)) {
        const moduleName = moduleMap[modulePath].moduleNameOrPath;
        const availableVersions = Object.keys(sharedScope?.[moduleName] ?? {});
        const { requiredVersion } = moduleMap[modulePath];
        if (requiredVersion) {
            const maxSatisfyingVersion = maxSatisfying(availableVersions, requiredVersion);
            if (maxSatisfyingVersion) {
                const factory = await sharedScope[moduleName][maxSatisfyingVersion].get();
                const module = factory();
                return module;
            }
        }
        if (moduleMap[modulePath].type === 'exposed') {
            return import(modulePath);
        }
    }
    throw Error(`${modulePath} not available in shared scope.`);
}
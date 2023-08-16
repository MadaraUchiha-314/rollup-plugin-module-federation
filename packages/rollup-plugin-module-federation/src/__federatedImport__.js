import maxSatisfying from 'semver/ranges/max-satisfying';

let sharedScope = null;

export function setSharedScope(inheritedSharedScope) {
  sharedScope = inheritedSharedScope;
}

export async function __federatedImport__(modulePath) {
  /* eslint-disable-next-line no-undef */
  if (Object.prototype.hasOwnProperty.call(moduleMap, modulePath)) {
    /* eslint-disable-next-line no-undef */
    const moduleName = moduleMap[modulePath].moduleNameOrPath;
    const availableVersions = Object.keys(sharedScope?.[moduleName] ?? {});
    const availableLoadedVersions = Object.entries(
      sharedScope?.[moduleName] ?? {},
    )
      .filter(([, { loaded }]) => loaded)
      .map(([version]) => version);
    /* eslint-disable-next-line no-undef */
    const { requiredVersion } = moduleMap[modulePath];
    if (requiredVersion) {
      /**
       * Give priority to loaded versions.
       */
      const maxSatisfyingVersion = maxSatisfying(availableLoadedVersions, requiredVersion)
        || maxSatisfying(availableVersions, requiredVersion);
      if (maxSatisfyingVersion) {
        const factory = await sharedScope[moduleName][
          maxSatisfyingVersion
        ].get();
        const module = factory();
        sharedScope[moduleName][maxSatisfyingVersion].loaded = true;
        return module;
      }
    }
    /* eslint-disable-next-line no-undef */
    if (moduleMap[modulePath].type === 'exposed') {
      return import(modulePath);
    }
  }
  throw Error(`${modulePath} not available in shared scope.`);
}

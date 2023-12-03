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

async function loadRemoteModule(remoteUrl, remoteType = 'module') {
  if (remoteType === 'module' || remoteType === 'import') {
    /**
     * TODO: Look at what the convention is for specifying remote urls.
     * What does the @ in a lot of these examples mean ?
     */
    const url = remoteUrl.split('@')?.[1] ?? remoteUrl;
    if (!url) {
      throw Error(
        `Incorrect format of remote module url ${remoteUrl}`,
      );
    }
    const module = await import(url);
    return module;
  }
  /**
   * TODO: Add support for more remote types.
   */
  throw Error(
    `Loading module from a remote type ${remoteType} is not supported.`,
  );
}

function unwrapDefaultImporFromModule(module) {
  return module?.__esModule || module?.[Symbol.toStringTag] === 'Module'
    ? module.default
    : module;
}

/**
 * Get a module from a remote container.
 * @param {string} modulePath The module that the user is importing from the remote container
 * @param {boolean} unwrapDefaultImport Whether to unwrap the default import out of the exposed module
 */
export async function __federatedImportFromRemote__(
  modulePath,
  unwrapDefaultImport = false,
) {
  /**
   * First figure out which remote container the import is referencing.
   */
  /* eslint-disable-next-line no-undef */
  const remoteModules = Object.values(moduleMap).filter(
    ({ type }) => type === 'remote',
  );
  const remoteModuleInfo = remoteModules.find((remoteModule) => modulePath.startsWith(`${remoteModule.name}/`));
  if (!remoteModuleInfo) {
    throw Error(
      `No remote containers registered satisfy import of ${modulePath}`,
    );
  }
  let remoteContainer = null;

  if (!remoteModuleInfo.module) {
    remoteModuleInfo.module = await loadRemoteModule(remoteModuleInfo.moduleNameOrPath, remoteModuleInfo.remoteType);
  }
  remoteContainer = remoteModuleInfo.module;
  if (!remoteModuleInfo.initialized) {
    await remoteContainer.init(sharedScope);
    remoteModuleInfo.initialized = true;
  }
  const exposedModuleName = `./${modulePath.slice(
    remoteModuleInfo.name.length + 1,
  )}`;
  const exposedModule = (await remoteContainer.get(exposedModuleName))();

  return unwrapDefaultImport
    ? unwrapDefaultImporFromModule(exposedModule)
    : exposedModule;
}

import { readFileSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EOL } from 'node:os';

import { asyncWalk } from 'estree-walker';
import MagicString from 'magic-string';

import {
  getModulePathFromResolvedId,
  sanitizeModuleName,
  getChunkNameForModule,
  getNearestPackageJson,
  getFileNameFromChunkName,
} from './utils.js';
import { PACKAGE_JSON } from './constants.js';

const IMPORTS_TO_FEDERATED_IMPORTS_NODES = {
  ImportDeclaration: 'ImportDeclaration',
  ImportExpression: 'ImportExpression',
  ExportNamedDeclaration: 'ExportNamedDeclaration',
  // ExportAllDeclaration: 'ExportAllDeclaration',
};

const REMOTE_ENTRY_MODULE_ID = '__remoteEntry__';
const REMOTE_ENTRY_FILE_NAME = `${REMOTE_ENTRY_MODULE_ID}.js`;
const REMOTE_ENTRY_NAME = 'remoteEntry';

/**
 * All imports to shared/exposed/remotes will get converted to this expression.
 */
const FEDERATED_IMPORT_EXPR = '__federatedImport__';
const FEDERATED_IMPORT_MODULE_ID = '__federatedImport__';
const FEDERATED_IMPORT_FILE_NAME = `${FEDERATED_IMPORT_MODULE_ID}.js`;
const FEDERATED_IMPORT_NAME = 'federatedImport';
const FEDERATED_EAGER_SHARED = '__federated__shared__eager__';

const MODULE_VERSION_UNSPECIFIED = '0.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getFederatedImportStatementForNode(node, moduleSpecifier) {
  const federatedImportStms = [];
  /**
   * TODO: What all types of nodes need to handled here ?
   * ImportDeclaration spec: https://tc39.es/ecma262/#prod-ImportDeclaration
   * ES2015 Module spec: https://github.com/estree/estree/blob/master/es2015.md#modules
   */
  switch (node.type) {
    case IMPORTS_TO_FEDERATED_IMPORTS_NODES.ImportDeclaration: {
      node.specifiers.forEach((specifier) => {
        switch (specifier.type) {
          case 'ImportDefaultSpecifier': {
            /**
             * import ABC from 'pqr';
             */
            federatedImportStms.push(
              `const ${specifier.local.name} = await ${moduleSpecifier}`,
            );
            break;
          }
          case 'ImportNamespaceSpecifier': {
            /**
             * import * as ABC from 'pqr';
             */
            federatedImportStms.push(
              `const ${specifier.local.name} = await ${moduleSpecifier}`,
            );
            break;
          }
          case 'ImportSpecifier': {
            if (specifier.imported.name !== specifier.local.name) {
              /**
               * import { ABC as XYZ } from 'pqr';
               */
              federatedImportStms.push(
                `const { ${specifier.imported.name}: ${specifier.local.name} } = await ${moduleSpecifier}`,
              );
            } else {
              /**
               * import { ABC } from 'pqr';
               */
              federatedImportStms.push(
                `const { ${specifier.local.name} } = await ${moduleSpecifier}`,
              );
            }
            break;
          }
          default:
            throw Error(
              `Unhandled ImportDeclaration specifiers. ${JSON.stringify(
                specifier,
              )}`,
            );
        }
      });
      break;
    }
    case IMPORTS_TO_FEDERATED_IMPORTS_NODES.ImportExpression: {
      /**
       * import('pqr')
       */
      federatedImportStms.push(moduleSpecifier);
      break;
    }
    case IMPORTS_TO_FEDERATED_IMPORTS_NODES.ExportNamedDeclaration: {
      node.specifiers.forEach((specifier) => {
        switch (specifier.type) {
          case 'ExportSpecifier': {
            if (specifier.exported.name !== specifier.local.name) {
              /**
               * export { ABC as XYZ } from 'pqr';
               */
              federatedImportStms.push(
                `const { ${specifier.local.name} } = await ${moduleSpecifier}; export { ${specifier.local.name} as ${specifier.exported.name} }`,
              );
            } else {
              /**
               * export { ABC } from 'pqr';
               */
              federatedImportStms.push(
                `const { ${specifier.local.name} } = await ${moduleSpecifier}; export { ${specifier.local.name} }`,
              );
            }
            break;
          }
          default: {
            throw Error(`Unsupported specifier.type: ${specifier.type}`);
          }
        }
      });
      break;
    }
    default: {
      break;
    }
  }
  const federatedImportStmsStr = federatedImportStms.join(';');
  return federatedImportStmsStr;
}

export default function federation(federationConfig) {
  const {
    name, filename, exposes, shared,
  } = federationConfig;

  const projectRoot = resolve();
  const pkgJson = JSON.parse(
    readFileSync(`${projectRoot}${sep}${PACKAGE_JSON}`, 'utf-8'),
  );
  /**
   * Created a mapping between resolvedId.id of the module to the module name (shared, exposed)
   */
  const sharedOrExposedModuleInfo = {};
  /**
   * Module Map cache
   */
  let moduleMap = null;

  /**
   * Get the version of module.
   * Module version if not specified in the federation config needs to be taken from the package.json
   * @param {string} moduleNameOrPath The module name for which a version required.
   */
  const getVersionInfoForModule = (moduleNameOrPath, resolvedModulePath) => {
    /**
     * Check if module is shared.
     */
    const versionInfo = {
      version: null,
      requiredVersion: null,
      strictVersion: null,
      singleton: null,
    };
    const nearestPkgJson = getNearestPackageJson(resolvedModulePath);
    const resolvedModuleVersionInPkgJson = nearestPkgJson?.version ?? MODULE_VERSION_UNSPECIFIED;
    if (Object.prototype.hasOwnProperty.call(shared, moduleNameOrPath)) {
      const versionInLocalPkgJson = pkgJson?.dependencies?.[moduleNameOrPath];
      return {
        ...versionInfo,
        version: resolvedModuleVersionInPkgJson,
        requiredVersion: versionInLocalPkgJson,
        ...shared[moduleNameOrPath],
      };
    }
    return versionInfo;
  };

  /**
   * Get the resolved version for the module.
   * @param {string} moduleNameOrPath The module name for which a version required.
   * @returns
   */
  const getVersionForModule = (moduleNameOrPath) => Object.values(sharedOrExposedModuleInfo).find(
    (moduleInfo) => moduleInfo.moduleNameOrPath === moduleNameOrPath,
  )?.versionInfo?.version ?? null;

  /**
   * Get the module map
   */
  const getModuleMap = () => Object.values(sharedOrExposedModuleInfo).reduce(
    (currentModuleMap, moduleInfo) => {
      const {
        chunkPath,
        name: moduleName,
        moduleNameOrPath,
        type,
        versionInfo,
      } = moduleInfo;
      const {
        version, requiredVersion, singleton, strictVersion,
      } = versionInfo;
      return {
        ...currentModuleMap,
        [chunkPath]: {
          name: moduleName,
          moduleNameOrPath,
          chunkPath,
          type,
          version,
          requiredVersion,
          singleton,
          strictVersion,
        },
      };
    },
    {},
  );

  return {
    name: 'rollup-plugin-federation',
    async buildStart() {
      /**
       * For each shared and exposed module we store the resolved paths for those modules.
       */
      const federatedModules = [];
      /**
       * Shared modules.
       * Its important to give priority to shared modules over exposed modules due to how versions are resolved.
       * Shared modules have versions.
       * Exposed modules don't. The best we can do for exposed modules is the version of the package which is exposing these modules.
       * If a module is both shared and exposed, we treat it as shared.
       */
      federatedModules.push(
        ...Object.entries(shared).map(
          ([sharedModuleName, sharedModuleHints]) => ({
            name: sharedModuleName,
            moduleNameOrPath: sharedModuleHints?.import
              ? sharedModuleHints.import
              : sharedModuleName,
            type: 'shared',
          }),
        ),
      );
      /**
       * Exposed modules.
       */
      federatedModules.push(
        ...Object.entries(exposes).map(
          ([exposedModuleName, exposedModulePath]) => ({
            name: exposedModuleName,
            moduleNameOrPath: exposedModulePath,
            type: 'exposed',
          }),
        ),
      );
      /* eslint-disable-next-line no-restricted-syntax */
      for (const {
        name: moduleName,
        moduleNameOrPath,
        type,
      } of federatedModules) {
        /**
         * Rollup might use its own or other registered resolvers (like @rollup/plugin-node-resolve) to resolve this.
         */
        /* eslint-disable-next-line no-await-in-loop */
        const resolvedId = await this.resolve(moduleNameOrPath);
        const resolvedModulePath = getModulePathFromResolvedId(resolvedId.id);
        /**
         * Use sanitized module name/path everywhere.
         */
        const sanitizedModuleNameOrPath = sanitizeModuleName(moduleNameOrPath);
        const chunkName = getChunkNameForModule({
          sanitizedModuleNameOrPath,
          type,
        });
        const versionInfo = getVersionInfoForModule(
          moduleNameOrPath,
          resolvedModulePath,
        );
        if (
          !Object.prototype.hasOwnProperty.call(
            sharedOrExposedModuleInfo,
            resolvedModulePath,
          )
        ) {
          sharedOrExposedModuleInfo[resolvedModulePath] = {
            name: moduleName,
            moduleNameOrPath,
            sanitizedModuleNameOrPath,
            type,
            chunkPath: getFileNameFromChunkName(chunkName),
            versionInfo,
          };
        }
      }
      /**
       * Save the current state of the the module map.
       */
      moduleMap = getModuleMap();
      /**
       * Emit a file corresponding to the implementation of the __federatedImport__()
       */
      this.emitFile({
        type: 'chunk',
        id: FEDERATED_IMPORT_MODULE_ID,
        name: FEDERATED_IMPORT_NAME,
        fileName: FEDERATED_IMPORT_FILE_NAME,
        importer: null,
      });
      /**
       * Emit a file corresponding to the remote container.
       * This plugin will itself resolve this file in resolveId() and provide the implementation of the file in load()
       */
      this.emitFile({
        type: 'chunk',
        id: REMOTE_ENTRY_MODULE_ID,
        name: name ?? REMOTE_ENTRY_NAME,
        fileName: filename ?? REMOTE_ENTRY_FILE_NAME,
        importer: null,
      });
    },
    resolveId(source) {
      /**
       * Resolve the virtual file for the remote entry manually.
       * Rest of the files are resolved natively by the default resolvers/
       */
      if (source === REMOTE_ENTRY_MODULE_ID) {
        return REMOTE_ENTRY_MODULE_ID;
      }
      if (source === FEDERATED_IMPORT_MODULE_ID) {
        return FEDERATED_IMPORT_MODULE_ID;
      }
      return null;
    },
    load(id) {
      /**
       * Provide the code for the remote entry.
       */
      if (id === REMOTE_ENTRY_MODULE_ID) {
        /**
         * The basic idea is to provide two functions init() and get() which are compliant with the module federation spec.
         * We create this remote entry manually.
         * init(): Populate the shared scope object.
         * get(): Resolve the module which is requested.
         */
        const remoteEntryCode = `
          /**
           * Import from the virtual module FEDERATED_IMPORT_MODULE_ID
           */
          import { setSharedScope } from '${FEDERATED_IMPORT_MODULE_ID}';
          ${Object.entries(shared)
    .filter(([, sharedModule]) => sharedModule?.eager ?? false)
    .map(([key, sharedModule]) => {
      const importedModule = sharedModule.import ?? key;
      /**
               * For shared modules that are eager we use: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import#module_namespace_object
               */
      return `import * as ${FEDERATED_EAGER_SHARED}${importedModule} from '${importedModule}';`;
    })
    .join('')}
          function register(sharedScope, moduleNameOrPath, version, fallback) {
            if (!Object.prototype.hasOwnProperty.call(sharedScope, moduleNameOrPath)) {
                sharedScope[moduleNameOrPath] = {};
            }
            if (!Object.prototype.hasOwnProperty.call(sharedScope[moduleNameOrPath], version)) {
                sharedScope[moduleNameOrPath][version] = {
                    get: fallback,
                    loaded: false,
                }
            }
            return sharedScope[moduleNameOrPath][version];
          }
          const init = (sharedScope) => {
            setSharedScope(sharedScope);
            ${Object.entries(shared)
    .map(([key, sharedModule]) => {
      const { shareKey } = sharedModule;
      const importedModule = sharedModule.import ?? key;
      const versionForSharedModule = getVersionForModule(importedModule);
      if (importedModule) {
        if (sharedModule?.eager) {
          return `
          register(sharedScope, '${
  shareKey ?? key
}', '${versionForSharedModule}', () => Promise.resolve(${FEDERATED_EAGER_SHARED}${importedModule}).then((module) => () => module))
        `;
        }
        return `
          register(sharedScope, '${
  shareKey ?? key
}', '${versionForSharedModule}', () => import('${importedModule}').then((module) => () => module))
        `;
      }
      return '';
    })
    .join('')}
          };
          const get = (module) => {
            switch(module) {
              ${Object.entries(exposes)
    .map(
      ([key, exposedModule]) => `
                    case '${key}': {
                      return import('${exposedModule}');
                    }
                  `,
    )
    .join('')}
            }
          };
          export { init, get };
        `;
        return remoteEntryCode;
      }
      if (id === FEDERATED_IMPORT_MODULE_ID) {
        const __federatedImport__ = readFileSync(
          resolve(__dirname, `./${FEDERATED_IMPORT_FILE_NAME}`),
          'utf8',
        );
        return `
          export const moduleMap = ${JSON.stringify(moduleMap, null, 2)};
          ${__federatedImport__}
        `;
      }
      return null;
    },
    transform: {
      /**
       * Its important to keep the order as post, otherwise there might other transformed code that we will have to handle.
       * When we mark it as post, we let other plugins handle it.
       */
      order: 'post',
      async handler(code, id) {
        const ast = this.parse(code);
        const magicString = new MagicString(code);
        /**
         * We don't want to rewrite the imports for the remote entry as well as the implementation of the federated import expression
         */
        if (
          id === FEDERATED_IMPORT_MODULE_ID
          || id === REMOTE_ENTRY_MODULE_ID
        ) {
          return null;
        }
        const self = this;
        let chunkHasFederatedImports = false;
        await asyncWalk(ast, {
          async enter(node) {
            /**
             * TODO: What about eager ? Don't know. TBD.
             */
            if (
              Object.keys(IMPORTS_TO_FEDERATED_IMPORTS_NODES).includes(
                node.type,
              )
              && node?.source?.value
            ) {
              /**
               * At this point rollup hasn't completed resolution of the import statements in this file.
               * Imports might still be relative to the current file.
               * Its crucial to call the this.resolve() with the importer (2nd arg) to actually resolve the import.
               */
              const resolvedId = await self.resolve(node.source.value, id);
              const resolvedModulePath = getModulePathFromResolvedId(
                resolvedId.id,
              );
              if (
                Object.prototype.hasOwnProperty.call(
                  sharedOrExposedModuleInfo,
                  resolvedModulePath,
                )
              ) {
                chunkHasFederatedImports = true;
                const chunkName = sharedOrExposedModuleInfo[resolvedModulePath].chunkPath;
                const moduleSpecifier = `${FEDERATED_IMPORT_EXPR}('${chunkName}')`;
                const federatedImportStmsStr = getFederatedImportStatementForNode(node, moduleSpecifier);
                magicString.overwrite(
                  node.start,
                  node.end,
                  federatedImportStmsStr,
                );
              }
            }
          },
        });
        /**
         * The top level import of FEDERATED_IMPORT_EXPR
         */
        if (chunkHasFederatedImports) {
          magicString.prepend(`
            /**
             * Import from the virtual module FEDERATED_IMPORT_MODULE_ID
             */
            import { ${FEDERATED_IMPORT_EXPR} } from '${FEDERATED_IMPORT_MODULE_ID}';${EOL}
          `);
        }
        return {
          code: magicString.toString(),
        };
      },
    },
    outputOptions(outputOptions) {
      /**
       * Need to create a mapping b/w shared modules and their chunks.
       * Unfortunately any of the hooks provided by rollup doesn't seem to have the information.
       * The best bet we have is generate bundle, but even there an import('react') gets converted into { name: 'index', chunk: 'index-kjn234kj.js' }
       * So we create a manual chunk function and provide it to the output options.
       * TODO: If the user has already registered a manualChunks function in their rollup config, we need to honor that.
       */
      const manualChunks = (id) => {
        /**
         * This is currently a hack so that rollup doesn't generate shared chunks between the exposed module and the FEDERATED_IMPORT_MODULE_ID.
         * TODO: Find a better way to force rollup to do this.
         */
        if (id === FEDERATED_IMPORT_MODULE_ID) {
          return FEDERATED_IMPORT_MODULE_ID;
        }
        if (id === REMOTE_ENTRY_MODULE_ID) {
          return REMOTE_ENTRY_MODULE_ID;
        }
        const resolvedModulePath = getModulePathFromResolvedId(id);
        if (
          Object.prototype.hasOwnProperty.call(
            sharedOrExposedModuleInfo,
            resolvedModulePath,
          )
        ) {
          return getChunkNameForModule(
            sharedOrExposedModuleInfo[resolvedModulePath],
          );
        }
        return null;
      };
      return {
        ...outputOptions,
        manualChunks,
        chunkFileNames: '[name].js',
      };
    },
  };
}

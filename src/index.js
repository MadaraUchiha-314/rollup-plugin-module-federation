import { readFileSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EOL } from 'node:os';

import { walk } from 'estree-walker';
import MagicString from 'magic-string';

import { getModulePathFromResolvedId, sanitizeModuleName, getChunkNameForModule, getNearestPackageJson, getFileNameFromChunkName } from './utils.js';
import { PACKAGE_JSON } from './constants.js';

const IMPORTS_TO_FEDERATED_IMPORTS_NODES = {
  'ImportDeclaration': 'ImportDeclaration',
  'ImportExpression': 'ImportExpression'
};

const REMOTE_ENTRY_MODULE_ID = '__remoteEntry__';
const REMOTE_ENTRY_FILE_NAME = 'remoteEntry.js';
const REMOTE_ENTRY_NAME = 'remoteEntry';

/** 
 * All imports to shared/exposed/remotes will get converted to this expression. 
 */
const FEDERATED_IMPORT_EXPR = '__federatedImport__'; 
const FEDERATED_IMPORT_FILE_NAME = '__federatedImport__.js';
const FEDERATED_IMPORT_MODULE_ID = '__federatedImport__';
const FEDERATED_IMPORT_NAME = 'federatedImport';

const MODULE_VERSION_UNSPECIFIED = '0.0.0';

const ENTER_CONTAINER_INIT_MARKER = '__enter__container__init__';
const EXIT_CONTAINER_INIT_MARKER = '__exit__container__init__';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function federation(federationConfig) {
  const {
    name,
    filename,
    exposes,
    shared,
  } = federationConfig;

  const projectRoot = resolve();
  const pkgJson = JSON.parse(readFileSync(`${projectRoot}${sep}${PACKAGE_JSON}`, 'utf-8'));
  /**
   * Created a mapping between resolvedId.id of the module to the module name (shared, exposed)
   */
  const sharedOrExposedModuleInfo = {};
  /**
   * Module Map cache
   */
  let moduleMap = null;
  
  /**
   * Get the version of module. Module version if not specified in the federation config needs to be taken from the package.json
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
  const getVersionForModule = (moduleNameOrPath) => {
    return Object.values(sharedOrExposedModuleInfo).find((moduleInfo) => moduleInfo.moduleNameOrPath === moduleNameOrPath)?.versionInfo?.version ?? null;
  };

  /**
   * Get the module map
   */
  const getModuleMap = () => {
    return Object.values(sharedOrExposedModuleInfo).reduce((moduleMap, sharedOrExposedModuleInfo) => {
      const { chunkPath, name, moduleNameOrPath, type, versionInfo } = sharedOrExposedModuleInfo;
      const { version, requiredVersion, singleton, strictVersion } = versionInfo;
      return {
        ...moduleMap,
        [chunkPath]: {
          name, 
          moduleNameOrPath,
          chunkPath,
          type,
          version,
          requiredVersion,
          singleton,
          strictVersion,
        },
      }
    }, {});
  };
  
  return {
    name: 'rollup-plugin-federation',
    options(options) {},
    async buildStart(options) {
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
      federatedModules.push(...Object.entries(shared).map(([sharedModuleName, sharedModuleHints]) => ({
        name: sharedModuleName,
        moduleNameOrPath: sharedModuleHints?.import ? sharedModuleHints.import: sharedModuleName,
        type: 'shared',
      })));
      /**
       * Exposed modules.
       */
      federatedModules.push(...Object.entries(exposes).map(([exposedModuleName, exposedModulePath]) => ({
        name: exposedModuleName,
        moduleNameOrPath: exposedModulePath,
        type: 'exposed',
      })));
      for (const { name, moduleNameOrPath, type } of federatedModules) {
        /**
         * Rollup might use its own or other registered resolvers (like @rollup/plugin-node-resolve) to resolve this.
         */
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
        const versionInfo = getVersionInfoForModule(moduleNameOrPath, resolvedModulePath);
        if (!Object.prototype.hasOwnProperty.call(sharedOrExposedModuleInfo, resolvedModulePath)) {
          sharedOrExposedModuleInfo[resolvedModulePath] = {
            name,
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
    resolveId(source, importer, options) {
      /**
       * Resolve the virtual file for the remote entry manually.
       * Rest of the files are resolved natively by the default resolvers/
       */
      if (source === REMOTE_ENTRY_MODULE_ID) {
        return REMOTE_ENTRY_MODULE_ID;
      } else if (source === FEDERATED_IMPORT_MODULE_ID) {
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
          function register(sharedScope, moduleNameOrPath, version, fallback) {
            if (!Object.prototype.hasOwnProperty.call(sharedScope, moduleNameOrPath)) {
                sharedScope[moduleNameOrPath] = {};
            }
            if (!Object.prototype.hasOwnProperty.call(sharedScope[moduleNameOrPath], version)) {
                sharedScope[moduleNameOrPath][version] = {
                    get: fallback,
                }
            }
            return sharedScope[moduleNameOrPath][version];
          }
          const init = (sharedScope) => {
            ${ENTER_CONTAINER_INIT_MARKER};
            setSharedScope(sharedScope);
            ${
              Object.entries(shared).map(([key, sharedModule]) => {
                /**
                 * TODO: Get the default values of these from the nearest package.json
                 */
                const { 
                  shareKey,
                } = sharedModule;
                /**
                 * Handle import false.
                 */
                const importedModule = sharedModule.import ?? key;
                const versionForSharedModule = getVersionForModule(importedModule); 
                /**
                 * TODO: Add versioning information.
                 */
                return importedModule ? `
                  register(sharedScope, '${shareKey ?? key}', '${versionForSharedModule}', () => import('${importedModule}').then((module) => () => module))
                `: '';
              }).join('')
            }
            ${EXIT_CONTAINER_INIT_MARKER};
          };
          const get = (module) => {
            switch(module) {
              ${
                Object.entries(exposes).map(([key, exposedModule]) => {
                  return `
                    case '${key}': {
                      return import('${exposedModule}');
                    }
                  `;
                }).join('')
              }
            }
          };
          export { init, get };
        `;
        return remoteEntryCode;
      } else if (id === FEDERATED_IMPORT_MODULE_ID) {
        const __federatedImport__ = readFileSync(resolve(__dirname, `./${FEDERATED_IMPORT_FILE_NAME}`), 'utf8');
        return `
          export const moduleMap = ${JSON.stringify(moduleMap, null, 2)};
          ${__federatedImport__}
        `;
      }
      return null;
    },
    transform(code, id) {
      const ast = this.parse(code);
      const magicString = new MagicString(code);
      walk(ast, {
        enter(node) {
          /**
           * TODO: What all types of nodes need to handled here ?
           * ImportDeclaration spec: https://tc39.es/ecma262/#prod-ImportDeclaration
           * ES2015 Module spec: https://github.com/estree/estree/blob/master/es2015.md#modules
           */
          /**
           * TODO: Check if we are statically importing any local files that are shared or exposed.
           * We need to generate a separate chunk for those files.
           * We cannot let rollup parse those code and inline them. So we need to take care of those imports here itself.
           * We convert those imorts into dynamic imports.
           * What about eager ? Don't know. TBD.
           */
          if (Object.keys(IMPORTS_TO_FEDERATED_IMPORTS_NODES).includes(node.type)) {
          }
        }
      })
      return {
        code: magicString.toString(),
      }
    },
    outputOptions(outputOptions) {
      /**
       * Need to create a mapping b/w shared modules and their chunks.
       * Unfortunately any of the hooks provided by rollup doesn't seem to have the information.
       * The best bet we have is generate bundle, but even there an import('react') gets converted into { name: 'index', chunk: 'index-kjn234kj.js' }
       * So we create a manual chunk function and provide it to the output options.
       * TODO: If the user has already registered a manualChunks function in their rollup config, we need to honor that.
       */
      const manualChunks = (id, { getModuleInfo, getModuleIds }) => {
        const resolvedModulePath = getModulePathFromResolvedId(id);
        if (Object.prototype.hasOwnProperty.call(sharedOrExposedModuleInfo, resolvedModulePath)) {
          return getChunkNameForModule(sharedOrExposedModuleInfo[resolvedModulePath]);
        }
      };
      return {
        ...outputOptions,
        manualChunks,
        chunkFileNames: '[name].js'
      };
    },
    generateBundle(options, bundle, isWrite) {
      /**
       * In the transform step we have converted every import into an import expression.
       * This ensures that the chunks are built out for this imports.
       * Once the chunks are built out, we transform those imports into __federated__imports__(chunkName, version, requestedVersion, ...);
       */
      Object.entries(bundle).forEach(([fileName, chunkInfo]) => {
        /**
         * We don't want to rewrite the imports of the federated imported module :p :D
         * Kind of defeats the purpose.
         */
        if (chunkInfo?.facadeModuleId === FEDERATED_IMPORT_MODULE_ID) {
          return;
        }
        const ast = this.parse(chunkInfo.code);
        const magicString = new MagicString(chunkInfo.code);
        /**
         * Keep track of whether the chunk has a dynamic import or not.
         * If it has, we need to import the function FEDERATED_IMPORT_EXPR.
         */
        let chunkHasFederatedImports = false;
        /**
         * Keep track of whether we are inside the init function.
         */
        let insideFederatedInit = false;
        walk(ast, {
          enter(node) {
            if (node.type === 'Identifier' && node.name === ENTER_CONTAINER_INIT_MARKER) {
              insideFederatedInit = true;
              magicString.remove(node.start, node.end);
            } else if (node.type === 'Identifier' && node.name === EXIT_CONTAINER_INIT_MARKER) {
              insideFederatedInit = false;
              magicString.remove(node.start, node.end);
            }
            /**
             * ImportDeclaration spec: https://tc39.es/ecma262/#prod-ImportDeclaration
             * ES2015 Module spec: https://github.com/estree/estree/blob/master/es2015.md#modules
             */
            if (!insideFederatedInit && Object.keys(IMPORTS_TO_FEDERATED_IMPORTS_NODES).includes(node.type)) {
              const federatedImportStms = [];
              /**
               * TODO: What all information do we need to pass to this function ??
               */
              const moduleSpecifier = `${FEDERATED_IMPORT_EXPR}('${node.source.value}')`;
              if (!Object.prototype.hasOwnProperty.call(moduleMap, node.source.value)) {
                return;
              }
              chunkHasFederatedImports = true;
              switch(node.type) {
                case IMPORTS_TO_FEDERATED_IMPORTS_NODES.ImportDeclaration: {
                  node.specifiers.map((specifier) => {
                    switch(specifier.type) {
                      case 'ImportDefaultSpecifier': {
                        /**
                         * import ABC from 'pqr';
                         */
                        federatedImportStms.push(
                          `const ${specifier.local.name} = await ${moduleSpecifier}`
                        );
                        break;
                      }
                      case 'ImportNamespaceSpecifier': {
                        /**
                         * import * as ABC from 'pqr';
                         */
                        federatedImportStms.push(
                          `const ${specifier.local.name} = await ${moduleSpecifier}`
                        );
                        break;
                      }
                      case 'ImportSpecifier': {
                        if (specifier.imported.name !== specifier.local.name) {
                          /**
                           * import { ABC as XYZ } from 'pqr';
                           */
                          federatedImportStms.push(
                            `const { ${specifier.imported.name}: ${specifier.local.name} } = await ${moduleSpecifier}`
                          );
                        } else {
                          /**
                           * import { ABC } from 'pqr';
                           */
                          federatedImportStms.push(
                            `const { ${specifier.local.name} } = await ${moduleSpecifier}`
                          );
                        }
                        break;
                      }
                      default:
                        throw Error(`Unhandled ImportDeclaration specifiers. ${JSON.stringify(specifier)}`);
                    }
                  });
                  break;
                }
                case IMPORTS_TO_FEDERATED_IMPORTS_NODES.ImportExpression: {
                  /**
                   * import('pqr')
                   */
                  federatedImportStms.push(
                    moduleSpecifier,
                  );
                  break;
                }
                default: {
                  break;
                }
              } 
              const federatedImportStmsStr = federatedImportStms.join(';');
              magicString.overwrite(node.start, node.end, federatedImportStmsStr);
            }
          }
        });
        if (chunkHasFederatedImports) {
          magicString.prepend(`
            import { ${FEDERATED_IMPORT_EXPR} } from './${FEDERATED_IMPORT_FILE_NAME}';${EOL}
          `);
        }
        if (chunkInfo?.facadeModuleId === REMOTE_ENTRY_MODULE_ID) {
          magicString.prepend(`
            import { setSharedScope } from './${FEDERATED_IMPORT_FILE_NAME}';${EOL}
          `);
        }
        chunkInfo.code = magicString.toString();
      });
    }
  }
}
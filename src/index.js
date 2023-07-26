import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { walk } from 'estree-walker';
import MagicString from 'magic-string';

import { getModulePathFromResolvedId, sanitizeModuleName, getChunkNameForModule, getNearestPackageJson } from './utils.js';

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
  console.log(projectRoot);
  const pkgJson = JSON.parse(readFileSync(`${projectRoot}/package.json`, 'utf-8'));
  /**
   * Created a mapping between resolvedId.id of the module to the module name (shared, exposed)
   */
  const moduleIdToName = {};
  /**
   * Created a mapping between the module name and the emitted chunk name
   */
  const moduleNameToEmittedChunkName = {};

  /**
   * Get the version of module. Module version if not specified in the federation config needs to be taken from the package.json
   * @param {string} moduleName The module name for which a version required.
   */
  const getVersionInfoForModule = (moduleName, modulePath) => {
    /**
     * Check if module is shared.
     */
    const versionInfo = {
      version: null,
      requiredVersion: null,
      strictVersion: null,
      singleton: null,
    };
    const nearestPkgJson = getNearestPackageJson(modulePath);
    const moduleVersionInPkgJson = nearestPkgJson?.dependencies?.[moduleName]?.version ?? MODULE_VERSION_UNSPECIFIED;
    if (Object.prototype.hasOwnProperty.call(shared, moduleName)) {
      const versionInLocalPkgJson = pkgJson?.dependencies?.[moduleName];
      return {
        ...versionInfo,
        version: moduleVersionInPkgJson,
        requiredVersion: versionInLocalPkgJson,
        ...shared[moduleName],
      };
    }
    return versionInfo;
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
       */
      federatedModules.push(...Object.entries(shared).map(([sharedModuleName, sharedModuleHints]) => ({
        name: sharedModuleName,
        specifiedModulePath: sharedModuleHints?.import ? sharedModuleHints.import: sharedModuleName,
        type: 'shared',
      })));
      /**
       * Exposed modules.
       */
      federatedModules.push(...Object.entries(exposes).map(([exposedModuleName, exposedModulePath]) => ({
        name: exposedModuleName,
        specifiedModulePath: exposedModulePath,
        type: 'exposed',
      })));
      for (const { name, specifiedModulePath, type } of federatedModules) {
        const resolvedId = await this.resolve(specifiedModulePath);
        const modulePath = getModulePathFromResolvedId(resolvedId.id);
        const sanitizedModuleName = sanitizeModuleName(specifiedModulePath);
        const chunkName = getChunkNameForModule({
          sanitizedModuleName,
          type,
        });
        moduleNameToEmittedChunkName[`./${chunkName}.js`] = {
          name,
          specifiedModulePath,
          chunkPath: `./${chunkName}.js`,
          ...getVersionInfoForModule(specifiedModulePath, modulePath),
        };
        moduleIdToName[modulePath] = {
          name,
          sanitizedModuleName,
          type,
        };
      }
      console.log(moduleIdToName);
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
          const init = (sharedScope) => {
            ${
              Object.entries(shared).map(([key, sharedModule]) => {
                /**
                 * TODO: Get the default values of these from the nearest package.json
                 */
                const { 
                  eager, packageName, requiredVersion, shareKey, shareScope, singleton, strictVersion, version,
                } = sharedModule;
                /**
                 * Handle import false.
                 */
                const importedModule = sharedModule.import ?? key;
                /**
                 * TODO: Add versioning information.
                 */
                return importedModule ? `
                  sharedScope['${shareKey ?? key}']['${version}'] = {
                    get: () => import('${importedModule}').then((module) => module),
                  };
                `: '';
              }).join('')
            }
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
          export const moduleMap = ${JSON.stringify(moduleNameToEmittedChunkName, null, 2)};
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
        const modulePath = getModulePathFromResolvedId(id);
        if (Object.prototype.hasOwnProperty.call(moduleIdToName, modulePath)) {
          return getChunkNameForModule(moduleIdToName[modulePath]);
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
        walk(ast, {
          enter(node) {
            /**
             * TODO: Only modify the import if we are either sharing or exposing it using module federation.
             */
            /**
             * ImportDeclaration spec: https://tc39.es/ecma262/#prod-ImportDeclaration
             * ES2015 Module spec: https://github.com/estree/estree/blob/master/es2015.md#modules
             */
            if (Object.keys(IMPORTS_TO_FEDERATED_IMPORTS_NODES).includes(node.type)) {
              const federatedImportStms = [];
              /**
               * TODO: What all information do we need to pass to this function ??
               * TODO: Implement ___federatedImport___ function.
               */
              const moduleSpecifier = `${FEDERATED_IMPORT_EXPR}('${node.source.value}')`;
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
        magicString.prepend(`import { ${FEDERATED_IMPORT_EXPR} } from './${FEDERATED_IMPORT_FILE_NAME}';`);
        chunkInfo.code = magicString.toString();
      });
    }
  }
}
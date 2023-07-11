import { walk } from 'estree-walker';
import MagicString from 'magic-string';

const IMPORTS_TO_FEDERATED_IMPORTS_NODES = {
  'ImportDeclaration': 'ImportDeclaration',
  'ImportExpression': 'ImportExpression'
};

const REMOTE_ENTRY_MODULE_ID = '__remoteEntry__';
const REMOTE_ENTRY_FILE_NAME = 'remoteEntry.js';
const REMOTE_ENTRY_NAME = 'remoteEntry';

export default function federation(federationConfig) {
  const {
    name,
    filename,
    exposes,
    shared,
  } = federationConfig;
  return {
    name: 'rollup-plugin-federation',
    options(options) {},
    buildStart(options) {
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
    generateBundle(options, bundle, isWrite) {
      /**
       * In the transform step we have converted every import into an import expression.
       * This ensures that the chunks are built out for this imports.
       * Once the chunks are built out, we transform those imports into __federated__imports__(chunkName, version, requestedVersion, ...);
       */
      Object.entries(bundle).forEach(([fileName, chunkInfo]) => {
        const ast = this.parse(chunkInfo.code);
        const magicString = new MagicString(chunkInfo.code);
        walk(ast, {
          enter(node) {
            // console.debug("Entering node: ", node);
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
              const moduleSpecifier = `__federatedImport__('${node.source.value}')`;
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
                        federatedImportStms.push(
                          `const ${specifier.local.name} = await ${moduleSpecifier}`
                        );
                        break;
                      }
                      case 'ImportSpecifier': {
                        if (specifier.imported.name !== specifier.local.name) {
                          federatedImportStms.push(
                            `const { ${specifier.imported.name}: ${specifier.local.name} } = await ${moduleSpecifier}`
                          );
                        } else {
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
        chunkInfo.code = magicString.toString();
      });
    }
  }
}
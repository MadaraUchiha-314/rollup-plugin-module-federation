import { walk } from 'estree-walker';
import MagicString from 'magic-string';

const IMPORTS_TO_FEDERATED_IMPORTS_NODES = {
  'ImportDeclaration': 'ImportDeclaration',
  'ImportExpression': 'ImportExpression'
};   

export default function federation(federationConfig) {
  return {
    name: 'rollup-plugin-federation',
    options(options) {
      /**
       * TODO: Add a new virtual entry point with the init() and get() interface.
       */
    },
    buildStart(options) {},
    resolveId(source, importer, options) {},
    load(id) {},
    transform(code, id) {
      const ast = this.parse(code);
      const magicString = new MagicString(code);
      walk(ast, {
        enter(node) {
          /**
           * TODO: Check if we are statically importing any local files that are shared or exposed.
           * We need to generate a separate chunk for those files.
           * We cannot let rollup parse those code and inline them. So we need to take care of those imports here itself.
           * We convert those imorts into dynamic imports.
           * What about eager ? Don't know. TBD.
           */
          /**
           * TODO: What all types of nodes need to handled here ?
           * ImportDeclaration spec: https://tc39.es/ecma262/#prod-ImportDeclaration
           * ES2015 Module spec: https://github.com/estree/estree/blob/master/es2015.md#modules
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
            console.log("Entering node: ", node);
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
              const federatedImportStmsStr = federatedImportStms.join(';').concat(';');
              magicString.overwrite(node.start, node.end, federatedImportStmsStr);
            }
          }
        });
        chunkInfo.code = magicString.toString();
      });
    }
  }
}
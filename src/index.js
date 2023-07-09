import { walk } from 'estree-walker';
import MagicString from 'magic-string';

export default function federation() {
    return {
        name: 'rollup-plugin-federation',
        resolveId(source, importer, options) {},
        load(id) {},
        transform(code, id) {
            const ast = this.parse(code)
            const magicString = new MagicString(code)
            walk(ast, {
                enter(node) {
                    console.log("entering node: ", node);
                    if (node.type === 'ImportDeclaration') {
                        /**
                         * ImportDeclaration spec: https://tc39.es/ecma262/#prod-ImportDeclaration
                         * ES2015 Module spec: https://github.com/estree/estree/blob/master/es2015.md#modules
                         */
                        const federatedImportStms = [];
                        /**
                         * TODO: Convert this to a federated import.
                         */
                        const moduleSpecifier = `import('${node.source.value}')`;
                        node.specifiers.map((specifier) => {
                            switch(specifier.type) {
                                case 'ImportDefaultSpecifier': {
                                    /**
                                     * import ABC from 'pqr';
                                     */
                                    federatedImportStms.push(
                                        `const ${specifier.local.name} = await ${moduleSpecifier}`
                                    )
                                    break
                                }
                                case 'ImportNamespaceSpecifier': {
                                    federatedImportStms.push(
                                        `const ${specifier.local.name} = await ${moduleSpecifier}`
                                    )
                                    break
                                }
                                case 'ImportSpecifier': {
                                    if (specifier.imported.name !== specifier.local.name) {
                                        federatedImportStms.push(
                                            `const { ${specifier.imported.name}: ${specifier.local.name} } = await ${moduleSpecifier}`
                                        )
                                    } else {
                                        federatedImportStms.push(
                                            `const { ${specifier.local.name} } = await ${moduleSpecifier}`
                                        )
                                    }
                                    break
                                }
                                default:
                                    throw Error(`Unhandled ImportDeclaration specifiers. ${JSON.stringify(specifier)}`)
                            }
                        });
                        const federatedImportStmsStr = federatedImportStms.join(';').concat(';');
                        console.log(federatedImportStmsStr);
                        magicString.overwrite(node.start, node.end, federatedImportStmsStr)
                    }
                }
            })
            return {
                code: magicString.toString(),
            }
        }
    }
}
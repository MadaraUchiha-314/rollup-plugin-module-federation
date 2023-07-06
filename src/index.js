import { walk } from 'estree-walker';
import MagicString from 'magic-string';

export default function federation() {
    return {
        name: 'rollup-plugin-federation',
        resolveId(source, importer, options) {
            console.log(`resolveId: source = ${source} importer = ${importer} options = ${JSON.stringify(options, null, 2)}`)
            return null
        },
        load(id) {
            console.log(`load: id = ${id}`)
        },
        transform(code, id) {
            console.log(`transform: code = ${code} id = ${id}`)
            
            const ast = this.parse(code)

            const magicString = new MagicString(code)

            walk(ast, {
                enter(node) {
                    console.log("entering node: ", node);
                    if (node.type === 'ImportDeclaration') {
                        /**
                         * TODO: This writes only the R.H.S. of the import.
                         * Writing the L.H.S. of the import is going to be more involved.
                         * Needs an understanding of ImportDefaultSpecifier, ImportSpecifier and how to handle these statements.
                         */
                        magicString.overwrite(node.start, node.end, `__federated__import__('${node.source.value}')`)
                    }
                }
            })
            return {
                code: magicString.toString(),
            }
        }
    }
}
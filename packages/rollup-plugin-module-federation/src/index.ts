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
  getSharedConfig,
  getExposesConfig,
  getRemotesConfig,
  getInitConfig,
} from './utils.js';
import { PACKAGE_JSON } from './constants.js';

import type { ImportDeclaration, ExportNamedDeclaration, Node } from 'estree';
import type { ModuleFederationPluginOptions } from '../types';
import type { PackageJson } from 'type-fest';
import type { Plugin, ManualChunksOption, AcornNode } from 'rollup';

import {
  NodesToRewrite,
  FederatedModule,
  FederatedModuleInfo,
  SharedOrExposedModuleInfo,
  FederatedModuleType,
  ModuleVersionInfo,
} from './types';

const IMPORTS_TO_FEDERATED_IMPORTS_NODES = {
  ImportDeclaration: 'ImportDeclaration',
  ImportExpression: 'ImportExpression',
  /**
   * TODO: Fix the bug before uncommenting: https://github.com/MadaraUchiha-314/rollup-plugin-module-federation/issues/16
   */
  /* ExportNamedDeclaration: 'ExportNamedDeclaration', */
  /**
   * TODO: Rollup has to first fix the bug before we can work on this: https://github.com/rollup/rollup/issues/5221
   */
  /* ExportAllDeclaration: 'ExportAllDeclaration', */
};

const REMOTE_ENTRY_MODULE_ID: string = '__remoteEntry__';
const REMOTE_ENTRY_FILE_NAME: string = `${REMOTE_ENTRY_MODULE_ID}.js`;
const REMOTE_ENTRY_NAME: string = 'remoteEntry';

/**
 * All imports to shared/exposed/remotes will get converted to this expression.
 */
const FEDERATED_IMPORT_EXPR: string = 'loadShare';
const FEDERATED_IMPORT_FROM_REMOTE: string = 'loadRemote';
const FEDERATED_EAGER_SHARED: string = '__federated__shared__eager__';

const FEDERATION_RUNTIME_PACKAGE = '@module-federation/runtime';
const FEDERATION_RUNTIME_PACKAGE_CHUNK_NAME = '__module_federation_runtime__';

const MODULE_VERSION_UNSPECIFIED: string = '0.0.0';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(__filename);

export function getFederatedImportStatementForNode(
  node: NodesToRewrite,
  {
    importStmt,
    entityToImport,
  }: { importStmt: string; entityToImport: string },
  federatedModuleType: FederatedModuleType,
): string {
  const federatedImportStms: Array<string> = [];
  /**
   * TODO: What all types of nodes need to handled here ?
   * ImportDeclaration spec: https://tc39.es/ecma262/#prod-ImportDeclaration
   * ES2015 Module spec: https://github.com/estree/estree/blob/master/es2015.md#modules
   */
  const moduleSpecifier = `${importStmt}('${entityToImport}')`;
  const getModuleAsync =
    federatedModuleType === 'remote'
      ? moduleSpecifier
      : `(await ${moduleSpecifier})()`;
  switch (node.type) {
    case IMPORTS_TO_FEDERATED_IMPORTS_NODES.ImportDeclaration: {
      (node as ImportDeclaration).specifiers.forEach((specifier) => {
        switch (specifier.type) {
          case 'ImportDefaultSpecifier': {
            /**
             * import ABC from 'pqr';
             */
            if (federatedModuleType === 'remote') {
              /**
               * When it is a default import from a remote module we have to pass special hints to the module loader.
               * This is to load the default exported entity.
               */
              const defaultImportModuleSpecifier = `${importStmt}('${entityToImport}')`;
              federatedImportStms.push(
                `const ${specifier.local.name} = await ${defaultImportModuleSpecifier}`,
              );
            } else {
              federatedImportStms.push(
                `const ${specifier.local.name} = ${getModuleAsync}`,
              );
            }
            break;
          }
          case 'ImportNamespaceSpecifier': {
            /**
             * import * as ABC from 'pqr';
             */
            federatedImportStms.push(
              `const ${specifier.local.name} = ${getModuleAsync}`,
            );
            break;
          }
          case 'ImportSpecifier': {
            if (specifier.imported.name !== specifier.local.name) {
              /**
               * import { ABC as XYZ } from 'pqr';
               */
              federatedImportStms.push(
                `const { ${specifier.imported.name}: ${specifier.local.name} } = ${getModuleAsync}`,
              );
            } else {
              /**
               * import { ABC } from 'pqr';
               */
              federatedImportStms.push(
                `const { ${specifier.local.name} } = ${getModuleAsync}`,
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
    case 'ExportNamedDeclaration': {
      (node as ExportNamedDeclaration).specifiers.forEach((specifier) => {
        switch (specifier.type) {
          case 'ExportSpecifier': {
            if (specifier.exported.name !== specifier.local.name) {
              /**
               * export { ABC as XYZ } from 'pqr';
               */
              federatedImportStms.push(
                `const { ${specifier.local.name} } = ${getModuleAsync}; export { ${specifier.local.name} as ${specifier.exported.name} }`,
              );
            } else {
              /**
               * export { ABC } from 'pqr';
               */
              federatedImportStms.push(
                `const { ${specifier.local.name} } = ${getModuleAsync}; export { ${specifier.local.name} }`,
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

export default function federation(
  federationConfig: ModuleFederationPluginOptions,
): Plugin {
  const { name, filename } = federationConfig;

  const shared = getSharedConfig(federationConfig.shared || {});

  const exposes = getExposesConfig(federationConfig.exposes || {});

  const remotes = getRemotesConfig(federationConfig.remotes || {});

  const remoteType = federationConfig?.remoteType ?? 'module';

  const initConfig = getInitConfig(name, shared, remotes, remoteType);

  const remoteEntryFileName: string = filename ?? REMOTE_ENTRY_FILE_NAME;

  const projectRoot = resolve();
  const pkgJson: PackageJson = JSON.parse(
    readFileSync(`${projectRoot}${sep}${PACKAGE_JSON}`, 'utf-8'),
  );
  /**
   * Created a mapping between resolvedId.id of the module to the module name (shared, exposed)
   */
  const federatedModuleInfo: Record<string, FederatedModuleInfo> = {};
  /**
   * Get the version of module.
   * Module version if not specified in the federation config needs to be taken from the package.json
   * @param {string} moduleNameOrPath The module name for which a version required.
   */
  const getVersionInfoForModule = (
    moduleNameOrPath: string,
    resolvedModulePath: string,
    type: FederatedModuleType,
  ): ModuleVersionInfo => {
    /**
     * Check if module is shared.
     */
    const versionInfo: ModuleVersionInfo = {
      version: null,
      requiredVersion: null,
      strictVersion: null,
      singleton: null,
      eager: false,
    };
    /**
     * If its a remote module, then there's no notion of versions.
     */
    if (type === 'remote') {
      return versionInfo;
    }
    const nearestPkgJson = getNearestPackageJson(resolvedModulePath);
    const resolvedModuleVersionInPkgJson: string =
      nearestPkgJson?.version ?? MODULE_VERSION_UNSPECIFIED;

    if (Object.prototype.hasOwnProperty.call(shared, moduleNameOrPath)) {
      const versionInLocalPkgJson = pkgJson?.dependencies?.[moduleNameOrPath];
      return {
        ...versionInfo,
        version: resolvedModuleVersionInPkgJson,
        requiredVersion: versionInLocalPkgJson ?? null,
        ...shared?.[moduleNameOrPath],
      };
    }
    return versionInfo;
  };

  /**
   * Checks whether the import is from a remote module or not.
   * @param importSource The source from which we are importing.
   */
  const isImportFromRemoteModule = (importSource: string): boolean => {
    for (const remoteName in remotes) {
      if (importSource.includes(`${remoteName}/`)) {
        return true;
      }
    }
    return false;
  };

  /**
   * Get the resolved version for the module.
   * @param {string} moduleNameOrPath The module name for which a version required.
   * @returns
   */
  const getVersionForModule = (moduleNameOrPath: string) =>
    (
      Object.values(federatedModuleInfo).find(
        (moduleInfo) => moduleInfo.moduleNameOrPath === moduleNameOrPath,
      ) as SharedOrExposedModuleInfo
    ).versionInfo.version ?? null;

  return {
    name: 'rollup-plugin-federation',
    async buildStart() {
      /**
       * For each shared and exposed module we store the resolved paths for those modules.
       */
      const federatedModules: Array<FederatedModule> = [];
      /**
       * Shared modules.
       * Its important to give priority to shared modules over exposed modules due to how versions are resolved.
       * Shared modules have versions.
       * Exposed modules don't. The best we can do for exposed modules is the version of the package which is exposing these modules.
       * If a module is both shared and exposed, we treat it as shared.
       */
      federatedModules.push(
        ...Object.entries(shared).map(
          ([sharedModuleName, sharedModuleHints]): FederatedModule => ({
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
          ([exposedModuleName, exposedModulePath]): FederatedModule => ({
            name: exposedModuleName,
            /**
             * TODO: We don't current support that import be an array. What does that even mean ? Need further clarification.
             */
            moduleNameOrPath: exposedModulePath.import as string,
            type: 'exposed',
          }),
        ),
      );
      /**
       * Remote modules.
       */
      federatedModules.push(
        ...Object.entries(remotes).map(
          ([remoteName, remoteEntity]): FederatedModule => ({
            name: remoteName,
            moduleNameOrPath: remoteEntity.external as string,
            type: 'remote',
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
        if (type === 'remote') {
          federatedModuleInfo[moduleName] = {
            name: moduleName,
            moduleNameOrPath,
            sanitizedModuleNameOrPath: null,
            type,
            initialized: false,
            module: null,
            remoteType,
          };
          continue;
        }
        /* eslint-disable-next-line no-await-in-loop */
        const resolvedId = await this.resolve(moduleNameOrPath);
        const resolvedModulePath = getModulePathFromResolvedId(
          resolvedId?.id as string,
        );
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
          type,
        );
        if (
          !Object.prototype.hasOwnProperty.call(
            federatedModuleInfo,
            resolvedModulePath,
          )
        ) {
          federatedModuleInfo[resolvedModulePath] = {
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
       * Emit a file corresponding to the remote container.
       * This plugin will itself resolve this file in resolveId() and provide the implementation of the file in load()
       */
      this.emitFile({
        type: 'chunk',
        id: REMOTE_ENTRY_MODULE_ID,
        name: name ?? REMOTE_ENTRY_NAME,
        fileName: remoteEntryFileName,
        importer: undefined,
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
      /**
       * Check all the remote modules.
       * For remote modules, we just resolve it to the whatever the import was.
       */
      for (const remoteName in remotes) {
        if (source.startsWith(`${remoteName}/`)) {
          return {
            id: source,
            external: true,
          };
        }
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
          import { init as initModuleFederationRuntime } from '@module-federation/runtime';
          ${Object.entries(initConfig?.shared ?? {})
            .filter(
              ([_, sharedConfigForPkg]) =>
                sharedConfigForPkg.shareConfig?.eager,
            )
            .map(([moduleNameOrPath]) => {
              /**
               * For shared modules that are eager we use: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import#module_namespace_object
               */
              return `import * as ${FEDERATED_EAGER_SHARED}${moduleNameOrPath} from '${moduleNameOrPath}';`;
            })
            .join('')}
          const init = (sharedScope) => {
            initModuleFederationRuntime({
              name: '${initConfig.name}',
              plugins: [],
              remotes: ${JSON.stringify(initConfig.remotes)},
              shared: {
                ${Object.entries(initConfig.shared ?? {})
                  .map(([moduleNameOrPath, sharedConfigForPkg]) => {
                    /**
                     * If the dependency is declared as a import: false, then we don't need to provide it to the initConfig.
                     * QUESTION: How does one even support import: false with this ?
                     * Bug: https://github.com/module-federation/universe/issues/2020
                     */
                    if (!shared[moduleNameOrPath]?.import) {
                      return '';
                    }
                    return `
                      '${moduleNameOrPath}': {
                        ${JSON.stringify(sharedConfigForPkg).replace(
                          /^\{|\}$/g,
                          '',
                        )},
                        version: '${getVersionForModule(moduleNameOrPath)}',
                        ${
                          /**
                           * TODO: Convert this to a lib and re-write eager shared imports to loadShareSync()
                           */
                          sharedConfigForPkg.shareConfig?.eager
                            ? `
                            get: () => Promise.resolve(${FEDERATED_EAGER_SHARED}${moduleNameOrPath}).then((module) => () => module),
                          `
                            : `
                            get: () => import('${moduleNameOrPath}').then((module) => () => module),
                          `
                        }
                      },
                  `;
                  })
                  .join('')}
              }
            });
          };
          const get = (module) => {
            switch(module) {
              ${Object.entries(exposes)
                .map(
                  ([key, exposedModule]) => `
                    case '${key}': {
                      return import('${exposedModule.import}').then((module) => () => module);
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
        if (id === REMOTE_ENTRY_MODULE_ID) {
          return null;
        }
        const self = this;
        let chunkHasFederatedImports = false;
        await asyncWalk(ast as Node, {
          async enter(node) {
            /**
             * TODO: What about eager ? Don't know. TBD.
             */
            if (
              Object.keys(IMPORTS_TO_FEDERATED_IMPORTS_NODES).includes(
                node.type,
              ) &&
              // @ts-ignore
              node?.source?.value
            ) {
              /**
               * At this point rollup hasn't completed resolution of the import statements in this file.
               * Imports might still be relative to the current file.
               * Its crucial to call the this.resolve() with the importer (2nd arg) to actually resolve the import.
               */
              // @ts-ignore
              const resolvedId = await self.resolve(node.source.value, id);
              const resolvedModulePath = getModulePathFromResolvedId(
                resolvedId?.id as string,
              );
              /**
               * We treat shared, exposed modules differently from remote modules.
               */
              if (
                Object.prototype.hasOwnProperty.call(
                  federatedModuleInfo,
                  resolvedModulePath,
                )
              ) {
                chunkHasFederatedImports = true;
                const chunkName = (
                  federatedModuleInfo[
                    resolvedModulePath
                  ] as SharedOrExposedModuleInfo
                ).moduleNameOrPath;
                const federatedImportStmsStr =
                  getFederatedImportStatementForNode(
                    node as NodesToRewrite,
                    {
                      importStmt: FEDERATED_IMPORT_EXPR,
                      entityToImport: chunkName,
                    },
                    'shared',
                  );
                magicString.overwrite(
                  (node as AcornNode).start,
                  (node as AcornNode).end,
                  federatedImportStmsStr,
                );
              } else if (
                isImportFromRemoteModule(
                  // @ts-ignore
                  node?.source?.value,
                )
              ) {
                chunkHasFederatedImports = true;
                const federatedImportStmsStr =
                  getFederatedImportStatementForNode(
                    node as NodesToRewrite,
                    {
                      importStmt: FEDERATED_IMPORT_FROM_REMOTE,
                      // @ts-ignore
                      entityToImport: node?.source?.value,
                    },
                    'remote',
                  );
                magicString.overwrite(
                  (node as AcornNode).start,
                  (node as AcornNode).end,
                  federatedImportStmsStr,
                );
              }
            }
          },
        });
        /**
         * The top level import of loadShare and loadRemote
         * TODO: Don't import both loadShare and loadRemote just because you are lazy to code it :p. Curious whether rollup's tree-shaking can take care of it automagically.
         */
        if (chunkHasFederatedImports) {
          magicString.prepend(`
            /**
             * Import from @module-federation/runtime
             */
            import { ${FEDERATED_IMPORT_EXPR}, ${FEDERATED_IMPORT_FROM_REMOTE} } from '@module-federation/runtime';${EOL}
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
      const manualChunks: ManualChunksOption = (id) => {
        if (id === REMOTE_ENTRY_MODULE_ID) {
          return REMOTE_ENTRY_MODULE_ID;
        }
        /**
         * We need to forcefully create a separate chunk for the @module-federation/runtime package
         * Rollup shouldn't include this with any other modules as those might include top-level awaits calls to loadShare or loadRemote
         * These calls cannot be present before the container is initialized.
         */
        if (id.includes(FEDERATION_RUNTIME_PACKAGE)) {
          return FEDERATION_RUNTIME_PACKAGE_CHUNK_NAME;
        }
        const resolvedModulePath = getModulePathFromResolvedId(id);
        if (
          Object.prototype.hasOwnProperty.call(
            federatedModuleInfo,
            resolvedModulePath,
          )
        ) {
          /**
           * Eager shared dependencies need to be bundled along with the remote entry.
           * Currently we return null and let rollup figure out the best chunking strategy.
           * NOTE: Providing the chunk name the same as the remote entry name doesn't work as it ends up creating multiple chunks.
           * TODO: Raise this bug with rollup.
           */
          if (
            (
              federatedModuleInfo[
                resolvedModulePath
              ] as SharedOrExposedModuleInfo
            ).versionInfo.eager
          ) {
            return null;
          }
          return getChunkNameForModule(federatedModuleInfo[resolvedModulePath]);
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

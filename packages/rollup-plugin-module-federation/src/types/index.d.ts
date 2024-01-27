import { ExposesConfig, SharedConfig, RemotesConfig } from '../../types';
import type { ShareArgs } from '@module-federation/runtime/dist/type.cjs.js';
/**
 * We rewrite the type for SharedObject to be that of the most verbose definition.
 */
export type SharedObject = {
  [index: string]: SharedConfig;
};

/**
 * We rewrite the type for ExposesObject to be that of the most verbose definition.
 */
export type ExposesObject = {
  [index: string]: ExposesConfig;
};

/**
 * We rewrite the type for RemotesObject to be that of the most verbose definition.
 */
export type RemotesObject = {
  [index: string]: RemotesConfig;
};

export type CustomShareArgs = ShareArgs & { importedModule: string };

export type ShareOptions = {
  [pkgName: string]: CustomShareArgs;
};

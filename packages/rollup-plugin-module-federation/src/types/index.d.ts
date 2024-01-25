import { ExposesConfig, SharedConfig, RemotesConfig } from '../../types';
import type { ShareArgs } from '@module-federation/runtime/dist/type.cjs.js';
/**
 * We rewrite the type for SharedObject to be that of the most verbose definition.
 */
export declare interface SharedObject {
  [index: string]: SharedConfig;
}

/**
 * We rewrite the type for ExposesObject to be that of the most verbose definition.
 */
export declare interface ExposesObject {
  [index: string]: ExposesConfig;
}

/**
 * We rewrite the type for RemotesObject to be that of the most verbose definition.
 */
export declare interface RemotesObject {
  [index: string]: RemotesConfig;
}

export declare interface ShareOptions {
  [pkgName: string]: ShareArgs;
}
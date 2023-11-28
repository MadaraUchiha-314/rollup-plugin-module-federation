import { ExposesConfig, SharedConfig } from '../../types';

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
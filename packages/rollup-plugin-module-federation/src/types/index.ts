import { moduleFederationPlugin } from '@module-federation/sdk';
import type { ShareArgs } from '@module-federation/runtime/types';
import type {
  ImportDeclaration,
  ImportExpression,
  ExportNamedDeclaration,
  ExportAllDeclaration,
} from 'estree';
/**
 * We rewrite the type for SharedObject to be that of the most verbose definition.
 */
export type SharedObject = {
  [index: string]: moduleFederationPlugin.SharedConfig & {
    import: string | false;
  };
};

/**
 * We rewrite the type for ExposesObject to be that of the most verbose definition.
 */
export type ExposesObject = {
  [index: string]: moduleFederationPlugin.ExposesConfig;
};

/**
 * We rewrite the type for RemotesObject to be that of the most verbose definition.
 */
export type RemotesObject = {
  [index: string]: moduleFederationPlugin.RemotesConfig;
};

export type ShareInfo = {
  [pkgName: string]: ShareArgs;
};

export type Nullable<T> = T | null;

export type ModuleVersionInfo = {
  version: Nullable<string> | false;
  requiredVersion: Nullable<string> | false;
  strictVersion: Nullable<boolean>;
  singleton: Nullable<boolean>;
  eager: Nullable<boolean>;
};

export type FederatedModuleType = 'remote' | 'exposed' | 'shared';

export type BaseModuleInfo = {
  name: string;
  moduleNameOrPath: string;
  sanitizedModuleNameOrPath: string | null;
  type: FederatedModuleType;
  alternateReferences?: string[];
};

export type RemoteModuleInfo = BaseModuleInfo & {
  type: FederatedModuleType;
  initialized: boolean;
  module: any;
  remoteType: string;
};

export type SharedOrExposedModuleInfo = BaseModuleInfo & {
  chunkNameWithExtension: string;
  versionInfo: ModuleVersionInfo;
  type: FederatedModuleType;
};

export type FederatedModuleInfo = SharedOrExposedModuleInfo | RemoteModuleInfo;

export type ModuleMapEntry = {
  name: string;
  moduleNameOrPath: string;
  chunkNameWithExtension: string | null;
  type: FederatedModuleType;
  version: string | null;
  requiredVersion: string | null;
  singleton: boolean | null;
  strictVersion: boolean | null;
  remoteType?: string;
};

export type FederatedModule = {
  name: string;
  moduleNameOrPath: string;
  type: FederatedModuleType;
};

export type NodesToRewrite =
  | ImportDeclaration
  | ImportExpression
  | ExportNamedDeclaration
  | ExportAllDeclaration;

export type ConsumedModuleFromRemote = {
  remoteName: string;
  exposedModule: string;
};

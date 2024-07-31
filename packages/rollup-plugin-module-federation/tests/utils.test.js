import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  describe, expect, test, afterEach, vi,
} from 'vitest';
import {
  generateExposeFilename,
  generateShareFilename,
} from '@module-federation/sdk';
import {
  getModulePathFromResolvedId,
  sanitizeModuleName,
  getChunkNameForModule,
  getFileNameFromChunkName,
  getNearestPackageJson,
  getSharedConfig,
  getExposesConfig,
  getRemotesConfig,
  getRequiredVersionForModule,
  getInitConfig,
} from '../src/utils.ts';

vi.mock('node:fs');
vi.mock('node:path');

describe('utils.ts', () => {
  test('getModulePathFromResolvedId extracts module path from resolved ID', () => {
    expect(getModulePathFromResolvedId('module/path?query=string')).toBe(
      'module/path',
    );
  });
  test('sanitizeModuleName removes file extension', () => {
    expect(sanitizeModuleName('module.js')).toBe('module');
  });
  test('getChunkNameForModule generates chunk name for shared module', () => {
    expect(
      getChunkNameForModule({
        sanitizedModuleNameOrPath: 'module',
        type: 'shared',
      }),
    ).toBe(generateShareFilename('module', false));
  });

  test('getChunkNameForModule generates chunk name for exposed module', () => {
    expect(
      getChunkNameForModule({
        sanitizedModuleNameOrPath: 'module',
        type: 'exposed',
      }),
    ).toBe(generateExposeFilename('module', false));
  });

  test('getChunkNameForModule throws error for invalid type', () => {
    expect(() => getChunkNameForModule({
      sanitizedModuleNameOrPath: 'module',
      type: 'invalid',
    })).toThrowError('Generating chunk name for invalid is not supported');
  });

  test('getChunkNameForModule throws error for invalid type', () => {
    expect(() => getChunkNameForModule({
      sanitizedModuleNameOrPath: null,
      type: 'invalid',
    })).toThrowError('Invalid module name provided: null');
  });

  test('getFileNameFromChunkName creates file path from chunk name', () => {
    expect(getFileNameFromChunkName('chunk-name')).toBe('chunk-name.js');
  });
});

describe('getNearestPackageJson', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('should return package.json if path is a file', () => {
    lstatSync.mockReturnValue({ isFile: () => true });
    dirname.mockReturnValue('/path/to');
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

    const result = getNearestPackageJson('/path/to/file.ts');

    expect(result).toEqual({ name: 'test' });
  });

  test('should return package.json if path is a directory with package.json', () => {
    lstatSync.mockReturnValue({ isFile: () => false });
    dirname.mockReturnValue('/path/to');
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

    const result = getNearestPackageJson('/path/to');

    expect(result).toEqual({ name: 'test' });
  });

  test('should return null if path is a directory without package.json', () => {
    lstatSync.mockReturnValue({ isFile: () => false });
    dirname.mockReturnValue('/path/to');
    existsSync.mockReturnValue(false);

    const result = getNearestPackageJson('/path/to');

    expect(result).toBeNull();
  });
});

describe('getSharedConfig', () => {
  test('should handle array input', () => {
    const shared = ['module1', 'module2'];
    const expected = {
      module1: { import: 'module1' },
      module2: { import: 'module2' },
    };
    expect(getSharedConfig(shared)).toEqual(expected);
  });

  test('should handle object input', () => {
    const shared = { module1: 'import1', module2: 'import2' };
    const expected = {
      module1: { import: 'import1' },
      module2: { import: 'import2' },
    };
    expect(getSharedConfig(shared)).toEqual(expected);
  });

  test('should handle complex object input', () => {
    const shared = {
      module1: { import: 'import1', otherKey: 'otherValue' },
      module2: 'import2',
    };
    const expected = {
      module1: { import: 'import1', otherKey: 'otherValue' },
      module2: { import: 'import2' },
    };
    expect(getSharedConfig(shared)).toEqual(expected);
  });

  test('should handle array input', () => {
    const shared = [
      {
        module1: { import: 'import1', otherKey: 'otherValue' },
      },
      {
        module2: 'import2',
      },
    ];
    const expected = {
      module1: { import: 'import1', otherKey: 'otherValue' },
      module2: { import: 'import2' },
    };
    expect(getSharedConfig(shared)).toEqual(expected);
  });

  test('should throw error for invalid array input', () => {
    const shared = ['module1', 123];
    expect(() => getSharedConfig(shared)).toThrowError();
  });

  test('should throw error for invalid object input', () => {
    const shared = { module1: 'import1', module2: 123 };
    expect(() => getSharedConfig(shared)).toThrowError();
  });
});

describe('getExposesConfig', () => {
  test('should handle array input', () => {
    const input = ['module1', 'module2'];
    const expected = {
      module1: { import: 'module1' },
      module2: { import: 'module2' },
    };
    expect(getExposesConfig(input)).toEqual(expected);
  });

  test('should handle object input', () => {
    const input = { module1: 'module1', module2: 'module2' };
    const expected = {
      module1: { import: 'module1' },
      module2: { import: 'module2' },
    };
    expect(getExposesConfig(input)).toEqual(expected);
  });

  test('should handle array input', () => {
    const input = [
      {
        module1: 'module1',
      },
      {
        module2: 'module2',
      },
    ];
    const expected = {
      module1: { import: 'module1' },
      module2: { import: 'module2' },
    };
    expect(getExposesConfig(input)).toEqual(expected);
  });

  test('should throw error for invalid array item', () => {
    const input = ['module1', 123];
    expect(() => getExposesConfig(input)).toThrowError();
  });

  test('should throw error for invalid object value', () => {
    const input = { module1: 'module1', module2: 123 };
    expect(() => getExposesConfig(input)).toThrowError();
  });

  test('should handle nested object input', () => {
    const input = { module1: 'module1', module2: { import: 'module2' } };
    const expected = {
      module1: { import: 'module1' },
      module2: { import: 'module2' },
    };
    expect(getExposesConfig(input)).toEqual(expected);
  });

  test('should throw error for array as object value', () => {
    const input = { module1: 'module1', module2: ['module2'] };
    expect(() => getExposesConfig(input)).toThrowError();
  });
});

describe('getRemotesConfig', () => {
  test('should handle array of strings', () => {
    const remotes = ['remote1', 'remote2'];
    const expected = {
      remote1: { external: 'remote1' },
      remote2: { external: 'remote2' },
    };
    expect(getRemotesConfig(remotes)).toEqual(expected);
  });

  test('should handle array of objects', () => {
    const remotes = [{ remote1: 'remote1' }, { remote2: 'remote2' }];
    const expected = {
      remote1: { external: 'remote1' },
      remote2: { external: 'remote2' },
    };
    expect(getRemotesConfig(remotes)).toEqual(expected);
  });

  test('should handle object of strings', () => {
    const remotes = { remote1: 'remote1', remote2: 'remote2' };
    const expected = {
      remote1: { external: 'remote1' },
      remote2: { external: 'remote2' },
    };
    expect(getRemotesConfig(remotes)).toEqual(expected);
  });

  test('should handle object of objects', () => {
    const remotes = {
      remote1: { external: 'remote1' },
      remote2: { external: 'remote2' },
    };
    const expected = {
      remote1: { external: 'remote1' },
      remote2: { external: 'remote2' },
    };
    expect(getRemotesConfig(remotes)).toEqual(expected);
  });

  test('should throw error for invalid array item', () => {
    const remotes = ['remote1', 123];
    expect(() => getRemotesConfig(remotes)).toThrowError();
  });

  test('should throw error for invalid object value', () => {
    const remotes = { remote1: 'remote1', remote2: 123 };
    expect(() => getRemotesConfig(remotes)).toThrowError();
  });

  test('should throw error for array as an entrypoint for exposed modules', () => {
    const remotes = { remote1: 'remote1', remote2: ['remote2'] };
    expect(() => getRemotesConfig(remotes)).toThrowError();
  });
});

describe('getRequiredVersionForModule', () => {
  test('should return the required version for a given module', () => {
    const federatedModuleInfo = {
      module1: {
        moduleNameOrPath: 'module1',
        versionInfo: { requiredVersion: '1.0.0' },
      },
      module2: {
        moduleNameOrPath: 'module2',
        versionInfo: { requiredVersion: '2.0.0' },
      },
    };

    const result = getRequiredVersionForModule(federatedModuleInfo, 'module1');
    expect(result).toBe('1.0.0');
  });

  test('should return false if the module does not exist', () => {
    const federatedModuleInfo = {
      module1: {
        moduleNameOrPath: 'module1',
        versionInfo: { requiredVersion: '1.0.0' },
      },
      module2: {
        moduleNameOrPath: 'module2',
        versionInfo: { requiredVersion: '2.0.0' },
      },
    };

    expect(() => getRequiredVersionForModule(federatedModuleInfo, 'module3')).toThrowError();
  });

  test('should return false if the required version is not specified', () => {
    const federatedModuleInfo = {
      module1: {
        moduleNameOrPath: 'module1',
        versionInfo: { requiredVersion: '1.0.0' },
      },
      module2: {
        moduleNameOrPath: 'module2',
        versionInfo: {},
      },
    };

    const result = getRequiredVersionForModule(federatedModuleInfo, 'module2');
    expect(result).toBe(false);
  });
});

describe('getInitConfig', () => {
  test('should return the empty configuration when no shared or remote modules are present', () => {
    const name = 'testName';
    const shared = {};
    const remotes = {};
    const federatedModuleInfo = {};

    const remoteType = 'module';

    const result = getInitConfig(
      name,
      shared,
      remotes,
      federatedModuleInfo,
      remoteType,
    );

    expect(result).toEqual({
      name: 'testName',
      shared: {},
      plugins: [],
      remotes: [],
    });
  });

  test('should return the correct configuration when remote modules are present', () => {
    const name = 'testName';
    const shared = {
      sharedPkg1: {
        import: 'sharedPkg1',
      },
      sharedPkg2: {
        import: false,
      },
    };
    const remotes = {
      remote1: {
        external: 'remote1',
      },
    };
    const federatedModuleInfo = {
      sharedPkg1: {
        moduleNameOrPath: 'sharedPkg1',
        versionInfo: { requiredVersion: '1.0.0' },
      },
      sharedPkg2: {
        moduleNameOrPath: 'sharedPkg2',
        versionInfo: { requiredVersion: '1.0.0' },
      },
    };
    const remoteType = 'module';

    const result = getInitConfig(
      name,
      shared,
      remotes,
      federatedModuleInfo,
      remoteType,
    );

    expect(result).toEqual({
      name: 'testName',
      shared: {
        sharedPkg1: {
          version: null,
          shareConfig: {
            singleton: undefined,
            requiredVersion: '1.0.0',
            eager: undefined,
          },
          scope: undefined,
          strategy: 'version-first',
        },
        sharedPkg2: {
          version: null,
          strategy: 'loaded-first',
          shareConfig: {
            singleton: undefined,
            requiredVersion: '1.0.0',
            eager: undefined,
          },
          scope: undefined,
        },
      },
      plugins: [],
      remotes: [
        {
          name: 'remote1',
          entry: 'remote1',
          shareScope: undefined,
          type: 'esm',
        },
      ],
    });
  });
});

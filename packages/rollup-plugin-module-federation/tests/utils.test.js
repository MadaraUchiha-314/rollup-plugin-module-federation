import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  describe, expect, test, jest, afterEach,
} from '@jest/globals';
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
} from '../src/utils.ts';

jest.mock('node:fs');
jest.mock('node:path');

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

  test('getFileNameFromChunkName creates file path from chunk name', () => {
    expect(getFileNameFromChunkName('chunk-name')).toBe('./chunk-name.js');
  });
});

describe('getNearestPackageJson', () => {
  afterEach(() => {
    jest.resetAllMocks();
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

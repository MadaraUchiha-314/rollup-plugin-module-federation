import { describe, expect, test } from '@jest/globals';
import {
  generateExposeFilename,
  generateShareFilename,
} from '@module-federation/sdk';
import {
  getModulePathFromResolvedId,
  sanitizeModuleName,
  getChunkNameForModule,
  getFileNameFromChunkName,
} from '../src/utils.ts';

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

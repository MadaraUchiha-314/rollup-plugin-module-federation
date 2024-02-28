import { describe, expect, test } from '@jest/globals';

import { getModulePathFromResolvedId } from '../src/utils.ts';

describe('utils.ts', () => {
    test('getModulePathFromResolvedId removes query param and everything following the module id', () => {
        const modulePath = getModulePathFromResolvedId('/abc/pqr?x=y');
        expect(modulePath).toBe('/abc/pqr');
    });
});
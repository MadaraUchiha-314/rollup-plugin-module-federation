import { describe, expect, test } from 'vitest';
import { getFederatedImportStatementForNode } from '../src/index.ts';

describe('getFederatedImportStatementForNode', () => {
  const importStmt = 'loadShared';
  const entityToImport = 'entity';

  test('should handle ImportDeclaration with ImportDefaultSpecifier', () => {
    const node = {
      type: 'ImportDeclaration',
      specifiers: [{ type: 'ImportDefaultSpecifier', local: { name: 'ABC' } }],
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    );
    expect(result).toContain("const ABC = (await loadShared('entity'))()");
  });

  test('should handle ImportDeclaration with ImportDefaultSpecifier', () => {
    const node = {
      type: 'ImportDeclaration',
      specifiers: [{ type: 'ImportDefaultSpecifier', local: { name: 'ABC' } }],
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'remote',
    );
    expect(result).toContain(
      "const ABC = (await loadShared('entity')).default",
    );
  });

  test('should handle ImportDeclaration with ImportNamespaceSpecifier', () => {
    const node = {
      type: 'ImportDeclaration',
      specifiers: [
        { type: 'ImportNamespaceSpecifier', local: { name: 'ABC' } },
      ],
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    );
    expect(result).toContain("const ABC = (await loadShared('entity'))()");
  });

  test('should handle ImportDeclaration with renamed ImportSpecifier', () => {
    const node = {
      type: 'ImportDeclaration',
      specifiers: [
        {
          type: 'ImportSpecifier',
          local: { name: 'ABC' },
          imported: { name: 'XYZ' },
        },
      ],
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    );
    expect(result).toContain(
      "const { XYZ: ABC } = (await loadShared('entity'))()",
    );
  });

  test('should handle ImportDeclaration with ImportSpecifier', () => {
    const node = {
      type: 'ImportDeclaration',
      specifiers: [
        {
          type: 'ImportSpecifier',
          local: { name: 'ABC' },
          imported: { name: 'ABC' },
        },
      ],
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    );
    expect(result).toContain("const { ABC } = (await loadShared('entity'))()");
  });

  test('should handle ImportExpression', () => {
    const node = {
      type: 'ImportExpression',
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    );
    expect(result).toContain("(await loadShared('entity'))()");
  });

  test('should handle ExportNamedDeclaration', () => {
    const node = {
      type: 'ExportNamedDeclaration',
      specifiers: [
        {
          type: 'ExportSpecifier',
          local: { name: 'ABC' },
          exported: { name: 'ABC' },
        },
      ],
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    );
    expect(result).toContain(
      "const { ABC } = (await loadShared('entity'))(); export { ABC }",
    );
  });

  test('should handle renamed ExportNamedDeclaration', () => {
    const node = {
      type: 'ExportNamedDeclaration',
      specifiers: [
        {
          type: 'ExportSpecifier',
          local: { name: 'ABC' },
          exported: { name: 'XYZ' },
        },
      ],
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    );
    expect(result).toContain(
      "const { ABC } = (await loadShared('entity'))(); export { ABC as XYZ }",
    );
  });

  test('should throw an error for unsupported import specifier type', () => {
    const node = {
      type: 'ImportDeclaration',
      specifiers: [{ type: 'UnsupportedSpecifier' }],
    };
    expect(() => getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    )).toThrow(
      'Unhandled ImportDeclaration specifiers. {"type":"UnsupportedSpecifier"}',
    );
  });

  test('should throw an error for unsupported export specifier type', () => {
    const node = {
      type: 'ExportNamedDeclaration',
      specifiers: [{ type: 'UnsupportedSpecifier' }],
    };
    expect(() => getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    )).toThrow(
      'Unhandled ExportNamedDeclaration specifiers. {"type":"UnsupportedSpecifier"}',
    );
  });

  test('should return empty string for unsupported node type', () => {
    const node = {
      type: 'UnsupportedType',
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'shared',
    );
    expect(result).toBe('');
  });
});

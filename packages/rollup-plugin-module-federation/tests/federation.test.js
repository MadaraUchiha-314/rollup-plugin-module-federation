import { describe, expect, test } from 'vitest';
import { getFederatedImportStatementForNode } from '../src/index.ts';

describe('getFederatedImportStatementForNode', () => {
  const importStmt = 'import';
  const entityToImport = 'entity';

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
    expect(result).toContain("const ABC = (await import('entity')).default");
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
      'remote',
    );
    expect(result).toContain("const ABC = (await import('entity'))");
  });

  test('should handle ImportDeclaration with ImportSpecifier', () => {
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
      'remote',
    );
    expect(result).toContain("const { XYZ: ABC } = (await import('entity'))");
  });

  test('should handle ImportExpression', () => {
    const node = {
      type: 'ImportExpression',
    };
    const result = getFederatedImportStatementForNode(
      node,
      { importStmt, entityToImport },
      'remote',
    );
    expect(result).toContain("(await import('entity'))");
  });

  test('should handle ExportNamedDeclaration', () => {
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
      'remote',
    );
    expect(result).toContain(
      "const { ABC } = (await import('entity')); export { ABC as XYZ }",
    );
  });
});

import { describe, expect, it } from 'vitest';
import type { SnapshotNode, SnapshotResult } from '../src/contracts.js';
import { auditSemantics } from '../src/flutter/doctor.js';

function node(overrides: Partial<SnapshotNode> & Pick<SnapshotNode, 'ref' | 'role' | 'type'>): SnapshotNode {
  return {
    rect: { x: 0, y: 0, width: 0, height: 0 },
    enabled: true,
    hittable: true,
    visible: true,
    children: [],
    ...overrides,
  };
}

function wrap(children: SnapshotNode[]): SnapshotResult {
  return {
    visibleCount: children.length + 1,
    totalCount: children.length + 1,
    offscreenInteractive: [],
    root: node({ ref: 'e0', role: 'Window', type: 'Window', children }),
  };
}

describe('auditSemantics', () => {
  it('flags interactive nodes without label or identifier', () => {
    const report = auditSemantics(
      wrap([node({ ref: 'e1', role: 'Button', type: 'Button' })]),
    );
    expect(report.findings.some((f) => f.kind === 'unlabeled-interactive')).toBe(true);
    expect(report.coverageRatio).toBe(0);
  });

  it('flags labeled nodes that lack an identifier', () => {
    const report = auditSemantics(
      wrap([node({ ref: 'e1', role: 'Button', type: 'Button', label: 'Submit' })]),
    );
    expect(report.findings.some((f) => f.kind === 'missing-identifier')).toBe(true);
    expect(report.labeled).toBe(1);
    expect(report.identified).toBe(0);
  });

  it('flags duplicate identifiers', () => {
    const report = auditSemantics(
      wrap([
        node({ ref: 'e1', role: 'Button', type: 'Button', label: 'a', identifier: 'dup' }),
        node({ ref: 'e2', role: 'Button', type: 'Button', label: 'b', identifier: 'dup' }),
      ]),
    );
    const dups = report.findings.filter((f) => f.kind === 'duplicate-identifier');
    expect(dups).toHaveLength(2);
  });

  it('reports full coverage for a well-labeled tree', () => {
    const report = auditSemantics(
      wrap([
        node({ ref: 'e1', role: 'Button', type: 'Button', label: 'Next', identifier: 'next' }),
        node({ ref: 'e2', role: 'TextField', type: 'Field', label: 'Name', identifier: 'name' }),
      ]),
    );
    expect(report.totalInteractive).toBe(2);
    expect(report.identified).toBe(2);
    expect(report.coverageRatio).toBe(1);
    expect(report.findings).toHaveLength(0);
  });
});

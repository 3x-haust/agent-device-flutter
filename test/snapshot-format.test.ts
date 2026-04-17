import { describe, expect, it } from 'vitest';
import type { SnapshotNode, SnapshotResult } from '../src/contracts.js';
import { formatSnapshot } from '../src/snapshot/format.js';

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

const sample: SnapshotResult = {
  visibleCount: 3,
  totalCount: 5,
  offscreenInteractive: [
    { direction: 'below', labels: ['Settings', 'About'], total: 2 },
  ],
  root: node({
    ref: 'e1',
    role: 'Application',
    type: 'XCUIElementTypeApplication',
    label: 'Runner',
    children: [
      node({
        ref: 'e2',
        role: 'Window',
        type: 'XCUIElementTypeWindow',
        children: [
          node({
            ref: 'e3',
            role: 'Button',
            type: 'XCUIElementTypeButton',
            label: 'Increment',
            identifier: 'inc',
          }),
          node({
            ref: 'e4',
            role: 'Other',
            type: 'XCUIElementTypeOther',
            visible: false,
          }),
        ],
      }),
    ],
  }),
};

describe('formatSnapshot', () => {
  it('renders a header, tree, and off-screen summary', () => {
    const out = formatSnapshot(sample);
    expect(out).toContain('Snapshot: 3 visible nodes (5 total)');
    expect(out).toContain('@e1 [application] "Runner"');
    expect(out).toContain('@e3 [button] "Increment"');
    expect(out).toContain('[off-screen below] 2 interactive items: "Settings", "About"');
  });

  it('interactive mode drops non-interactive leaves', () => {
    const out = formatSnapshot(sample, { interactive: true });
    expect(out).toContain('@e3 [button]');
    expect(out).not.toContain('[other]');
  });

  it('respects depth limit', () => {
    const out = formatSnapshot(sample, { depth: 1 });
    expect(out).toContain('@e1');
    expect(out).toContain('@e2');
    expect(out).not.toContain('@e3');
  });
});

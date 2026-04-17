import { describe, expect, it } from 'vitest';
import { formatDiff, unifiedDiff } from '../src/snapshot/diff.js';

describe('unifiedDiff', () => {
  it('returns context lines for identical input', () => {
    const lines = unifiedDiff('a\nb\nc', 'a\nb\nc');
    expect(lines.every((l) => l.kind === ' ')).toBe(true);
  });

  it('marks insertions with +', () => {
    const lines = unifiedDiff('a\nb', 'a\nx\nb');
    expect(lines.filter((l) => l.kind === '+').map((l) => l.text)).toEqual(['x']);
  });

  it('marks deletions with -', () => {
    const lines = unifiedDiff('a\nb\nc', 'a\nc');
    expect(lines.filter((l) => l.kind === '-').map((l) => l.text)).toEqual(['b']);
  });
});

describe('formatDiff', () => {
  it('prefixes each line with its kind', () => {
    const output = formatDiff(unifiedDiff('a\nb', 'a\nc'));
    expect(output.split('\n')).toEqual([' a', '-b', '+c']);
  });
});

import { describe, expect, it } from 'vitest';
import { CliParseError, parseArgs } from '../src/cli/parse.js';

describe('parseArgs', () => {
  it('extracts command, positional args, and long flags', () => {
    const parsed = parseArgs(['open', './app.apk', '--platform', 'android']);
    expect(parsed.command).toBe('open');
    expect(parsed.positional).toEqual(['./app.apk']);
    expect(parsed.flags).toEqual({ platform: 'android' });
  });

  it('supports `=` form on long flags', () => {
    const parsed = parseArgs(['snapshot', '--depth=3']);
    expect(parsed.flags).toEqual({ depth: '3' });
  });

  it('treats bare long flags as booleans', () => {
    const parsed = parseArgs(['snapshot', '--raw']);
    expect(parsed.flags).toEqual({ raw: true });
  });

  it('supports short flag clusters where the last takes a value', () => {
    const parsed = parseArgs(['snapshot', '-ic', '-d', '3']);
    expect(parsed.flags).toEqual({ i: true, c: true, d: '3' });
  });

  it('honors the `--` separator', () => {
    const parsed = parseArgs(['fill', '--', '--weird-arg', '@e7']);
    expect(parsed.positional).toEqual(['--weird-arg', '@e7']);
  });

  it('throws when no command is given', () => {
    expect(() => parseArgs([])).toThrow(CliParseError);
  });
});

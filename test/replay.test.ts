import { describe, expect, it } from 'vitest';
import { parseReplayScript, ReplayParseError } from '../src/replay/parser.js';

describe('parseReplayScript', () => {
  it('parses simple commands', () => {
    const steps = parseReplayScript(['open ./app.apk', 'snapshot -i', 'close'].join('\n'));
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({ command: 'open', args: ['./app.apk'] });
    expect(steps[1]).toMatchObject({ command: 'snapshot', args: ['-i'] });
    expect(steps[2]).toMatchObject({ command: 'close', args: [] });
  });

  it('ignores blank lines and comments', () => {
    const source = [
      '# header comment',
      '',
      'open ./app.apk',
      '   # indented comment',
      '',
      'close',
    ].join('\n');
    const steps = parseReplayScript(source);
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.command)).toEqual(['open', 'close']);
  });

  it('honors quoted arguments with spaces', () => {
    const steps = parseReplayScript('fill @e7 "hello world"');
    expect(steps[0]!.args).toEqual(['@e7', 'hello world']);
  });

  it('honors escaped characters inside quotes', () => {
    const steps = parseReplayScript('fill @e7 "he said \\"hi\\""');
    expect(steps[0]!.args).toEqual(['@e7', 'he said "hi"']);
  });

  it('throws on unterminated quoted strings', () => {
    expect(() => parseReplayScript('fill @e7 "never closed')).toThrow(ReplayParseError);
  });
});

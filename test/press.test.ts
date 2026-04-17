import { describe, expect, it } from 'vitest';
import { parseElementSelector } from '../src/cli/commands/press.js';

describe('parseElementSelector', () => {
  it('parses refs', () => {
    expect(parseElementSelector('@e7')).toEqual({ ref: 'e7' });
  });

  it('parses #identifier="..."', () => {
    expect(parseElementSelector('#identifier="submit-button"')).toEqual({
      identifier: 'submit-button',
    });
  });

  it('parses #label="..."', () => {
    expect(parseElementSelector('#label="Submit order"')).toEqual({ label: 'Submit order' });
  });

  it('parses coordinate pairs', () => {
    expect(parseElementSelector('120,340')).toEqual({ point: { x: 120, y: 340 } });
  });

  it('rejects unknown shapes', () => {
    expect(() => parseElementSelector('??')).toThrow();
  });
});

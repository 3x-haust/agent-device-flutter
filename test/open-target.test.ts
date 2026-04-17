import { describe, expect, it } from 'vitest';
import { classifyOpenTarget } from '../src/core/open-target.js';

describe('classifyOpenTarget', () => {
  it('detects URLs', () => {
    expect(classifyOpenTarget('https://example.com')).toEqual({
      kind: 'url',
      url: 'https://example.com',
    });
    expect(classifyOpenTarget('myapp://deep/link')).toEqual({
      kind: 'url',
      url: 'myapp://deep/link',
    });
  });

  it('detects relative and absolute paths', () => {
    expect(classifyOpenTarget('./app.apk')).toEqual({ kind: 'local-path', path: './app.apk' });
    expect(classifyOpenTarget('/tmp/app.app')).toEqual({ kind: 'local-path', path: '/tmp/app.app' });
  });

  it('detects file extensions as paths', () => {
    expect(classifyOpenTarget('build/Runner.app').kind).toBe('local-path');
    expect(classifyOpenTarget('out/app-debug.apk').kind).toBe('local-path');
  });

  it('detects reverse-dns ids', () => {
    expect(classifyOpenTarget('com.example.sample').kind).toBe('package');
  });
});

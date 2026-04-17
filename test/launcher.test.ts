import { describe, expect, it } from 'vitest';
import { parseMachineFrames } from '../src/flutter/launcher.js';
import { parseVmServiceUri } from '../src/flutter/dev-runtime.js';

describe('parseMachineFrames', () => {
  it('decodes a single-event line emitted by `flutter run --machine`', () => {
    const line =
      '[{"event":"app.debugPort","params":{"appId":"abc","wsUri":"ws://127.0.0.1:51234/ws","port":51234}}]\n';
    const frames = parseMachineFrames(line);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.event).toBe('app.debugPort');
    expect((frames[0]!.params as { wsUri: string }).wsUri).toBe('ws://127.0.0.1:51234/ws');
  });

  it('ignores non-JSON noise like daemon progress bars', () => {
    const chunk = [
      'Launching lib/main.dart on iPhone 16e...',
      '[{"event":"daemon.connected","params":{"version":"0.6.1","pid":42}}]',
      '[{"event":"app.start","params":{"appId":"x","directory":"."}}]',
      '',
    ].join('\n');
    const frames = parseMachineFrames(chunk);
    const events = frames.map((f) => f.event);
    expect(events).toContain('daemon.connected');
    expect(events).toContain('app.start');
    expect(events.length).toBe(2);
  });

  it('decodes RPC replies with numeric ids and error objects', () => {
    const line = '[{"id":7,"error":{"code":-32000,"message":"boom"}}]\n';
    const frames = parseMachineFrames(line);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.id).toBe(7);
    expect(frames[0]!.error?.message).toBe('boom');
  });

  it('decodes multiple frames in one array', () => {
    const line =
      '[{"event":"app.debugPort","params":{"appId":"a","wsUri":"ws://x/ws"}},{"event":"app.started","params":{"appId":"a"}}]\n';
    const frames = parseMachineFrames(line);
    expect(frames.map((f) => f.event)).toEqual(['app.debugPort', 'app.started']);
  });

  it('is tolerant of malformed JSON', () => {
    const frames = parseMachineFrames('[not-json\n[{"event":"ok"}]\n');
    expect(frames.map((f) => f.event)).toEqual(['ok']);
  });
});

describe('parseVmServiceUri', () => {
  it('extracts host, port, and auth code from a typical flutter wsUri', () => {
    const ep = parseVmServiceUri('ws://127.0.0.1:56799/xhwpYR3mplM%3D/ws');
    expect(ep.uri).toBe('ws://127.0.0.1:56799/xhwpYR3mplM%3D/ws');
    expect(ep.host).toBe('127.0.0.1');
    expect(ep.port).toBe(56799);
    expect(ep.authCode).toBe('xhwpYR3mplM%3D');
  });

  it('accepts an http URI without auth segment', () => {
    const ep = parseVmServiceUri('http://localhost:8080/');
    expect(ep.host).toBe('localhost');
    expect(ep.port).toBe(8080);
    expect(ep.authCode).toBeUndefined();
  });
});

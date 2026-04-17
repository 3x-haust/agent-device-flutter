import { spawn } from 'node:child_process';
import { createConnection, createServer, type Socket } from 'node:net';
import { existsSync } from 'node:fs';
import { mkdir, open as openFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface LauncherEvent {
  readonly event: string;
  readonly params?: Record<string, unknown>;
}

export interface FlutterMachineFrame {
  readonly event?: string;
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly code?: number; readonly message?: string };
  readonly params?: Record<string, unknown>;
}

export function parseMachineFrames(chunk: string): readonly FlutterMachineFrame[] {
  const frames: FlutterMachineFrame[] = [];
  for (const raw of chunk.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('[')) continue;
    try {
      const arr = JSON.parse(line) as unknown[];
      for (const entry of arr) {
        if (typeof entry === 'object' && entry !== null) {
          frames.push(entry as FlutterMachineFrame);
        }
      }
    } catch {
      // ignore non-JSON lines (progress bars, warnings)
    }
  }
  return frames;
}

export interface LaunchOptions {
  readonly projectRoot: string;
  readonly deviceId: string;
  readonly entrypoint?: string;
  readonly flavor?: string;
  readonly extraArgs?: readonly string[];
  readonly env?: NodeJS.ProcessEnv;
  readonly logPath: string;
  readonly socketPath: string;
  readonly startupTimeoutMs?: number;
}

export interface LaunchResult {
  readonly pid: number;
  readonly vmServiceUri: string;
  readonly appId: string;
  readonly controlSocketPath: string;
  readonly logPath: string;
}

export interface ControlClient {
  send(op: string, params?: Record<string, unknown>): Promise<{ ok: boolean; result?: unknown; error?: string }>;
  close(): void;
}

export async function startFlutterDaemon(opts: LaunchOptions): Promise<LaunchResult> {
  await mkdir(dirname(opts.logPath), { recursive: true });
  await mkdir(dirname(opts.socketPath), { recursive: true });
  if (existsSync(opts.socketPath)) await rm(opts.socketPath, { force: true });

  const logFile = await openFile(opts.logPath, 'a');
  const args = ['run', '--machine', '-d', opts.deviceId];
  if (opts.entrypoint) args.push('-t', opts.entrypoint);
  if (opts.flavor) args.push('--flavor', opts.flavor);
  if (opts.extraArgs) args.push(...opts.extraArgs);

  const child = spawn('flutter', args, {
    cwd: opts.projectRoot,
    env: opts.env ?? process.env,
    detached: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let nextRpcId = 1;
  const pendingRpc = new Map<number, (frame: FlutterMachineFrame) => void>();
  let stdoutBuf = '';

  let vmServiceUri: string | undefined;
  let appId: string | undefined;
  let startedResolve: (() => void) | undefined;
  let startedReject: ((err: Error) => void) | undefined;
  const started = new Promise<void>((resolve, reject) => {
    startedResolve = resolve;
    startedReject = reject;
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    void logFile.write(chunk);
    stdoutBuf += chunk;
    const nl = stdoutBuf.lastIndexOf('\n');
    if (nl < 0) return;
    const processed = stdoutBuf.slice(0, nl + 1);
    stdoutBuf = stdoutBuf.slice(nl + 1);
    for (const frame of parseMachineFrames(processed)) {
      handleFrame(frame);
    }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    void logFile.write(`[stderr] ${chunk}`);
  });

  child.on('exit', (code) => {
    void logFile.write(`\n[flutter exited code=${code}]\n`);
    for (const [, waiter] of pendingRpc) waiter({ error: { message: `flutter daemon exited (code=${code})` } });
    pendingRpc.clear();
    if (startedReject) startedReject(new Error(`flutter daemon exited before app.started (code=${code})`));
  });

  function handleFrame(frame: FlutterMachineFrame): void {
    if (typeof frame.id === 'number' && pendingRpc.has(frame.id)) {
      const waiter = pendingRpc.get(frame.id)!;
      pendingRpc.delete(frame.id);
      waiter(frame);
      return;
    }
    if (frame.event === 'app.debugPort') {
      const p = frame.params ?? {};
      const uri = (p as { wsUri?: string }).wsUri;
      if (typeof uri === 'string') vmServiceUri = uri;
      if (typeof (p as { appId?: string }).appId === 'string') {
        appId = (p as { appId: string }).appId;
      }
    } else if (frame.event === 'app.start' || frame.event === 'app.started') {
      const p = frame.params ?? {};
      if (typeof (p as { appId?: string }).appId === 'string') {
        appId = (p as { appId: string }).appId;
      }
      if (frame.event === 'app.started' && vmServiceUri && appId && startedResolve) {
        startedResolve();
        startedResolve = undefined;
        startedReject = undefined;
      }
    } else if (frame.event === 'app.stop') {
      if (startedReject) startedReject(new Error('flutter emitted app.stop before app.started'));
    }
  }

  function sendRpc(method: string, params: Record<string, unknown>): Promise<FlutterMachineFrame> {
    const id = nextRpcId++;
    return new Promise((resolve) => {
      pendingRpc.set(id, resolve);
      child.stdin.write(`${JSON.stringify([{ id, method, params }])}\n`);
    });
  }

  const timeoutMs = opts.startupTimeoutMs ?? 120_000;
  const timer = setTimeout(() => {
    if (startedReject) startedReject(new Error(`flutter run --machine startup timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  try {
    await started;
  } finally {
    clearTimeout(timer);
  }

  if (!vmServiceUri || !appId) {
    throw new Error('flutter daemon started but no VM service URI / appId was reported');
  }

  const server = createServer((socket) => handleControlClient(socket));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.socketPath, () => {
      server.off('error', reject);
      resolve();
    });
  });

  async function handleControlClient(socket: Socket): Promise<void> {
    let buf = '';
    socket.setEncoding('utf8');
    socket.on('data', async (chunk: string) => {
      buf += chunk;
      for (;;) {
        const nl = buf.indexOf('\n');
        if (nl < 0) break;
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as { op: string; params?: Record<string, unknown> };
          const reply = await dispatchControl(msg);
          socket.write(`${JSON.stringify(reply)}\n`);
        } catch (err) {
          socket.write(`${JSON.stringify({ ok: false, error: (err as Error).message })}\n`);
        }
      }
    });
    socket.on('error', () => undefined);
  }

  async function dispatchControl(msg: {
    op: string;
    params?: Record<string, unknown>;
  }): Promise<{ ok: boolean; result?: unknown; error?: string }> {
    switch (msg.op) {
      case 'ping':
        return { ok: true, result: { vmServiceUri, appId } };
      case 'reload': {
        const frame = await sendRpc('app.restart', { appId, fullRestart: false, pause: false });
        if (frame.error) return { ok: false, error: frame.error.message ?? 'reload failed' };
        return { ok: true, result: frame.result };
      }
      case 'restart': {
        const frame = await sendRpc('app.restart', { appId, fullRestart: true, pause: false });
        if (frame.error) return { ok: false, error: frame.error.message ?? 'restart failed' };
        return { ok: true, result: frame.result };
      }
      case 'stop': {
        const frame = await sendRpc('app.stop', { appId });
        setTimeout(() => {
          try {
            server.close();
          } catch {
            // ignore
          }
          try {
            process.exit(0);
          } catch {
            // ignore
          }
        }, 250);
        return { ok: !frame.error, result: frame.result };
      }
      default:
        return { ok: false, error: `unknown op: ${msg.op}` };
    }
  }

  child.unref();
  return {
    pid: child.pid!,
    vmServiceUri,
    appId,
    controlSocketPath: opts.socketPath,
    logPath: opts.logPath,
  };
}

export async function connectControl(socketPath: string, timeoutMs = 2_000): Promise<ControlClient> {
  return new Promise((resolve, reject) => {
    const sock = createConnection(socketPath);
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error(`control socket connect timed out: ${socketPath}`));
    }, timeoutMs);
    sock.once('connect', () => {
      clearTimeout(timer);
      resolve(makeClient(sock));
    });
    sock.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function makeClient(sock: Socket): ControlClient {
  let buf = '';
  const queue: ((reply: { ok: boolean; result?: unknown; error?: string }) => void)[] = [];
  sock.setEncoding('utf8');
  sock.on('data', (chunk: string) => {
    buf += chunk;
    for (;;) {
      const nl = buf.indexOf('\n');
      if (nl < 0) break;
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const waiter = queue.shift();
      if (!waiter) continue;
      try {
        waiter(JSON.parse(line) as { ok: boolean; result?: unknown; error?: string });
      } catch (err) {
        waiter({ ok: false, error: (err as Error).message });
      }
    }
  });
  sock.on('error', () => {
    while (queue.length > 0) queue.shift()!({ ok: false, error: 'control socket error' });
  });
  sock.on('close', () => {
    while (queue.length > 0) queue.shift()!({ ok: false, error: 'control socket closed' });
  });
  return {
    send(op, params) {
      return new Promise((resolve) => {
        queue.push(resolve);
        sock.write(`${JSON.stringify({ op, params: params ?? {} })}\n`);
      });
    },
    close() {
      sock.destroy();
    },
  };
}

export function defaultLauncherPaths(stateDir: string): { socketPath: string; logPath: string } {
  return {
    socketPath: join(stateDir, 'launcher.sock'),
    logPath: join(stateDir, 'launcher.log'),
  };
}

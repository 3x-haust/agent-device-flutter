import { fork } from 'node:child_process';
import { open as openFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { detectFlutterProject } from '../../flutter/detect.js';
import { defaultLauncherPaths } from '../../flutter/launcher.js';
import { allAdapters, getAdapter } from '../../platforms/registry.js';
import { createSession, saveSession, sessionStateFile } from '../../session.js';
import type { DeviceInfo, Platform } from '../../contracts.js';
import type { ParsedCli } from '../parse.js';
import { flagAsString } from './helpers.js';
import type { CommandContext, CommandHandler } from './types.js';

const VALID_PLATFORMS: readonly Platform[] = ['ios', 'android', 'macos', 'linux'];

function isPlatform(value: string): value is Platform {
  return (VALID_PLATFORMS as readonly string[]).includes(value);
}

export const devRunCommand: CommandHandler = {
  name: 'dev-run',
  summary: 'Launch `flutter run --machine` as a detached daemon and open a session.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const [arg] = input.positional;
    const projectArg = arg ?? '.';
    const projectRoot = resolve(projectArg);
    const info = await detectFlutterProject(projectRoot);
    if (!info) {
      ctx.stderr(`dev-run: no Flutter project found at ${projectRoot} (missing or unusable pubspec.yaml).`);
      return 2;
    }

    const entrypoint = flagAsString(input.flags.entrypoint ?? input.flags.t);
    const flavor = flagAsString(input.flags.flavor);
    const platformFlag = flagAsString(input.flags.platform ?? input.flags.p);
    if (platformFlag && !isPlatform(platformFlag)) {
      ctx.stderr(`dev-run: unknown platform "${platformFlag}". Expected: ${VALID_PLATFORMS.join(', ')}`);
      return 2;
    }
    const deviceFlag = flagAsString(input.flags.device ?? input.flags.d);

    const device = await pickDevice(platformFlag as Platform | undefined, deviceFlag);
    if (!device) {
      ctx.stderr('dev-run: no device available — connect a simulator/emulator/device first (see `devices`).');
      return 1;
    }

    const stateDir = dirname(sessionStateFile());
    await mkdir(stateDir, { recursive: true });
    const { socketPath, logPath } = defaultLauncherPaths(stateDir);

    ctx.stdout(`dev-run: launching ${info.name} on ${device.platform} ${device.id} (${device.name})`);
    ctx.stdout(`dev-run: log → ${logPath}`);

    const daemonArgs = {
      projectRoot: info.projectRoot,
      deviceId: device.id,
      socketPath,
      logPath,
      startupTimeoutMs: 180_000,
      ...(entrypoint !== undefined ? { entrypoint } : {}),
      ...(flavor !== undefined ? { flavor } : {}),
    };

    const logFile = await openFile(logPath, 'a');
    const cliPath = process.argv[1];
    if (!cliPath) {
      ctx.stderr('dev-run: cannot locate CLI script path (process.argv[1] empty)');
      return 1;
    }

    const child = fork(cliPath, ['__daemon__', JSON.stringify(daemonArgs)], {
      detached: true,
      stdio: ['ignore', logFile.fd, logFile.fd, 'ipc'],
      env: process.env,
    });

    const ready = await waitForReady(child);
    if (!ready.ok) {
      ctx.stderr(`dev-run: daemon failed to start — ${ready.error}`);
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      return 1;
    }

    child.disconnect();
    child.unref();

    const base = createSession(device);
    const session = {
      ...base,
      vmServiceUri: ready.vmServiceUri,
      launcher: {
        pid: ready.pid,
        controlSocketPath: ready.controlSocketPath,
        logPath: ready.logPath,
        projectRoot: info.projectRoot,
        appId: ready.appId,
        startedAt: Date.now(),
      },
    };
    await saveSession(session);

    ctx.stdout(`dev-run: started pid=${ready.pid} appId=${ready.appId}`);
    ctx.stdout(`vm:       ${ready.vmServiceUri}`);
    ctx.stdout(`session:  ${session.id}`);
    ctx.stdout('run `agent-device-flutter hot-reload` / `hot-restart` / `close` from any shell.');
    return 0;
  },
};

type DaemonReadyMsg = {
  readonly type: 'ready';
  readonly pid: number;
  readonly vmServiceUri: string;
  readonly appId: string;
  readonly controlSocketPath: string;
  readonly logPath: string;
};
type DaemonErrorMsg = { readonly type: 'error'; readonly message: string };
type DaemonMsg = DaemonReadyMsg | DaemonErrorMsg;

function waitForReady(
  child: ReturnType<typeof fork>,
): Promise<{ ok: true } & DaemonReadyMsg | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const onMessage = (msg: DaemonMsg): void => {
      if (msg.type === 'ready') {
        cleanup();
        resolve({ ok: true, ...msg });
      } else if (msg.type === 'error') {
        cleanup();
        resolve({ ok: false, error: msg.message });
      }
    };
    const onExit = (code: number | null): void => {
      cleanup();
      resolve({ ok: false, error: `daemon exited before ready (code=${code ?? 'null'})` });
    };
    const onError = (err: Error): void => {
      cleanup();
      resolve({ ok: false, error: err.message });
    };
    const cleanup = (): void => {
      child.off('message', onMessage as (msg: unknown) => void);
      child.off('exit', onExit);
      child.off('error', onError);
    };
    child.on('message', onMessage as (msg: unknown) => void);
    child.on('exit', onExit);
    child.on('error', onError);
  });
}

async function pickDevice(
  platform: Platform | undefined,
  deviceId: string | undefined,
): Promise<DeviceInfo | null> {
  if (platform) {
    const adapter = getAdapter(platform);
    const devices = await adapter.listDevices();
    if (devices.length === 0) return null;
    if (deviceId) return devices.find((d) => d.id === deviceId) ?? null;
    return devices[0]!;
  }
  const all: DeviceInfo[] = [];
  for (const adapter of allAdapters()) {
    try {
      all.push(...(await adapter.listDevices()));
    } catch {
      // ignore
    }
  }
  if (deviceId) return all.find((d) => d.id === deviceId) ?? null;
  return all[0] ?? null;
}

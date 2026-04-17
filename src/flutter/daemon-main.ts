import { startFlutterDaemon, type LaunchOptions } from './launcher.js';

export interface DaemonArgs {
  readonly projectRoot: string;
  readonly deviceId: string;
  readonly entrypoint?: string;
  readonly flavor?: string;
  readonly socketPath: string;
  readonly logPath: string;
  readonly startupTimeoutMs?: number;
}

export async function runDaemonMain(): Promise<void> {
  const raw = process.argv[3];
  if (!raw) {
    process.stderr.write('daemon: missing args JSON\n');
    process.exit(2);
  }
  const args = JSON.parse(raw) as DaemonArgs;
  const opts: LaunchOptions = {
    projectRoot: args.projectRoot,
    deviceId: args.deviceId,
    socketPath: args.socketPath,
    logPath: args.logPath,
    ...(args.entrypoint !== undefined ? { entrypoint: args.entrypoint } : {}),
    ...(args.flavor !== undefined ? { flavor: args.flavor } : {}),
    ...(args.startupTimeoutMs !== undefined ? { startupTimeoutMs: args.startupTimeoutMs } : {}),
  };
  try {
    const result = await startFlutterDaemon(opts);
    if (process.send) {
      process.send({
        type: 'ready',
        pid: process.pid,
        vmServiceUri: result.vmServiceUri,
        appId: result.appId,
        controlSocketPath: result.controlSocketPath,
        logPath: result.logPath,
      });
      try {
        process.disconnect();
      } catch {
        // ignore
      }
    }
  } catch (err) {
    if (process.send) {
      process.send({ type: 'error', message: (err as Error).message });
      try {
        process.disconnect();
      } catch {
        // ignore
      }
    }
    process.exit(1);
  }
  // Control server + flutter child keep the event loop alive; the `stop`
  // control op calls process.exit. Never resolve so cli.ts doesn't exit us.
  await new Promise<void>(() => {});
}

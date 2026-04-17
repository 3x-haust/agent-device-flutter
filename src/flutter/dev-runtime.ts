import { connectControl } from './launcher.js';
import { FlutterVmClient, firstIsolateId, VmServiceError } from './vm-client.js';

export interface DartVmServiceEndpoint {
  readonly uri: string;
  readonly host: string;
  readonly port: number;
  readonly authCode?: string;
}

export class DevRuntimeUnavailableError extends Error {
  constructor(message = 'Flutter dev-runtime is unavailable in this session.') {
    super(message);
    this.name = 'DevRuntimeUnavailableError';
  }
}

export function parseVmServiceUri(uri: string): DartVmServiceEndpoint {
  let host = 'localhost';
  let port = 0;
  let authCode: string | undefined;
  try {
    const url = new URL(uri);
    host = url.hostname;
    port = url.port ? Number(url.port) : 0;
    const segs = url.pathname.split('/').filter((s) => s.length > 0);
    if (segs.length > 0) authCode = segs[0];
  } catch {
    // ignore malformed URIs — fall through with defaults
  }
  return { uri, host, port, ...(authCode !== undefined ? { authCode } : {}) };
}

export async function discoverVmService(uri: string): Promise<DartVmServiceEndpoint> {
  const endpoint = parseVmServiceUri(uri);
  const client = new FlutterVmClient(uri, { openTimeoutMs: 5_000, rpcTimeoutMs: 5_000 });
  try {
    await client.connect();
    const views = await client.listViews();
    if (views.length === 0) {
      throw new VmServiceError(`no Flutter views attached at ${uri}`);
    }
  } finally {
    client.close();
  }
  return endpoint;
}

export async function triggerHotReload(controlSocketPath: string): Promise<void> {
  const client = await connectControl(controlSocketPath);
  try {
    const reply = await client.send('reload');
    if (!reply.ok) throw new DevRuntimeUnavailableError(reply.error ?? 'hot-reload failed');
  } finally {
    client.close();
  }
}

export async function triggerHotRestart(controlSocketPath: string): Promise<void> {
  const client = await connectControl(controlSocketPath);
  try {
    const reply = await client.send('restart');
    if (!reply.ok) throw new DevRuntimeUnavailableError(reply.error ?? 'hot-restart failed');
  } finally {
    client.close();
  }
}

export async function reloadSourcesDirect(uri: string): Promise<unknown> {
  const client = new FlutterVmClient(uri);
  try {
    await client.connect();
    const isolateId = await firstIsolateId(client);
    return await client.call('reloadSources', { isolateId, force: false, pause: false });
  } finally {
    client.close();
  }
}

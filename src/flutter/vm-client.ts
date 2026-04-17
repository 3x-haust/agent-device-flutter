type Json = string | number | boolean | null | Json[] | { readonly [k: string]: Json };

interface RpcRequest {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly method: string;
  readonly params?: Record<string, Json>;
}

interface RpcSuccess {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly result: Json;
}

interface RpcError {
  readonly jsonrpc: '2.0';
  readonly id: number;
  readonly error: { readonly code: number; readonly message: string; readonly data?: Json };
}

interface RpcEvent {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params: Record<string, Json>;
}

type RpcFrame = RpcSuccess | RpcError | RpcEvent;

export interface FlutterView {
  readonly id: string;
  readonly isolateId: string;
}

export class VmServiceError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: Json,
  ) {
    super(message);
    this.name = 'VmServiceError';
  }
}

export interface VmClientOptions {
  readonly openTimeoutMs?: number;
  readonly rpcTimeoutMs?: number;
}

const DEFAULT_OPEN_TIMEOUT = 10_000;
const DEFAULT_RPC_TIMEOUT = 20_000;

export class FlutterVmClient {
  private ws: globalThis.WebSocket | null = null;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (v: Json) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }
  >();

  constructor(
    readonly uri: string,
    private readonly options: VmClientOptions = {},
  ) {}

  async connect(): Promise<void> {
    if (this.ws) return;
    const openTimeout = this.options.openTimeoutMs ?? DEFAULT_OPEN_TIMEOUT;
    const ws = new globalThis.WebSocket(this.uri);
    this.ws = ws;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.close();
        reject(new VmServiceError(`connect timeout after ${openTimeout}ms: ${this.uri}`));
      }, openTimeout);
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener('error', (ev) => {
        clearTimeout(timer);
        const detail = (ev as unknown as { message?: string }).message ?? 'unknown';
        reject(new VmServiceError(`connect failed: ${detail}`));
      });
      ws.addEventListener('close', () => {
        this.failAll(new VmServiceError('connection closed'));
      });
      ws.addEventListener('message', (ev) => {
        this.onMessage(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer));
      });
    });
  }

  close(): void {
    this.failAll(new VmServiceError('client closed'));
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
  }

  async call(method: string, params: Record<string, Json> = {}): Promise<Json> {
    if (!this.ws) await this.connect();
    const id = this.nextId++;
    const req: RpcRequest = { jsonrpc: '2.0', id, method, params };
    const timeout = this.options.rpcTimeoutMs ?? DEFAULT_RPC_TIMEOUT;
    return new Promise<Json>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new VmServiceError(`rpc timeout: ${method}`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.ws!.send(JSON.stringify(req));
    });
  }

  async listViews(): Promise<readonly FlutterView[]> {
    const out = (await this.call('_flutter.listViews')) as {
      readonly views?: readonly { readonly id: string; readonly isolate?: { readonly id: string } }[];
    };
    return (out.views ?? [])
      .filter((v) => typeof v.isolate?.id === 'string')
      .map((v) => ({ id: v.id, isolateId: v.isolate!.id }));
  }

  async callExtension(extension: string, isolateId: string, params: Record<string, Json> = {}): Promise<Json> {
    return this.call(extension, { isolateId, ...params });
  }

  async evaluateInFrame(isolateId: string, expression: string): Promise<Json> {
    const vm = (await this.call('getVM', {})) as { readonly isolates?: readonly { readonly id: string }[] };
    if (!vm.isolates?.some((i) => i.id === isolateId)) {
      throw new VmServiceError(`unknown isolate: ${isolateId}`);
    }
    return this.call('evaluate', { isolateId, targetId: isolateId, expression });
  }

  private onMessage(raw: string): void {
    let frame: RpcFrame;
    try {
      frame = JSON.parse(raw) as RpcFrame;
    } catch {
      return;
    }
    if ('id' in frame && typeof frame.id === 'number') {
      const slot = this.pending.get(frame.id);
      if (!slot) return;
      clearTimeout(slot.timer);
      this.pending.delete(frame.id);
      if ('error' in frame) {
        slot.reject(new VmServiceError(frame.error.message, frame.error.code, frame.error.data));
      } else {
        slot.resolve(frame.result);
      }
    }
  }

  private failAll(err: Error): void {
    for (const [, slot] of this.pending) {
      clearTimeout(slot.timer);
      slot.reject(err);
    }
    this.pending.clear();
  }
}

export async function firstIsolateId(client: FlutterVmClient): Promise<string> {
  const views = await client.listViews();
  if (views.length === 0) {
    throw new VmServiceError('no Flutter views are attached to this VM service yet');
  }
  return views[0]!.isolateId;
}

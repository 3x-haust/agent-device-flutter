import type {
  FillOptions,
  PressOptions,
  ScrollOptions,
  SessionState,
  SnapshotResult,
} from '../contracts.js';
import type { SnapshotOptions } from '../platforms/types.js';
import {
  enableSemantics,
  fill as fillAction,
  scroll as scrollAction,
  snapshot as snapshotAction,
  tap as tapAction,
  type FlutterSessionContext,
  type TargetSelector,
} from './actions.js';
import { FlutterVmClient, VmServiceError } from './vm-client.js';

export async function snapshotWithSession(
  session: SessionState,
  _options: SnapshotOptions,
): Promise<SnapshotResult> {
  return withClient(session, async (ctx) => snapshotAction(ctx));
}

export async function pressWithSession(session: SessionState, options: PressOptions): Promise<void> {
  return withClient(session, async (ctx) => tapAction(ctx, toSelector(options)));
}

export async function fillWithSession(session: SessionState, options: FillOptions): Promise<void> {
  return withClient(session, async (ctx) =>
    fillAction(ctx, toSelector(options), options.text, options.clear ?? false),
  );
}

export async function scrollWithSession(session: SessionState, options: ScrollOptions): Promise<void> {
  const amount = options.amount ?? 200;
  return withClient(session, async (ctx) => {
    let scope: TargetSelector;
    if (options.scope && hasSelector(options.scope)) {
      scope = toSelector(options.scope);
    } else {
      const snap = await snapshotAction(ctx);
      const rect = snap.root.rect;
      scope = {
        point: {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        },
      };
    }
    return scrollAction(ctx, scope, options.direction, amount);
  });
}

function hasSelector(options: PressOptions): boolean {
  return (
    options.ref !== undefined ||
    options.identifier !== undefined ||
    options.label !== undefined ||
    options.point !== undefined
  );
}

export async function enableSemanticsWithSession(session: SessionState): Promise<void> {
  return withClient(session, async (ctx) => enableSemantics(ctx));
}

export async function pingVmService(uri: string): Promise<void> {
  const client = new FlutterVmClient(uri, { openTimeoutMs: 5_000, rpcTimeoutMs: 5_000 });
  try {
    await client.connect();
    const views = await client.listViews();
    if (views.length === 0) {
      throw new VmServiceError(`VM service at ${uri} has no Flutter views attached`);
    }
  } finally {
    client.close();
  }
}

export function requireVmServiceUri(session: SessionState): string {
  if (!session.vmServiceUri) {
    throw new VmServiceError(
      'session has no VM service URI — open with `dev-run`, or provide `--vm-service <url>` when opening',
    );
  }
  return session.vmServiceUri;
}

async function withClient<T>(
  session: SessionState,
  fn: (ctx: FlutterSessionContext) => Promise<T>,
): Promise<T> {
  const uri = requireVmServiceUri(session);
  const client = new FlutterVmClient(uri);
  try {
    await client.connect();
    return await fn({ client });
  } finally {
    client.close();
  }
}

function toSelector(options: PressOptions): TargetSelector {
  const sel: {
    ref?: string;
    identifier?: string;
    label?: string;
    point?: { x: number; y: number };
  } = {};
  if (options.ref !== undefined) sel.ref = options.ref;
  if (options.identifier !== undefined) sel.identifier = options.identifier;
  if (options.label !== undefined) sel.label = options.label;
  if (options.point !== undefined) sel.point = { x: options.point.x, y: options.point.y };
  return sel;
}

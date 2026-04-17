import { connectControl } from '../../flutter/launcher.js';
import { loadSession } from '../../session.js';
import type { ParsedCli } from '../parse.js';
import type { CommandContext, CommandHandler } from './types.js';

async function sendControlOp(
  op: 'reload' | 'restart',
  ctx: CommandContext,
): Promise<number> {
  const session = await loadSession();
  if (!session) {
    ctx.stderr(`${op === 'reload' ? 'hot-reload' : 'hot-restart'}: no active session. Run \`agent-device-flutter dev-run <project>\` first.`);
    return 1;
  }
  if (!session.launcher) {
    ctx.stderr(`${op === 'reload' ? 'hot-reload' : 'hot-restart'}: session is not managed by dev-run (no launcher daemon).`);
    return 1;
  }
  const client = await connectControl(session.launcher.controlSocketPath).catch((err) => {
    ctx.stderr(`${op}: cannot reach launcher daemon at ${session.launcher!.controlSocketPath} — ${(err as Error).message}`);
    return null;
  });
  if (!client) return 1;
  try {
    const reply = await client.send(op);
    if (!reply.ok) {
      ctx.stderr(`${op} failed: ${reply.error ?? 'unknown'}`);
      return 1;
    }
    ctx.stdout(`${op === 'reload' ? 'hot-reload' : 'hot-restart'}: ok (appId=${session.launcher.appId ?? 'unknown'})`);
    return 0;
  } finally {
    client.close();
  }
}

export const hotReloadCommand: CommandHandler = {
  name: 'hot-reload',
  summary: 'Send a hot-reload (r) to the dev-run daemon.',
  run(_input: ParsedCli, ctx: CommandContext): Promise<number> {
    return sendControlOp('reload', ctx);
  },
};

export const hotRestartCommand: CommandHandler = {
  name: 'hot-restart',
  summary: 'Send a hot-restart (R) to the dev-run daemon.',
  run(_input: ParsedCli, ctx: CommandContext): Promise<number> {
    return sendControlOp('restart', ctx);
  },
};

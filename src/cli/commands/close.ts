import { getAdapter } from '../../platforms/registry.js';
import { clearSession, loadSession } from '../../session.js';
import type { ParsedCli } from '../parse.js';
import type { CommandContext, CommandHandler } from './types.js';

export const closeCommand: CommandHandler = {
  name: 'close',
  summary: 'Close the active session and release the device.',
  async run(_input: ParsedCli, ctx: CommandContext): Promise<number> {
    const session = await loadSession();
    if (!session) {
      ctx.stdout('(no active session)');
      return 0;
    }
    const adapter = getAdapter(session.device.platform);
    try {
      await adapter.close(session);
    } finally {
      await clearSession();
    }
    ctx.stdout(`closed:   ${session.id}`);
    return 0;
  },
};

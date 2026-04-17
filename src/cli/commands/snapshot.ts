import { snapshotWithSession } from '../../flutter/runtime.js';
import { loadSession, saveSession } from '../../session.js';
import type { SnapshotOptions } from '../../platforms/types.js';
import { formatSnapshot } from '../../snapshot/format.js';
import type { ParsedCli } from '../parse.js';
import { flagAsBool, flagAsInt, flagAsString } from './helpers.js';
import type { CommandContext, CommandHandler } from './types.js';

export const snapshotCommand: CommandHandler = {
  name: 'snapshot',
  summary: 'Capture an accessibility snapshot of the current screen.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const session = await loadSession();
    if (!session) {
      ctx.stderr('No active session. Run `agent-device-flutter open <target>` first.');
      return 1;
    }
    const options: SnapshotOptions = buildOptions(input);
    const result = await snapshotWithSession(session, options);

    await saveSession({ ...session, lastSnapshotAt: Date.now() });

    if (input.flags.json) {
      ctx.stdout(JSON.stringify(result, null, 2));
      return 0;
    }
    ctx.stdout(formatSnapshot(result, options));
    return 0;
  },
};

function buildOptions(input: ParsedCli): SnapshotOptions {
  const options: {
    interactive?: boolean;
    compact?: boolean;
    depth?: number;
    scope?: string;
    raw?: boolean;
  } = {};
  if (flagAsBool(input.flags.i ?? input.flags.interactive)) options.interactive = true;
  if (flagAsBool(input.flags.c ?? input.flags.compact)) options.compact = true;
  if (flagAsBool(input.flags.raw)) options.raw = true;
  const depth = flagAsInt(input.flags.d ?? input.flags.depth);
  if (depth !== undefined) options.depth = depth;
  const scope = flagAsString(input.flags.s ?? input.flags.scope);
  if (scope !== undefined) options.scope = scope;
  return options as SnapshotOptions;
}

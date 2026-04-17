import { fillWithSession } from '../../flutter/runtime.js';
import { loadSession } from '../../session.js';
import type { FillOptions } from '../../contracts.js';
import type { ParsedCli } from '../parse.js';
import { flagAsBool } from './helpers.js';
import { parseElementSelector } from './press.js';
import type { CommandContext, CommandHandler } from './types.js';

export const fillCommand: CommandHandler = {
  name: 'fill',
  summary: 'Type text into a text field selected by ref, identifier, or label.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const [target, text] = input.positional;
    if (!target || text === undefined) {
      ctx.stderr('usage: agent-device-flutter fill <selector> "<text>"');
      return 2;
    }
    const session = await loadSession();
    if (!session) {
      ctx.stderr('No active session. Run `agent-device-flutter open <target>` first.');
      return 1;
    }
    const selector = parseElementSelector(target);
    const options: FillOptions = { ...selector, text, clear: flagAsBool(input.flags.clear) };
    await fillWithSession(session, options);
    ctx.stdout(`filled:  ${target} ← ${JSON.stringify(text)}`);
    return 0;
  },
};

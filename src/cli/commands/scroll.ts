import { scrollWithSession } from '../../flutter/runtime.js';
import { loadSession } from '../../session.js';
import type { ScrollDirection, ScrollOptions } from '../../contracts.js';
import type { ParsedCli } from '../parse.js';
import { flagAsInt, flagAsString } from './helpers.js';
import { parseElementSelector } from './press.js';
import type { CommandContext, CommandHandler } from './types.js';

const DIRECTIONS: readonly ScrollDirection[] = ['up', 'down', 'left', 'right'];

function isDirection(value: string): value is ScrollDirection {
  return (DIRECTIONS as readonly string[]).includes(value);
}

export const scrollCommand: CommandHandler = {
  name: 'scroll',
  summary: 'Scroll the current screen or a scoped container.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const [dirArg] = input.positional;
    if (!dirArg || !isDirection(dirArg)) {
      ctx.stderr(`usage: agent-device-flutter scroll <${DIRECTIONS.join('|')}> [--amount N] [--scope <selector>]`);
      return 2;
    }
    const session = await loadSession();
    if (!session) {
      ctx.stderr('No active session. Run `agent-device-flutter open <target>` first.');
      return 1;
    }

    const options: Writable<ScrollOptions> = { direction: dirArg };
    const amount = flagAsInt(input.flags.amount);
    if (amount !== undefined) options.amount = amount;
    const scopeSelector = flagAsString(input.flags.scope);
    if (scopeSelector !== undefined) options.scope = parseElementSelector(scopeSelector);

    await scrollWithSession(session, options as ScrollOptions);
    ctx.stdout(`scrolled: ${dirArg}${amount !== undefined ? ` (amount=${amount})` : ''}`);
    return 0;
  },
};

type Writable<T> = { -readonly [K in keyof T]: T[K] };

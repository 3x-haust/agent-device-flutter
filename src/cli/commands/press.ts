import { pressWithSession } from '../../flutter/runtime.js';
import { loadSession } from '../../session.js';
import type { PressOptions } from '../../contracts.js';
import type { ParsedCli } from '../parse.js';
import type { CommandContext, CommandHandler } from './types.js';

export const pressCommand: CommandHandler = {
  name: 'press',
  summary: 'Press a UI element by ref, identifier, label, or coordinate.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const [target] = input.positional;
    if (!target) {
      ctx.stderr('usage: agent-device-flutter press <@ref | #identifier="..." | #label="...">');
      return 2;
    }
    const session = await loadSession();
    if (!session) {
      ctx.stderr('No active session. Run `agent-device-flutter open <target>` first.');
      return 1;
    }
    const options = parseElementSelector(target);
    await pressWithSession(session, options);
    ctx.stdout(`pressed: ${target}`);
    return 0;
  },
};

export function parseElementSelector(input: string): PressOptions {
  if (input.startsWith('@')) {
    return { ref: input.slice(1) };
  }
  if (input.startsWith('#')) {
    const body = input.slice(1);
    const match = body.match(/^(identifier|label)=(?:"([^"]*)"|'([^']*)'|(.+))$/);
    if (!match) throw new Error(`invalid selector: ${input}`);
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    return key === 'identifier' ? { identifier: value } : { label: value };
  }
  const pointMatch = input.match(/^(\d+),(\d+)$/);
  if (pointMatch) {
    return {
      point: { x: Number(pointMatch[1]), y: Number(pointMatch[2]) },
    };
  }
  throw new Error(`unrecognized selector: ${input}`);
}

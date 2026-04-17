import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseReplayScript } from '../../replay/parser.js';
import { parseArgs } from '../parse.js';
import type { ParsedCli } from '../parse.js';
import { flagAsBool, flagAsInt } from './helpers.js';
import { runCommand } from './registry.js';
import type { CommandContext, CommandHandler } from './types.js';

export const replayCommand: CommandHandler = {
  name: 'replay',
  summary: 'Run a .adf script of commands against the active session.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const [path] = input.positional;
    if (!path) {
      ctx.stderr('usage: agent-device-flutter replay <script.adf> [--retries N] [--dry-run]');
      return 2;
    }
    const retries = Math.max(0, flagAsInt(input.flags.retries) ?? 0);
    const dryRun = flagAsBool(input.flags['dry-run']);
    const absolute = resolve(ctx.cwd, path);
    const source = await readFile(absolute, 'utf8');
    const steps = parseReplayScript(source);

    if (dryRun) {
      for (const step of steps) {
        const args = step.args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ');
        ctx.stdout(`  ${String(step.line).padStart(3, ' ')}  ${step.command}${args ? ' ' + args : ''}`);
      }
      ctx.stdout(`dry-run ok: ${steps.length} step(s)`);
      return 0;
    }

    for (const step of steps) {
      const subInput = parseArgs([step.command, ...step.args]);
      const result = await runWithRetries(() => runCommand(subInput, ctx), retries);
      if (result.code !== 0) {
        ctx.stderr(`line ${step.line}: \`${step.command}\` failed after ${result.attempts} attempt(s)`);
        return result.code;
      }
    }
    ctx.stdout(`replay ok: ${steps.length} step(s)`);
    return 0;
  },
};

async function runWithRetries(
  run: () => Promise<number>,
  retries: number,
): Promise<{ readonly code: number; readonly attempts: number }> {
  let lastCode = 0;
  for (let i = 0; i <= retries; i++) {
    lastCode = await run();
    if (lastCode === 0) return { code: 0, attempts: i + 1 };
  }
  return { code: lastCode, attempts: retries + 1 };
}

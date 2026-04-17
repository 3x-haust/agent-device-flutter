import { closeCommand } from './close.js';
import { detectCommand } from './detect.js';
import { devicesCommand } from './devices.js';
import { devRunCommand } from './dev-run.js';
import { doctorCommand } from './doctor.js';
import { fillCommand } from './fill.js';
import { hotReloadCommand, hotRestartCommand } from './hot-reload.js';
import { openCommand } from './open.js';
import { pressCommand } from './press.js';
import { replayCommand } from './replay.js';
import { scrollCommand } from './scroll.js';
import { snapshotCommand } from './snapshot.js';
import type { CommandContext, CommandHandler } from './types.js';
import type { ParsedCli } from '../parse.js';

export const commands: readonly CommandHandler[] = [
  detectCommand,
  devicesCommand,
  openCommand,
  closeCommand,
  snapshotCommand,
  pressCommand,
  fillCommand,
  scrollCommand,
  doctorCommand,
  replayCommand,
  devRunCommand,
  hotReloadCommand,
  hotRestartCommand,
];

const byName = new Map(commands.map((c) => [c.name, c]));

export function findCommand(name: string): CommandHandler | undefined {
  return byName.get(name);
}

export async function runCommand(input: ParsedCli, ctx: CommandContext): Promise<number> {
  const handler = findCommand(input.command);
  if (!handler) {
    ctx.stderr(`unknown command: ${input.command}`);
    ctx.stderr('run `agent-device-flutter help` to see available commands.');
    return 2;
  }
  return handler.run(input, ctx);
}

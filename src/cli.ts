#!/usr/bin/env node
import { CliParseError, parseArgs } from './cli/parse.js';
import { commands, runCommand } from './cli/commands/registry.js';
import { NotImplementedError } from './platforms/types.js';
import { DevRuntimeUnavailableError } from './flutter/dev-runtime.js';
import { runDaemonMain } from './flutter/daemon-main.js';

const VERSION = '1.0.0';

async function main(): Promise<number> {
  const argv = process.argv.slice(2);

  if (argv[0] === '__daemon__') {
    await runDaemonMain();
    return 0;
  }

  if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') {
    printHelp();
    return 0;
  }
  if (argv[0] === '--version' || argv[0] === '-v' || argv[0] === 'version') {
    console.log(`agent-device-flutter ${VERSION}`);
    return 0;
  }

  let input;
  try {
    input = parseArgs(argv);
  } catch (err) {
    if (err instanceof CliParseError) {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
    throw err;
  }

  const ctx = {
    cwd: process.cwd(),
    stdout: (line: string) => process.stdout.write(`${line}\n`),
    stderr: (line: string) => process.stderr.write(`${line}\n`),
  };

  try {
    return await runCommand(input, ctx);
  } catch (err) {
    if (err instanceof NotImplementedError || err instanceof DevRuntimeUnavailableError) {
      ctx.stderr(err.message);
      return 3;
    }
    ctx.stderr((err as Error).message ?? String(err));
    return 1;
  }
}

function printHelp(): void {
  const lines = [
    `agent-device-flutter ${VERSION}`,
    '',
    'usage: agent-device-flutter <command> [options]',
    '',
    'commands:',
    ...commands.map((c) => `  ${c.name.padEnd(12)} ${c.summary}`),
    '',
    'global options:',
    '  --platform <ios|android|macos|linux>   select target platform',
    '  --device <id>                          select target device by id',
    '  --json                                 emit JSON output where supported',
    '',
    'docs: see README.md, AGENTS.md, CLAUDE.md',
  ];
  for (const line of lines) process.stdout.write(`${line}\n`);
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`${(err as Error).stack ?? err}\n`);
    process.exit(1);
  },
);

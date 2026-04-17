import type { ParsedCli } from '../parse.js';

export interface CommandContext {
  readonly cwd: string;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

export interface CommandHandler {
  readonly name: string;
  readonly summary: string;
  run(input: ParsedCli, ctx: CommandContext): Promise<number>;
}

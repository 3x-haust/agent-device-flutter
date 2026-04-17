export interface ParsedCli {
  readonly command: string;
  readonly positional: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

export class CliParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliParseError';
  }
}

export function parseArgs(argv: readonly string[]): ParsedCli {
  const [command, ...rest] = argv;
  if (!command) throw new CliParseError('no command provided');

  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]!;
    if (token === '--') {
      positional.push(...rest.slice(i + 1));
      break;
    }
    if (token.startsWith('--')) {
      const body = token.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
        continue;
      }
      const next = rest[i + 1];
      if (next === undefined || next.startsWith('-')) {
        flags[body] = true;
      } else {
        flags[body] = next;
        i += 1;
      }
      continue;
    }
    if (token.startsWith('-') && token.length > 1) {
      const body = token.slice(1);
      for (let j = 0; j < body.length; j++) {
        const ch = body[j]!;
        if (j === body.length - 1) {
          const next = rest[i + 1];
          if (next !== undefined && !next.startsWith('-')) {
            flags[ch] = next;
            i += 1;
          } else {
            flags[ch] = true;
          }
        } else {
          flags[ch] = true;
        }
      }
      continue;
    }
    positional.push(token);
  }

  return { command, positional, flags };
}

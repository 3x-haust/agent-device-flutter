export interface ReplayStep {
  readonly line: number;
  readonly command: string;
  readonly args: readonly string[];
}

export class ReplayParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly source: string,
  ) {
    super(`line ${line}: ${message}`);
    this.name = 'ReplayParseError';
  }
}

export function parseReplayScript(source: string): readonly ReplayStep[] {
  const steps: ReplayStep[] = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;

    const tokens = tokenize(trimmed, i + 1, raw);
    const [command, ...args] = tokens;
    if (!command) continue;
    steps.push({ line: i + 1, command, args });
  }
  return steps;
}

function tokenize(line: string, lineNumber: number, source: string): string[] {
  const out: string[] = [];
  let buffer = '';
  let quote: '"' | "'" | null = null;
  let escape = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (escape) {
      buffer += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        buffer += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      if (buffer) {
        out.push(buffer);
        buffer = '';
      }
      continue;
    }
    buffer += ch;
  }
  if (quote) {
    throw new ReplayParseError(`unterminated ${quote} string`, lineNumber, source);
  }
  if (escape) {
    throw new ReplayParseError('trailing backslash', lineNumber, source);
  }
  if (buffer) out.push(buffer);
  return out;
}

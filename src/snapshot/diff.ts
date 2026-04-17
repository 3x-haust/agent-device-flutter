export interface DiffLine {
  readonly kind: '+' | '-' | ' ';
  readonly text: string;
}

export function unifiedDiff(before: string, after: string): readonly DiffLine[] {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const lcs = longestCommonSubsequence(beforeLines, afterLines);
  return buildDiff(beforeLines, afterLines, lcs);
}

export function formatDiff(lines: readonly DiffLine[]): string {
  return lines.map((line) => `${line.kind}${line.text}`).join('\n');
}

function longestCommonSubsequence(a: readonly string[], b: readonly string[]): number[][] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const row = table[i]!;
      if (a[i - 1] === b[j - 1]) {
        row[j] = (table[i - 1]![j - 1] ?? 0) + 1;
      } else {
        row[j] = Math.max(table[i - 1]![j] ?? 0, row[j - 1] ?? 0);
      }
    }
  }
  return table;
}

function buildDiff(a: readonly string[], b: readonly string[], table: number[][]): DiffLine[] {
  const out: DiffLine[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out.unshift({ kind: ' ', text: a[i - 1]! });
      i--;
      j--;
    } else if ((table[i - 1]![j] ?? 0) > (table[i]![j - 1] ?? 0)) {
      out.unshift({ kind: '-', text: a[i - 1]! });
      i--;
    } else {
      out.unshift({ kind: '+', text: b[j - 1]! });
      j--;
    }
  }
  while (i > 0) {
    out.unshift({ kind: '-', text: a[i - 1]! });
    i--;
  }
  while (j > 0) {
    out.unshift({ kind: '+', text: b[j - 1]! });
    j--;
  }
  return out;
}

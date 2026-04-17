import type { SnapshotNode, SnapshotResult } from '../contracts.js';

export interface FormatOptions {
  readonly interactive?: boolean;
  readonly compact?: boolean;
  readonly depth?: number;
}

const INTERACTIVE_ROLES = new Set([
  'Button',
  'TextField',
  'Switch',
  'Slider',
  'Cell',
]);

export function formatSnapshot(result: SnapshotResult, options: FormatOptions = {}): string {
  const header = `Snapshot: ${result.visibleCount} visible nodes (${result.totalCount} total)`;
  const body = renderNode(result.root, 0, options);
  const offscreen = result.offscreenInteractive
    .map((group) => {
      const labels = group.labels.map((l) => JSON.stringify(l)).join(', ');
      const suffix = group.total > group.labels.length ? ` (+${group.total - group.labels.length} more)` : '';
      return `[off-screen ${group.direction}] ${group.total} interactive items: ${labels}${suffix}`;
    })
    .join('\n');
  return [header, body, offscreen].filter(Boolean).join('\n');
}

function renderNode(node: SnapshotNode, depth: number, options: FormatOptions): string {
  if (options.depth !== undefined && depth > options.depth) return '';

  const include = shouldInclude(node, options);
  const lines: string[] = [];
  if (include) {
    const indent = '  '.repeat(depth);
    const roleTag = `[${node.role.toLowerCase()}]`;
    const text = [node.label, node.value].filter(Boolean).join(' ');
    const textPart = text ? ` ${JSON.stringify(text)}` : '';
    lines.push(`${indent}@${node.ref} ${roleTag}${textPart}`);
  }
  for (const child of node.children) {
    const rendered = renderNode(child, include ? depth + 1 : depth, options);
    if (rendered) lines.push(rendered);
  }
  return lines.join('\n');
}

function shouldInclude(node: SnapshotNode, options: FormatOptions): boolean {
  if (options.compact && !node.label && !node.value && node.children.length === 0) return false;
  if (options.interactive) {
    if (INTERACTIVE_ROLES.has(node.role)) return true;
    if (node.role === 'Application' || node.role === 'Window' || node.role === 'NavigationBar') return true;
    if (node.children.some((c) => shouldInclude(c, options))) return true;
    return false;
  }
  return true;
}

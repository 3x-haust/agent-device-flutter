import type { SnapshotNode, SnapshotRect, SnapshotResult, SnapshotRole } from '../contracts.js';

interface RawNode {
  readonly id: number;
  readonly depth: number;
  readonly props: ReadonlyMap<string, string>;
}

const NODE_LINE = /^(.*?)SemanticsNode#(\d+)\s*(.*)$/;
const TREE_CHAR = /[│├└─]/;
const RECT_RE = /Rect\.fromLTRB\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)(?:\s+scaled by ([\d.]+)x)?/;

export function parseSemanticsDump(text: string): SnapshotResult {
  const nodes = scanNodes(text);
  if (nodes.length === 0) {
    return { root: synthRoot(), visibleCount: 0, totalCount: 0, offscreenInteractive: [] };
  }
  const root = buildTree(nodes);
  const [visibleCount, totalCount] = countNodes(root);
  return { root, visibleCount, totalCount, offscreenInteractive: [] };
}

function scanNodes(text: string): RawNode[] {
  const lines = text.split('\n');
  const nodeLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (NODE_LINE.test(lines[i]!)) nodeLineIndices.push(i);
  }
  const out: RawNode[] = [];
  for (let i = 0; i < nodeLineIndices.length; i++) {
    const lineIdx = nodeLineIndices[i]!;
    const nextIdx = nodeLineIndices[i + 1] ?? lines.length;
    const header = lines[lineIdx]!;
    const m = header.match(NODE_LINE)!;
    const prefix = m[1] ?? '';
    const id = Number(m[2]);
    const depth = depthFromPrefix(prefix);
    const inline = m[3] ?? '';
    const propLines: string[] = [];
    if (inline.trim().length > 0) propLines.push(inline.trim());
    for (let j = lineIdx + 1; j < nextIdx; j++) propLines.push(lines[j]!);
    const props = parseProps(propLines);
    out.push({ id, depth, props });
  }
  return out;
}

function depthFromPrefix(prefix: string): number {
  let count = 0;
  for (const ch of prefix) {
    if (ch === ' ' || ch === '\u00A0' || TREE_CHAR.test(ch)) count += 1;
    else break;
  }
  return Math.floor(count / 2);
}

function parseProps(lines: readonly string[]): Map<string, string> {
  const stripped = lines.map(stripTreeChars);
  const baseIndent = minNonBlankIndent(stripped);
  const props = new Map<string, string>();
  let i = 0;
  while (i < stripped.length) {
    const raw = stripped[i]!;
    if (!raw.trim()) {
      i++;
      continue;
    }
    const kv = raw.match(/^(\s*)([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (kv) {
      const key = kv[2]!;
      let value = kv[3]!.trim();
      if (value === '') {
        const parts: string[] = [];
        let j = i + 1;
        while (j < stripped.length) {
          const next = stripped[j]!;
          if (!next.trim()) break;
          const nextIndent = countLead(next);
          if (nextIndent <= baseIndent) break;
          const nkv = next.match(/^(\s*)([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
          if (nkv && countLead(nkv[1]!) <= baseIndent) break;
          parts.push(next.trim());
          j++;
        }
        value = parts.join('\n');
        i = j;
      } else {
        i++;
      }
      if (!props.has(key)) props.set(key, value);
      continue;
    }
    if (!props.has('rect')) {
      const rect = raw.match(RECT_RE);
      if (rect) props.set('rect', `${rect[1]},${rect[2]},${rect[3]},${rect[4]}`);
    }
    i++;
  }
  return props;
}

function stripTreeChars(line: string): string {
  let out = '';
  for (const ch of line) {
    if (TREE_CHAR.test(ch)) out += ' ';
    else out += ch;
  }
  return out;
}

function countLead(s: string): number {
  let n = 0;
  for (const ch of s) {
    if (ch === ' ' || ch === '\u00A0') n++;
    else break;
  }
  return n;
}

function minNonBlankIndent(lines: readonly string[]): number {
  let min = Infinity;
  for (const l of lines) {
    if (!l.trim()) continue;
    const lead = countLead(l);
    if (lead < min) min = lead;
  }
  return Number.isFinite(min) ? min : 0;
}

function buildTree(nodes: readonly RawNode[]): SnapshotNode {
  const stack: { raw: RawNode; children: SnapshotNode[]; originX: number; originY: number }[] = [];
  const roots: SnapshotNode[] = [];
  for (const raw of nodes) {
    while (stack.length > 0 && stack[stack.length - 1]!.raw.depth >= raw.depth) {
      pop();
    }
    const parent = stack[stack.length - 1];
    const local = parseRect(raw.props.get('rect'));
    const originX = (parent?.originX ?? 0) + local.x;
    const originY = (parent?.originY ?? 0) + local.y;
    stack.push({ raw, children: [], originX, originY });
  }
  while (stack.length > 0) pop();

  function pop(): void {
    const frame = stack.pop()!;
    const node = toSnapshotNode(frame.raw, frame.children, frame.originX, frame.originY);
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1]!.children.push(node);
  }

  if (roots.length === 1) return roots[0]!;
  return {
    ref: 'e0',
    role: 'Application',
    type: 'Application',
    rect: { x: 0, y: 0, width: 0, height: 0 },
    enabled: true,
    hittable: false,
    visible: true,
    children: roots,
  };
}

function toSnapshotNode(raw: RawNode, children: SnapshotNode[], globalX = 0, globalY = 0): SnapshotNode {
  const local = parseRect(raw.props.get('rect'));
  const rect: SnapshotRect = { x: globalX, y: globalY, width: local.width, height: local.height };
  const flags = parseList(raw.props.get('flags'));
  const actions = parseList(raw.props.get('actions'));
  const role = deriveRole(flags, actions, raw.props);
  const type = deriveType(flags, actions, role);
  const label = cleanLabel(raw.props.get('label'));
  const value = unquote(raw.props.get('value'));
  const identifier = unquote(raw.props.get('identifier'));
  const enabled = !flags.includes('hasEnabledState') || flags.includes('isEnabled');
  const hittable =
    (actions.includes('tap') || actions.includes('longPress')) && !flags.includes('hidden');
  const visible = !flags.includes('hidden');
  const node: SnapshotNode = {
    ref: `e${raw.id}`,
    role,
    type,
    rect,
    enabled,
    hittable,
    visible,
    children,
    ...(label !== undefined ? { label } : {}),
    ...(value !== undefined ? { value } : {}),
    ...(identifier !== undefined ? { identifier } : {}),
  };
  return node;
}

function parseRect(raw: string | undefined): SnapshotRect {
  if (!raw) return { x: 0, y: 0, width: 0, height: 0 };
  const m = raw.match(/([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)/);
  if (!m) return { x: 0, y: 0, width: 0, height: 0 };
  const l = Number(m[1]);
  const t = Number(m[2]);
  const r = Number(m[3]);
  const b = Number(m[4]);
  if (![l, t, r, b].every(Number.isFinite)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: l, y: t, width: r - l, height: b - t };
}

function parseList(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function cleanLabel(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const unquoted = unquote(trimmed);
  if (unquoted === undefined) return undefined;
  const lines = unquoted.split('\n').map((s) => s.replace(/^\s*"?/, '').replace(/"?\s*$/, '').trim());
  const dedup: string[] = [];
  for (const l of lines) {
    if (!l) continue;
    if (dedup.length > 0 && dedup[dedup.length - 1] === l) continue;
    dedup.push(l);
  }
  return dedup.join(' ') || undefined;
}

function unquote(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function deriveRole(
  flags: readonly string[],
  actions: readonly string[],
  props: ReadonlyMap<string, string>,
): SnapshotRole {
  if (flags.includes('isButton') || flags.includes('isLink')) return 'Button';
  if (flags.includes('isTextField')) return 'TextField';
  if (flags.includes('hasToggledState')) return 'Switch';
  if (flags.includes('isSlider')) return 'Slider';
  if (flags.includes('isImage')) return 'Image';
  if (flags.includes('isHeader')) return 'StaticText';
  if (flags.includes('scopesRoute') || flags.includes('namesRoute')) return 'Window';
  if (actions.includes('tap') || actions.includes('longPress')) return 'Button';
  if (props.has('label') || props.has('value')) return 'StaticText';
  return 'Other';
}

function deriveType(flags: readonly string[], actions: readonly string[], role: SnapshotRole): string {
  if (flags.includes('isTextField')) return 'TextField';
  if (flags.includes('hasToggledState')) return 'Switch';
  if (flags.includes('isButton')) return 'Button';
  if (flags.includes('isImage')) return 'Image';
  if (actions.includes('tap')) return 'Button';
  return role;
}

function countNodes(root: SnapshotNode): [number, number] {
  let visible = 0;
  let total = 0;
  const walk = (n: SnapshotNode): void => {
    total += 1;
    if (n.visible) visible += 1;
    for (const c of n.children) walk(c);
  };
  walk(root);
  return [visible, total];
}

function synthRoot(): SnapshotNode {
  return {
    ref: 'e0',
    role: 'Application',
    type: 'Application',
    rect: { x: 0, y: 0, width: 0, height: 0 },
    enabled: true,
    hittable: false,
    visible: true,
    children: [],
  };
}

export interface Located {
  readonly node: SnapshotNode;
  readonly id: number;
  readonly center: { readonly x: number; readonly y: number };
}

export function findByIdentifier(root: SnapshotNode, identifier: string): Located | null {
  return find(root, (n) => n.identifier === identifier);
}

export function findByLabel(root: SnapshotNode, label: string): Located | null {
  return find(root, (n) => n.label === label);
}

export function findByRef(root: SnapshotNode, ref: string): Located | null {
  return find(root, (n) => n.ref === ref);
}

function find(root: SnapshotNode, match: (n: SnapshotNode) => boolean): Located | null {
  const stack: SnapshotNode[] = [root];
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (match(n)) {
      return {
        node: n,
        id: Number(n.ref.replace(/^e/, '')),
        center: { x: n.rect.x + n.rect.width / 2, y: n.rect.y + n.rect.height / 2 },
      };
    }
    for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
  }
  return null;
}

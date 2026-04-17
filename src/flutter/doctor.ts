import type { SnapshotNode, SnapshotResult } from '../contracts.js';

export interface SemanticsFinding {
  readonly ref: string;
  readonly kind: 'unlabeled-interactive' | 'duplicate-identifier' | 'missing-identifier';
  readonly message: string;
}

export interface DoctorReport {
  readonly totalInteractive: number;
  readonly labeled: number;
  readonly identified: number;
  readonly coverageRatio: number;
  readonly findings: readonly SemanticsFinding[];
}

const INTERACTIVE_ROLES = new Set(['Button', 'TextField', 'Switch', 'Slider', 'Cell']);

export function auditSemantics(result: SnapshotResult): DoctorReport {
  const interactive: SnapshotNode[] = [];
  const seenIdentifiers = new Map<string, SnapshotNode[]>();

  walk(result.root, (node) => {
    if (!INTERACTIVE_ROLES.has(node.role)) return;
    interactive.push(node);
    if (node.identifier) {
      const bucket = seenIdentifiers.get(node.identifier) ?? [];
      bucket.push(node);
      seenIdentifiers.set(node.identifier, bucket);
    }
  });

  const findings: SemanticsFinding[] = [];
  let labeled = 0;
  let identified = 0;

  for (const node of interactive) {
    if (node.label && node.label.trim().length > 0) labeled += 1;
    if (node.identifier) identified += 1;
    if (!node.label && !node.identifier) {
      findings.push({
        ref: node.ref,
        kind: 'unlabeled-interactive',
        message: `${node.role} @${node.ref} has no label or identifier`,
      });
    }
    if (!node.identifier && node.label) {
      findings.push({
        ref: node.ref,
        kind: 'missing-identifier',
        message: `${node.role} @${node.ref} has label but no identifier — consider Semantics(identifier: ...)`,
      });
    }
  }

  for (const [identifier, nodes] of seenIdentifiers) {
    if (nodes.length < 2) continue;
    for (const node of nodes) {
      findings.push({
        ref: node.ref,
        kind: 'duplicate-identifier',
        message: `identifier "${identifier}" is used by ${nodes.length} nodes on this screen`,
      });
    }
  }

  const total = interactive.length;
  return {
    totalInteractive: total,
    labeled,
    identified,
    coverageRatio: total === 0 ? 1 : identified / total,
    findings,
  };
}

function walk(node: SnapshotNode, visit: (node: SnapshotNode) => void): void {
  visit(node);
  for (const child of node.children) walk(child, visit);
}

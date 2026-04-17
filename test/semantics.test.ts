import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findByIdentifier, findByLabel, findByRef, parseSemanticsDump } from '../src/flutter/semantics.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(here, '..', '__fixtures__', 'semantics', 'home.txt');

describe('parseSemanticsDump', () => {
  it('parses the live Home screen fixture into a tree', async () => {
    const raw = await readFile(FIXTURE, 'utf8');
    const snap = parseSemanticsDump(raw);
    expect(snap.totalCount).toBeGreaterThan(0);
    expect(snap.visibleCount).toBeGreaterThan(0);
    expect(snap.root.ref).toBe('e0');
  });

  it('locates interactive buttons by identifier', async () => {
    const raw = await readFile(FIXTURE, 'utf8');
    const snap = parseSemanticsDump(raw);
    const counter = findByIdentifier(snap.root, 'nav-to-counter');
    expect(counter).not.toBeNull();
    expect(counter!.node.role).toBe('Button');
    const signup = findByIdentifier(snap.root, 'nav-to-signup');
    expect(signup).not.toBeNull();
    expect(signup!.node.role).toBe('Button');
  });

  it('produces a finite center point for each matched node', async () => {
    const raw = await readFile(FIXTURE, 'utf8');
    const snap = parseSemanticsDump(raw);
    const counter = findByIdentifier(snap.root, 'nav-to-counter');
    expect(counter).not.toBeNull();
    expect(Number.isFinite(counter!.center.x)).toBe(true);
    expect(Number.isFinite(counter!.center.y)).toBe(true);
    expect(counter!.center.x).toBeGreaterThan(0);
    expect(counter!.center.y).toBeGreaterThan(0);
  });

  it('supports lookup by label and ref', async () => {
    const raw = await readFile(FIXTURE, 'utf8');
    const snap = parseSemanticsDump(raw);
    const byLabel = findByLabel(snap.root, 'Home menu');
    expect(byLabel).not.toBeNull();
    expect(byLabel!.node.identifier).toBe('home-menu');
    const byRef = findByRef(snap.root, byLabel!.node.ref);
    expect(byRef).not.toBeNull();
    expect(byRef!.node).toBe(byLabel!.node);
  });

  it('returns a synthetic application root when input is empty', () => {
    const snap = parseSemanticsDump('');
    expect(snap.totalCount).toBe(0);
    expect(snap.root.role).toBe('Application');
    expect(snap.root.children).toHaveLength(0);
  });

  it('derives roles from semantic flags and actions', () => {
    const dump = [
      'SemanticsNode#0',
      ' │ Rect.fromLTRB(0.0, 0.0, 100.0, 100.0)',
      ' │',
      ' └─SemanticsNode#1',
      '     Rect.fromLTRB(10.0, 10.0, 90.0, 30.0)',
      '     flags: isTextField',
      '     identifier: "email"',
      '     label: "Email"',
      '',
    ].join('\n');
    const snap = parseSemanticsDump(dump);
    const email = findByIdentifier(snap.root, 'email');
    expect(email).not.toBeNull();
    expect(email!.node.role).toBe('TextField');
  });
});

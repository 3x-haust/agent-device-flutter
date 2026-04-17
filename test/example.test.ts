import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { SnapshotNode, SnapshotResult } from '../src/contracts.js';
import { detectFlutterProject } from '../src/flutter/detect.js';
import { auditSemantics } from '../src/flutter/doctor.js';
import { parseReplayScript } from '../src/replay/parser.js';

const here = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_ROOT = join(here, '..', 'example');

function node(
  overrides: Partial<SnapshotNode> & Pick<SnapshotNode, 'ref' | 'role' | 'type'>,
): SnapshotNode {
  return {
    rect: { x: 0, y: 0, width: 0, height: 0 },
    enabled: true,
    hittable: true,
    visible: true,
    children: [],
    ...overrides,
  };
}

describe('example/ Flutter project', () => {
  it('is detected by detectFlutterProject', async () => {
    const info = await detectFlutterProject(EXAMPLE_ROOT);
    expect(info).not.toBeNull();
    expect(info!.name).toBe('agent_device_flutter_example');
    expect(info!.hasIos).toBe(true);
    expect(info!.hasAndroid).toBe(true);
    expect(info!.entrypoints).toContain('lib/main.dart');
  });
});

describe('example/ replay scripts parse cleanly', () => {
  it('counter.adf parses and drives the counter widgets by identifier', async () => {
    const source = await readFile(join(EXAMPLE_ROOT, 'test_flows', 'counter.adf'), 'utf8');
    const steps = parseReplayScript(source);
    const commands = steps.map((s) => s.command);

    expect(commands[0]).toBe('open');
    expect(commands[commands.length - 1]).toBe('close');
    expect(commands.filter((c) => c === 'snapshot').length).toBeGreaterThan(0);

    const identifiers = steps
      .filter((s) => s.command === 'press')
      .flatMap((s) => s.args)
      .filter((a) => a.startsWith('#identifier='));
    expect(identifiers).toContain('#identifier=nav-to-counter');
    expect(identifiers).toContain('#identifier=counter-increment');
    expect(identifiers).toContain('#identifier=counter-decrement');
    expect(identifiers).toContain('#identifier=counter-reset');
  });

  it('signup.adf parses with a fill step for each text field', async () => {
    const source = await readFile(join(EXAMPLE_ROOT, 'test_flows', 'signup.adf'), 'utf8');
    const steps = parseReplayScript(source);

    const fills = steps.filter((s) => s.command === 'fill');
    expect(fills).toHaveLength(2);
    expect(fills[0]!.args[0]).toBe('#identifier=signup-name-field');
    expect(fills[0]!.args[1]).toBe('Ada Lovelace');
    expect(fills[1]!.args[0]).toBe('#identifier=signup-email-field');
    expect(fills[1]!.args[1]).toBe('ada@example.com');

    const pressedIds = steps
      .filter((s) => s.command === 'press')
      .flatMap((s) => s.args)
      .filter((a) => a.startsWith('#identifier='));
    expect(pressedIds).toContain('#identifier=signup-submit');
    expect(pressedIds).toContain('#identifier=signup-marketing-switch');
  });
});

describe('example/ screens produce clean doctor reports', () => {
  it('counter screen reaches 100% Semantics coverage with no findings', () => {
    const counterTree: SnapshotResult = {
      visibleCount: 5,
      totalCount: 5,
      offscreenInteractive: [],
      root: node({
        ref: 'e1',
        role: 'Window',
        type: 'FlutterWindow',
        children: [
          node({
            ref: 'e2',
            role: 'StaticText',
            type: 'Text',
            label: '0',
            identifier: 'counter-value',
            value: '0',
          }),
          node({
            ref: 'e3',
            role: 'Button',
            type: 'IconButton',
            label: 'Decrement',
            identifier: 'counter-decrement',
          }),
          node({
            ref: 'e4',
            role: 'Button',
            type: 'IconButton',
            label: 'Increment',
            identifier: 'counter-increment',
          }),
          node({
            ref: 'e5',
            role: 'Button',
            type: 'TextButton',
            label: 'Reset counter',
            identifier: 'counter-reset',
          }),
        ],
      }),
    };

    const report = auditSemantics(counterTree);
    expect(report.totalInteractive).toBe(3);
    expect(report.identified).toBe(3);
    expect(report.coverageRatio).toBe(1);
    expect(report.findings).toEqual([]);
  });

  it('signup screen reaches 100% Semantics coverage with no findings', () => {
    const signupTree: SnapshotResult = {
      visibleCount: 5,
      totalCount: 5,
      offscreenInteractive: [],
      root: node({
        ref: 'e1',
        role: 'Window',
        type: 'FlutterWindow',
        children: [
          node({
            ref: 'e2',
            role: 'TextField',
            type: 'TextField',
            label: 'Name',
            identifier: 'signup-name-field',
          }),
          node({
            ref: 'e3',
            role: 'TextField',
            type: 'TextField',
            label: 'Email',
            identifier: 'signup-email-field',
          }),
          node({
            ref: 'e4',
            role: 'Switch',
            type: 'SwitchListTile',
            label: 'Marketing opt-in',
            identifier: 'signup-marketing-switch',
          }),
          node({
            ref: 'e5',
            role: 'Button',
            type: 'FilledButton',
            label: 'Submit sign up',
            identifier: 'signup-submit',
          }),
        ],
      }),
    };

    const report = auditSemantics(signupTree);
    expect(report.totalInteractive).toBe(4);
    expect(report.identified).toBe(4);
    expect(report.coverageRatio).toBe(1);
    expect(report.findings).toEqual([]);
  });

  it('flags a regression that drops an identifier', () => {
    const regression: SnapshotResult = {
      visibleCount: 2,
      totalCount: 2,
      offscreenInteractive: [],
      root: node({
        ref: 'e1',
        role: 'Window',
        type: 'FlutterWindow',
        children: [
          node({ ref: 'e2', role: 'Button', type: 'FilledButton', label: 'Submit' }),
        ],
      }),
    };
    const report = auditSemantics(regression);
    expect(report.findings.some((f) => f.kind === 'missing-identifier')).toBe(true);
  });
});

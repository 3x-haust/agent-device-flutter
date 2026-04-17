import type { SnapshotResult } from '../contracts.js';
import { parseSemanticsDump, findByIdentifier, findByLabel, findByRef } from './semantics.js';
import type { Located } from './semantics.js';
import type { FlutterVmClient } from './vm-client.js';
import { VmServiceError, firstIsolateId } from './vm-client.js';

export interface TargetSelector {
  readonly ref?: string;
  readonly identifier?: string;
  readonly label?: string;
  readonly point?: { readonly x: number; readonly y: number };
}

export interface FlutterSessionContext {
  readonly client: FlutterVmClient;
}

export async function enableSemantics(ctx: FlutterSessionContext): Promise<void> {
  const isolateId = await firstIsolateId(ctx.client);
  const rootLib = await rootLibId(ctx, isolateId);
  await ctx.client.call('evaluate', {
    isolateId,
    targetId: rootLib,
    expression: 'WidgetsBinding.instance.ensureSemantics()',
  });
}

export async function snapshot(ctx: FlutterSessionContext): Promise<SnapshotResult> {
  await enableSemantics(ctx);
  const isolateId = await firstIsolateId(ctx.client);
  const text = await dumpSemanticsText(ctx, isolateId);
  return parseSemanticsDump(text);
}

let pointerSeq = 100;
function nextPointerId(): number {
  pointerSeq = pointerSeq + 1;
  return pointerSeq;
}

export async function tap(ctx: FlutterSessionContext, target: TargetSelector): Promise<void> {
  const point = await resolvePoint(ctx, target);
  const isolateId = await firstIsolateId(ctx.client);
  const rootLib = await rootLibId(ctx, isolateId);
  const pid = nextPointerId();
  await evalDart(
    ctx,
    isolateId,
    rootLib,
    `WidgetsBinding.instance.handlePointerEvent(PointerDownEvent(pointer: ${pid}, position: Offset(${point.x}, ${point.y})))`,
  );
  await sleep(30);
  await evalDart(
    ctx,
    isolateId,
    rootLib,
    `WidgetsBinding.instance.handlePointerEvent(PointerUpEvent(pointer: ${pid}, position: Offset(${point.x}, ${point.y})))`,
  );
}

export async function fill(
  ctx: FlutterSessionContext,
  target: TargetSelector,
  text: string,
  clear: boolean,
): Promise<void> {
  await tap(ctx, target);
  await sleep(150);
  const isolateId = await firstIsolateId(ctx.client);
  const rootLib = await rootLibId(ctx, isolateId);
  const escaped = dartString(text);
  const expression = `(() {
    EditableTextState? found;
    void walk(Element el) {
      if (found != null) return;
      if (el is StatefulElement && el.state is EditableTextState) {
        found = el.state as EditableTextState;
        return;
      }
      el.visitChildren(walk);
    }
    final focus = WidgetsBinding.instance.focusManager.primaryFocus;
    final focusEl = focus?.context;
    if (focusEl is Element) {
      focusEl.visitChildren(walk);
      Element? cursor = focusEl;
      while (cursor != null && found == null) {
        cursor.visitChildren(walk);
        Element? parent;
        cursor.visitAncestorElements((a) { parent = a; return false; });
        cursor = parent;
      }
    }
    if (found == null) {
      WidgetsBinding.instance.rootElement?.visitChildren(walk);
    }
    if (found == null) return 'NO_EDITABLE';
    final ctrl = found!.widget.controller;
    final nextText = ${clear ? escaped : `ctrl.text + ${escaped}`};
    ctrl.value = TextEditingValue(
      text: nextText,
      selection: TextSelection.collapsed(offset: nextText.length),
    );
    return 'OK';
  })()`.replace(/\n\s+/g, ' ');
  const result = await evalDart(ctx, isolateId, rootLib, expression);
  const value = (result as { valueAsString?: string }).valueAsString ?? '';
  if (value === 'NO_EDITABLE') {
    throw new VmServiceError('fill: no focused EditableText found after tap');
  }
}

export async function scroll(
  ctx: FlutterSessionContext,
  target: TargetSelector,
  direction: 'up' | 'down' | 'left' | 'right',
  amount: number,
): Promise<void> {
  const start = await resolvePoint(ctx, target);
  const dx = direction === 'left' ? amount : direction === 'right' ? -amount : 0;
  const dy = direction === 'up' ? amount : direction === 'down' ? -amount : 0;
  const isolateId = await firstIsolateId(ctx.client);
  const rootLib = await rootLibId(ctx, isolateId);
  await evalDart(
    ctx,
    isolateId,
    rootLib,
    `WidgetsBinding.instance.handlePointerEvent(PointerDownEvent(pointer: 92, position: Offset(${start.x}, ${start.y})))`,
  );
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = start.x + dx * t;
    const py = start.y + dy * t;
    await evalDart(
      ctx,
      isolateId,
      rootLib,
      `WidgetsBinding.instance.handlePointerEvent(PointerMoveEvent(pointer: 92, position: Offset(${px}, ${py})))`,
    );
    await sleep(8);
  }
  const endX = start.x + dx;
  const endY = start.y + dy;
  await evalDart(
    ctx,
    isolateId,
    rootLib,
    `WidgetsBinding.instance.handlePointerEvent(PointerUpEvent(pointer: 92, position: Offset(${endX}, ${endY})))`,
  );
}

async function resolvePoint(
  ctx: FlutterSessionContext,
  target: TargetSelector,
): Promise<{ readonly x: number; readonly y: number }> {
  if (target.point) return target.point;
  const snap = await snapshot(ctx);
  let match: Located | null = null;
  if (target.ref) match = findByRef(snap.root, target.ref);
  else if (target.identifier) match = findByIdentifier(snap.root, target.identifier);
  else if (target.label) match = findByLabel(snap.root, target.label);
  if (!match) {
    const key = target.ref ?? target.identifier ?? target.label ?? 'unknown';
    throw new VmServiceError(`no snapshot node matched selector: ${key}`);
  }
  return match.center;
}

async function rootLibId(ctx: FlutterSessionContext, isolateId: string): Promise<string> {
  const iso = (await ctx.client.call('getIsolate', { isolateId })) as {
    readonly rootLib?: { readonly id?: string };
  };
  const id = iso.rootLib?.id;
  if (!id) throw new VmServiceError('isolate has no rootLib');
  return id;
}

async function evalDart(
  ctx: FlutterSessionContext,
  isolateId: string,
  targetId: string,
  expression: string,
): Promise<unknown> {
  return ctx.client.call('evaluate', { isolateId, targetId, expression });
}

async function dumpSemanticsText(ctx: FlutterSessionContext, isolateId: string): Promise<string> {
  const resp = (await ctx.client.call('ext.flutter.debugDumpSemanticsTreeInTraversalOrder', {
    isolateId,
  })) as { readonly data?: string };
  return resp.data ?? '';
}

function dartString(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

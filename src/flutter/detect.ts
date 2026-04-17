import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface FlutterProjectInfo {
  readonly projectRoot: string;
  readonly pubspecPath: string;
  readonly name: string;
  readonly version?: string;
  readonly flutterSdkConstraint?: string;
  readonly dartSdkConstraint?: string;
  readonly entrypoints: readonly string[];
  readonly hasIos: boolean;
  readonly hasAndroid: boolean;
  readonly hasMacos: boolean;
  readonly hasLinux: boolean;
  readonly hasWeb: boolean;
  readonly hasWindows: boolean;
}

interface PubspecShape {
  readonly name?: string;
  readonly version?: string;
  readonly environment?: {
    readonly sdk?: string;
    readonly flutter?: string;
  };
  readonly flutter?: unknown;
  readonly dependencies?: Record<string, unknown>;
}

export async function detectFlutterProject(cwd: string): Promise<FlutterProjectInfo | null> {
  const root = await findPubspecRoot(cwd);
  if (!root) return null;
  const pubspecPath = join(root, 'pubspec.yaml');
  const raw = await readFile(pubspecPath, 'utf8');
  const parsed = (parseYaml(raw) ?? {}) as PubspecShape;
  if (!parsed.name) return null;

  const dependsOnFlutter =
    typeof parsed.dependencies === 'object' &&
    parsed.dependencies !== null &&
    Object.prototype.hasOwnProperty.call(parsed.dependencies, 'flutter');
  const hasFlutterSection = parsed.flutter !== undefined;
  if (!dependsOnFlutter && !hasFlutterSection) return null;

  const [hasIos, hasAndroid, hasMacos, hasLinux, hasWeb, hasWindows] = await Promise.all([
    exists(join(root, 'ios')),
    exists(join(root, 'android')),
    exists(join(root, 'macos')),
    exists(join(root, 'linux')),
    exists(join(root, 'web')),
    exists(join(root, 'windows')),
  ]);

  const entrypoints: string[] = [];
  for (const candidate of ['lib/main.dart', 'lib/main_dev.dart', 'lib/main_prod.dart']) {
    if (await exists(join(root, candidate))) entrypoints.push(candidate);
  }

  const info: FlutterProjectInfo = {
    projectRoot: root,
    pubspecPath,
    name: parsed.name,
    entrypoints,
    hasIos,
    hasAndroid,
    hasMacos,
    hasLinux,
    hasWeb,
    hasWindows,
    ...(parsed.version !== undefined ? { version: parsed.version } : {}),
    ...(parsed.environment?.flutter !== undefined
      ? { flutterSdkConstraint: parsed.environment.flutter }
      : {}),
    ...(parsed.environment?.sdk !== undefined
      ? { dartSdkConstraint: parsed.environment.sdk }
      : {}),
  };
  return info;
}

async function findPubspecRoot(start: string): Promise<string | null> {
  let current = isAbsolute(start) ? start : resolve(start);
  while (true) {
    if (await exists(join(current, 'pubspec.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await (await import('node:fs/promises')).access(path);
    return true;
  } catch {
    return false;
  }
}

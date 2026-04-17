import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectFlutterProject } from '../src/flutter/detect.js';

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE = join(here, '..', '__fixtures__', 'sample_app');

describe('detectFlutterProject', () => {
  it('reads pubspec.yaml in the given directory', async () => {
    const info = await detectFlutterProject(SAMPLE);
    expect(info).not.toBeNull();
    expect(info!.name).toBe('sample_app');
    expect(info!.version).toBe('1.2.3+4');
    expect(info!.flutterSdkConstraint).toBe('>=3.22.0');
    expect(info!.dartSdkConstraint).toBe('>=3.4.0 <4.0.0');
    expect(info!.hasIos).toBe(true);
    expect(info!.hasAndroid).toBe(true);
    expect(info!.hasWeb).toBe(false);
    expect(info!.entrypoints).toContain('lib/main.dart');
  });

  it('walks upward from a subdirectory', async () => {
    const info = await detectFlutterProject(join(SAMPLE, 'lib'));
    expect(info?.name).toBe('sample_app');
  });

  it('returns null outside a Flutter project', async () => {
    const info = await detectFlutterProject('/');
    expect(info).toBeNull();
  });
});

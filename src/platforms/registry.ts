import type { Platform } from '../contracts.js';
import { AndroidAdapter } from './android/adapter.js';
import { IosAdapter } from './ios/adapter.js';
import { LinuxAdapter } from './linux/adapter.js';
import { MacosAdapter } from './macos/adapter.js';
import type { PlatformAdapter } from './types.js';

const adapters = new Map<Platform, PlatformAdapter>([
  ['ios', new IosAdapter()],
  ['android', new AndroidAdapter()],
  ['macos', new MacosAdapter()],
  ['linux', new LinuxAdapter()],
]);

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters.get(platform);
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter;
}

export function allAdapters(): readonly PlatformAdapter[] {
  return [...adapters.values()];
}

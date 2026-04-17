import type { DeviceInfo, Platform } from '../../contracts.js';
import { allAdapters, getAdapter } from '../../platforms/registry.js';
import type { ParsedCli } from '../parse.js';

const VALID_PLATFORMS: readonly Platform[] = ['ios', 'android', 'macos', 'linux'];

function isPlatform(value: string): value is Platform {
  return (VALID_PLATFORMS as readonly string[]).includes(value);
}

export async function resolveDevice(input: ParsedCli): Promise<DeviceInfo> {
  const platformFlag = flagAsString(input.flags.platform ?? input.flags.p);
  const idFlag = flagAsString(input.flags.device ?? input.flags.d);

  if (platformFlag) {
    if (!isPlatform(platformFlag)) {
      throw new Error(`Unknown platform "${platformFlag}". Expected one of: ${VALID_PLATFORMS.join(', ')}`);
    }
    const adapter = getAdapter(platformFlag);
    const devices = await adapter.listDevices();
    if (devices.length === 0) {
      throw new Error(`No ${platformFlag} devices available. Run \`agent-device-flutter devices\` to inspect.`);
    }
    if (idFlag) {
      const match = devices.find((d) => d.id === idFlag);
      if (!match) throw new Error(`No ${platformFlag} device with id "${idFlag}".`);
      return match;
    }
    return devices[0]!;
  }

  const all: DeviceInfo[] = [];
  for (const adapter of allAdapters()) {
    try {
      all.push(...(await adapter.listDevices()));
    } catch {
      // ignore — device probing best-effort
    }
  }
  if (idFlag) {
    const match = all.find((d) => d.id === idFlag);
    if (!match) throw new Error(`No device with id "${idFlag}".`);
    return match;
  }
  if (all.length === 0) {
    throw new Error('No devices available. Connect a device or start a simulator/emulator first.');
  }
  if (all.length > 1) {
    throw new Error(
      `Multiple devices available — pick one with --platform and/or --device. Run \`agent-device-flutter devices\` to list.`,
    );
  }
  return all[0]!;
}

export function flagAsString(value: string | boolean | undefined): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

export function flagAsInt(value: string | boolean | undefined): number | undefined {
  const str = flagAsString(value);
  if (str === undefined) return undefined;
  const n = Number.parseInt(str, 10);
  if (!Number.isFinite(n)) throw new Error(`Expected integer, got "${str}"`);
  return n;
}

export function flagAsBool(value: string | boolean | undefined): boolean {
  return value === true || value === 'true' || value === '1';
}

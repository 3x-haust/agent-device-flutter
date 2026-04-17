import type { DeviceInfo, SessionState } from '../../contracts.js';
import { exec } from '../../utils/exec.js';
import { attachOpen, sharedClose } from '../shared.js';
import type { OpenInputs, OpenResult, PlatformAdapter } from '../types.js';

interface SimctlDeviceEntry {
  readonly udid: string;
  readonly name: string;
  readonly state: string;
  readonly isAvailable?: boolean;
}

interface SimctlListJson {
  readonly devices: Record<string, readonly SimctlDeviceEntry[]>;
}

export class IosAdapter implements PlatformAdapter {
  readonly platform = 'ios' as const;

  async listDevices(): Promise<readonly DeviceInfo[]> {
    if (process.platform !== 'darwin') return [];
    const { stdout, code } = await exec('xcrun', ['simctl', 'list', 'devices', '--json']);
    if (code !== 0) return [];
    const parsed = JSON.parse(stdout) as SimctlListJson;
    const out: DeviceInfo[] = [];
    for (const [runtime, devices] of Object.entries(parsed.devices)) {
      const osVersion = runtime.replace(/^com\.apple\.CoreSimulator\.SimRuntime\./, '');
      for (const device of devices) {
        if (device.isAvailable === false) continue;
        out.push({
          platform: 'ios',
          kind: 'simulator',
          id: device.udid,
          name: device.name,
          osVersion,
        });
      }
    }
    return out;
  }

  async open(inputs: OpenInputs): Promise<OpenResult> {
    return attachOpen('IosAdapter', inputs);
  }

  async close(session: SessionState): Promise<void> {
    await sharedClose(session);
  }
}

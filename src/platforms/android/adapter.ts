import type { DeviceInfo, SessionState } from '../../contracts.js';
import { exec } from '../../utils/exec.js';
import { attachOpen, sharedClose } from '../shared.js';
import type { OpenInputs, OpenResult, PlatformAdapter } from '../types.js';

export class AndroidAdapter implements PlatformAdapter {
  readonly platform = 'android' as const;

  async listDevices(): Promise<readonly DeviceInfo[]> {
    const { stdout, code } = await exec('adb', ['devices']);
    if (code !== 0) return [];
    const out: DeviceInfo[] = [];
    for (const line of stdout.split('\n').slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [id, state] = trimmed.split(/\s+/);
      if (!id || state !== 'device') continue;
      out.push({
        platform: 'android',
        kind: id.startsWith('emulator-') ? 'emulator' : 'physical',
        id,
        name: id,
      });
    }
    return out;
  }

  async open(inputs: OpenInputs): Promise<OpenResult> {
    return attachOpen('AndroidAdapter', inputs);
  }

  async close(session: SessionState): Promise<void> {
    await sharedClose(session);
  }
}

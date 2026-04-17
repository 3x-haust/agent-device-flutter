import { hostname } from 'node:os';
import type { DeviceInfo, SessionState } from '../../contracts.js';
import { attachOpen, sharedClose } from '../shared.js';
import type { OpenInputs, OpenResult, PlatformAdapter } from '../types.js';

export class LinuxAdapter implements PlatformAdapter {
  readonly platform = 'linux' as const;

  async listDevices(): Promise<readonly DeviceInfo[]> {
    if (process.platform !== 'linux') return [];
    return [
      {
        platform: 'linux',
        kind: 'physical',
        id: 'localhost',
        name: hostname(),
      },
    ];
  }

  async open(inputs: OpenInputs): Promise<OpenResult> {
    return attachOpen('LinuxAdapter', inputs);
  }

  async close(session: SessionState): Promise<void> {
    await sharedClose(session);
  }
}

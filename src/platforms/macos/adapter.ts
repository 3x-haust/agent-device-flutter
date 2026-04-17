import { hostname } from 'node:os';
import type { DeviceInfo, SessionState } from '../../contracts.js';
import { attachOpen, sharedClose } from '../shared.js';
import type { OpenInputs, OpenResult, PlatformAdapter } from '../types.js';

export class MacosAdapter implements PlatformAdapter {
  readonly platform = 'macos' as const;

  async listDevices(): Promise<readonly DeviceInfo[]> {
    if (process.platform !== 'darwin') return [];
    return [
      {
        platform: 'macos',
        kind: 'physical',
        id: 'localhost',
        name: hostname(),
      },
    ];
  }

  async open(inputs: OpenInputs): Promise<OpenResult> {
    return attachOpen('MacosAdapter', inputs);
  }

  async close(session: SessionState): Promise<void> {
    await sharedClose(session);
  }
}

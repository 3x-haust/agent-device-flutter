import type { DeviceInfo, OpenTarget, SessionState } from '../contracts.js';

export interface SnapshotOptions {
  readonly interactive?: boolean;
  readonly compact?: boolean;
  readonly depth?: number;
  readonly scope?: string;
  readonly raw?: boolean;
}

export interface OpenResult {
  readonly vmServiceUri?: string;
  readonly launcher?: SessionState['launcher'];
  readonly message?: string;
}

export interface OpenInputs {
  readonly device: DeviceInfo;
  readonly target: OpenTarget;
  readonly vmServiceUri?: string;
  readonly projectRoot?: string;
  readonly deviceName?: string;
}

export interface PlatformAdapter {
  readonly platform: DeviceInfo['platform'];
  listDevices(): Promise<readonly DeviceInfo[]>;
  open(inputs: OpenInputs): Promise<OpenResult>;
  close(session: SessionState): Promise<void>;
}

export class NotImplementedError extends Error {
  constructor(adapter: string, op: string) {
    super(`${adapter}: ${op} is not implemented yet. See CHANGELOG.md roadmap.`);
    this.name = 'NotImplementedError';
  }
}

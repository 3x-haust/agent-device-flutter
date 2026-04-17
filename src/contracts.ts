export type Platform = 'ios' | 'android' | 'macos' | 'linux';

export type DeviceKind = 'simulator' | 'emulator' | 'physical';

export interface DeviceInfo {
  readonly platform: Platform;
  readonly kind: DeviceKind;
  readonly id: string;
  readonly name: string;
  readonly osVersion?: string;
}

export type SnapshotRole =
  | 'Application'
  | 'Window'
  | 'Button'
  | 'StaticText'
  | 'TextField'
  | 'Image'
  | 'Switch'
  | 'Slider'
  | 'Cell'
  | 'NavigationBar'
  | 'Other';

export interface SnapshotRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SnapshotNode {
  readonly ref: string;
  readonly role: SnapshotRole;
  readonly type: string;
  readonly label?: string;
  readonly value?: string;
  readonly identifier?: string;
  readonly rect: SnapshotRect;
  readonly enabled: boolean;
  readonly hittable: boolean;
  readonly visible: boolean;
  readonly children: readonly SnapshotNode[];
}

export interface SnapshotResult {
  readonly root: SnapshotNode;
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly offscreenInteractive: readonly {
    readonly direction: 'above' | 'below' | 'left' | 'right';
    readonly labels: readonly string[];
    readonly total: number;
  }[];
}

export interface SessionState {
  readonly id: string;
  readonly device: DeviceInfo;
  readonly openedAt: number;
  readonly lastSnapshotAt?: number;
  readonly vmServiceUri?: string;
  readonly launcher?: LauncherState;
}

export interface LauncherState {
  readonly pid: number;
  readonly controlSocketPath: string;
  readonly logPath: string;
  readonly projectRoot: string;
  readonly appId?: string;
  readonly startedAt: number;
}

export type OpenTarget =
  | { readonly kind: 'bundle-id'; readonly value: string }
  | { readonly kind: 'package'; readonly value: string }
  | { readonly kind: 'local-path'; readonly path: string }
  | { readonly kind: 'url'; readonly url: string };

export interface PressOptions {
  readonly ref?: string;
  readonly identifier?: string;
  readonly label?: string;
  readonly point?: { readonly x: number; readonly y: number };
}

export interface FillOptions extends PressOptions {
  readonly text: string;
  readonly clear?: boolean;
}

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export interface ScrollOptions {
  readonly direction: ScrollDirection;
  readonly amount?: number;
  readonly scope?: PressOptions;
}

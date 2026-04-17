import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { DeviceInfo, SessionState } from './contracts.js';

const STATE_DIR = process.env.AGENT_DEVICE_FLUTTER_STATE_DIR ?? join(homedir(), '.agent-device-flutter');
const SESSION_FILE = join(STATE_DIR, 'session.json');

export async function saveSession(state: SessionState): Promise<void> {
  await mkdir(dirname(SESSION_FILE), { recursive: true });
  await writeFile(SESSION_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export async function loadSession(): Promise<SessionState | null> {
  try {
    const raw = await readFile(SESSION_FILE, 'utf8');
    return JSON.parse(raw) as SessionState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await rm(SESSION_FILE, { force: true });
  } catch {
    // ignore
  }
}

export function createSession(device: DeviceInfo): SessionState {
  return {
    id: `${device.platform}-${device.id}-${Date.now()}`,
    device,
    openedAt: Date.now(),
  };
}

export function sessionStateFile(): string {
  return SESSION_FILE;
}

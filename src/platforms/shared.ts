import type { SessionState } from '../contracts.js';
import { connectControl } from '../flutter/launcher.js';
import { pingVmService } from '../flutter/runtime.js';
import type { OpenInputs, OpenResult } from './types.js';

export async function attachOpen(platformLabel: string, inputs: OpenInputs): Promise<OpenResult> {
  const uri = resolveVmUri(inputs);
  if (!uri) {
    throw new Error(
      `${platformLabel}: \`open\` requires a VM service URI. ` +
        `Either pass one as \`ws://…/ws\` (or \`http://…\` form), or run \`agent-device-flutter dev-run <project>\` to launch a debug build and open automatically.`,
    );
  }
  await pingVmService(uri);
  return { vmServiceUri: uri, message: `attached to VM service ${uri}` };
}

export async function sharedClose(session: SessionState): Promise<void> {
  const { launcher } = session;
  if (!launcher) return;
  try {
    const client = await connectControl(launcher.controlSocketPath, 2_000);
    try {
      await client.send('stop');
    } finally {
      client.close();
    }
  } catch {
    // control socket gone; try to signal directly
  }
  try {
    process.kill(launcher.pid, 'SIGTERM');
  } catch {
    // already dead
  }
}

function resolveVmUri(inputs: OpenInputs): string | undefined {
  if (inputs.vmServiceUri) return inputs.vmServiceUri;
  if (inputs.target.kind === 'url' && isVmUri(inputs.target.url)) return inputs.target.url;
  return undefined;
}

function isVmUri(uri: string): boolean {
  return /^(ws|wss|http|https):\/\//.test(uri);
}

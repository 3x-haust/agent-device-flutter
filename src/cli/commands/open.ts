import { classifyOpenTarget } from '../../core/open-target.js';
import { getAdapter } from '../../platforms/registry.js';
import { createSession, saveSession } from '../../session.js';
import type { ParsedCli } from '../parse.js';
import { flagAsString, resolveDevice } from './helpers.js';
import type { CommandContext, CommandHandler } from './types.js';

export const openCommand: CommandHandler = {
  name: 'open',
  summary: 'Open an app on the selected device and start a session.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const [targetArg] = input.positional;
    const vmFlag = flagAsString(input.flags['vm-service']);
    if (!targetArg && !vmFlag) {
      ctx.stderr('usage: agent-device-flutter open <ws://…/ws | app-path> [--vm-service <url>]');
      return 2;
    }
    const target = classifyOpenTarget(targetArg ?? (vmFlag as string));
    const device = await resolveDevice(input);
    const adapter = getAdapter(device.platform);
    const result = await adapter.open({
      device,
      target,
      ...(vmFlag !== undefined ? { vmServiceUri: vmFlag } : {}),
    });
    const base = createSession(device);
    const session = {
      ...base,
      ...(result.vmServiceUri !== undefined ? { vmServiceUri: result.vmServiceUri } : {}),
      ...(result.launcher !== undefined ? { launcher: result.launcher } : {}),
    };
    await saveSession(session);
    ctx.stdout(`session:  ${session.id}`);
    ctx.stdout(`device:   ${device.platform} ${device.kind} ${device.id}`);
    if (session.vmServiceUri) ctx.stdout(`vm:       ${session.vmServiceUri}`);
    if (result.message) ctx.stdout(`status:   ${result.message}`);
    ctx.stdout(`target:   ${target.kind}=${formatTarget(target)}`);
    return 0;
  },
};

function formatTarget(t: ReturnType<typeof classifyOpenTarget>): string {
  switch (t.kind) {
    case 'url':
      return t.url;
    case 'local-path':
      return t.path;
    case 'bundle-id':
    case 'package':
      return t.value;
  }
}

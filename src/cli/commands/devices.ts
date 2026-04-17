import { allAdapters } from '../../platforms/registry.js';
import type { CommandContext, CommandHandler } from './types.js';
import type { ParsedCli } from '../parse.js';
import type { DeviceInfo } from '../../contracts.js';

export const devicesCommand: CommandHandler = {
  name: 'devices',
  summary: 'List connected simulators, emulators, and physical devices.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const all: DeviceInfo[] = [];
    for (const adapter of allAdapters()) {
      try {
        const devices = await adapter.listDevices();
        all.push(...devices);
      } catch (err) {
        ctx.stderr(`${adapter.platform}: ${(err as Error).message}`);
      }
    }

    if (input.flags.json) {
      ctx.stdout(JSON.stringify(all, null, 2));
      return 0;
    }

    if (all.length === 0) {
      ctx.stdout('(no devices)');
      return 0;
    }

    for (const d of all) {
      const os = d.osVersion ? ` [${d.osVersion}]` : '';
      ctx.stdout(`${d.platform.padEnd(8)} ${d.kind.padEnd(10)} ${d.id.padEnd(40)} ${d.name}${os}`);
    }
    return 0;
  },
};

import { auditSemantics } from '../../flutter/doctor.js';
import { snapshotWithSession } from '../../flutter/runtime.js';
import { loadSession } from '../../session.js';
import type { ParsedCli } from '../parse.js';
import type { CommandContext, CommandHandler } from './types.js';

export const doctorCommand: CommandHandler = {
  name: 'doctor',
  summary: 'Audit Semantics coverage on the current screen.',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const session = await loadSession();
    if (!session) {
      ctx.stderr('No active session. Run `agent-device-flutter open <target>` first.');
      return 1;
    }
    const snapshot = await snapshotWithSession(session, { interactive: true });
    const report = auditSemantics(snapshot);

    if (input.flags.json) {
      ctx.stdout(JSON.stringify(report, null, 2));
      return report.findings.length === 0 ? 0 : 1;
    }

    ctx.stdout(`interactive nodes: ${report.totalInteractive}`);
    ctx.stdout(`labeled:           ${report.labeled}`);
    ctx.stdout(`identified:        ${report.identified}`);
    ctx.stdout(`coverage:          ${(report.coverageRatio * 100).toFixed(1)}%`);
    if (report.findings.length === 0) {
      ctx.stdout('findings:          none — Semantics coverage looks healthy.');
      return 0;
    }
    ctx.stdout('findings:');
    for (const f of report.findings) ctx.stdout(`  - [${f.kind}] ${f.message}`);
    return 1;
  },
};

import { detectFlutterProject } from '../../flutter/detect.js';
import type { CommandContext, CommandHandler } from './types.js';
import type { ParsedCli } from '../parse.js';

export const detectCommand: CommandHandler = {
  name: 'detect',
  summary: 'Detect Flutter project in the current directory (reads pubspec.yaml).',
  async run(input: ParsedCli, ctx: CommandContext): Promise<number> {
    const info = await detectFlutterProject(ctx.cwd);
    if (!info) {
      ctx.stderr('No Flutter project detected (no pubspec.yaml with Flutter dependency).');
      return 1;
    }

    if (input.flags.json) {
      ctx.stdout(JSON.stringify(info, null, 2));
      return 0;
    }

    const platforms = [
      info.hasIos && 'ios',
      info.hasAndroid && 'android',
      info.hasMacos && 'macos',
      info.hasLinux && 'linux',
      info.hasWeb && 'web',
      info.hasWindows && 'windows',
    ]
      .filter(Boolean)
      .join(', ');

    ctx.stdout(`name:        ${info.name}`);
    if (info.version) ctx.stdout(`version:     ${info.version}`);
    ctx.stdout(`root:        ${info.projectRoot}`);
    if (info.flutterSdkConstraint) ctx.stdout(`flutter SDK: ${info.flutterSdkConstraint}`);
    if (info.dartSdkConstraint) ctx.stdout(`dart SDK:    ${info.dartSdkConstraint}`);
    ctx.stdout(`platforms:   ${platforms || '(none)'}`);
    ctx.stdout(`entrypoints: ${info.entrypoints.join(', ') || '(none found)'}`);
    return 0;
  },
};

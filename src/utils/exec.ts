import { spawn } from 'node:child_process';

export interface ExecResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
}

export interface ExecOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly timeoutMs?: number;
  readonly input?: string;
}

export async function exec(
  command: string,
  args: readonly string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill('SIGKILL');
        }, options.timeoutMs)
      : undefined;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`${command} timed out after ${options.timeoutMs}ms`));
        return;
      }
      resolve({ stdout, stderr, code: code ?? -1 });
    });

    if (options.input !== undefined) {
      child.stdin.end(options.input);
    } else {
      child.stdin.end();
    }
  });
}

export async function execOrThrow(
  command: string,
  args: readonly string[],
  options: ExecOptions = {},
): Promise<string> {
  const { stdout, stderr, code } = await exec(command, args, options);
  if (code !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited ${code}: ${stderr.trim() || stdout.trim()}`);
  }
  return stdout;
}

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BYO_AGENT_IDS,
  BYO_AGENTS,
  assertByoReady,
  buildByoPrompt,
  buildChatArgs,
  extractAssistantText,
  failClosedMessage,
  interpretStatusProbe,
  redactSecrets,
  type ByoAgentId,
  type ByoAgentStatus,
  type CommandResult,
} from '../../shared/byo-agents';
import { getVaultRoot } from './file-system';

const STATUS_TIMEOUT_MS = 15_000;
const CHAT_TIMEOUT_MS = 180_000;

const ENV_SECRETS_TO_STRIP = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'XAI_API_KEY',
  'GOOGLE_API_KEY',
  'CODEX_API_KEY',
  'CLAUDE_CODE_OAUTH_TOKEN',
];

export interface ByoChatRequest {
  messages: { role: string; content: string }[];
  provider: ByoAgentId;
  systemPrompt?: string;
}

export interface ByoChatResult {
  message: string;
  toolCalls: { name: string; args: Record<string, string>; result: string }[];
}

export async function getByoAgentStatuses(): Promise<ByoAgentStatus[]> {
  const statuses: ByoAgentStatus[] = [];
  for (const id of BYO_AGENT_IDS) {
    statuses.push(await getByoAgentStatus(id));
  }
  return statuses;
}

export async function getByoAgentStatus(id: ByoAgentId): Promise<ByoAgentStatus> {
  const def = BYO_AGENTS[id];
  const resolvedPath = await resolveBinary(def.binary);
  if (!resolvedPath) {
    const probe = interpretStatusProbe({ id, installed: false, result: null });
    return {
      id,
      label: def.label,
      binary: def.binary,
      installed: false,
      signedIn: false,
      resolvedPath: null,
      detail: probe.detail,
    };
  }

  const result = await runCommand({
    command: resolvedPath,
    args: def.statusArgs,
    timeoutMs: STATUS_TIMEOUT_MS,
    env: sanitizedEnv(),
  }).catch((error): CommandResult => ({
    exitCode: 1,
    stdout: '',
    stderr: error instanceof Error ? error.message : String(error),
  }));

  const probe = interpretStatusProbe({ id, installed: true, result });
  return {
    id,
    label: def.label,
    binary: def.binary,
    installed: true,
    signedIn: probe.signedIn,
    resolvedPath,
    detail: probe.detail,
  };
}

export async function startByoAgentLogin(id: ByoAgentId): Promise<{ started: boolean; detail: string }> {
  const def = BYO_AGENTS[id];
  const resolvedPath = await resolveBinary(def.binary);
  if (!resolvedPath) {
    return {
      started: false,
      detail: failClosedMessage({
        id,
        label: def.label,
        binary: def.binary,
        installed: false,
        signedIn: false,
        resolvedPath: null,
        detail: `${def.label} CLI was not found on PATH.`,
      }),
    };
  }

  try {
    const detail = await launchLogin(resolvedPath, def.loginArgs);
    return { started: true, detail };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      started: false,
      detail:
        `Could not start ${def.loginCommand}. Run it in a terminal, then Recheck. ` +
        redactSecrets(message),
    };
  }
}

export async function handleByoChat(opts: ByoChatRequest): Promise<ByoChatResult> {
  const status = await getByoAgentStatus(opts.provider);
  assertByoReady(status);

  const vaultRoot = getVaultRoot();
  if (!vaultRoot) {
    throw new Error('No vault is open. Open a vault before chatting with a bring-your-own agent.');
  }

  const prompt = buildByoPrompt({
    systemPrompt: opts.systemPrompt ?? '',
    messages: opts.messages,
  });
  const args = buildChatArgs({ id: opts.provider, prompt, vaultRoot });
  const binary = status.resolvedPath;
  if (!binary) {
    throw new Error(failClosedMessage(status));
  }

  const result = await runCommand({
    command: binary,
    args,
    cwd: vaultRoot,
    timeoutMs: CHAT_TIMEOUT_MS,
    env: sanitizedEnv(),
  });

  const combined = redactSecrets(`${result.stdout}\n${result.stderr}`.trim());
  if (result.exitCode !== 0) {
    throw new Error(
      `${status.label} refused the request (exit ${result.exitCode}). ` +
        `If you are logged out, sign in again. Traces will not fall back to another provider. ` +
        (combined ? redactSecrets(combined) : ''),
    );
  }

  const message = extractAssistantText(result.stdout).trim();
  if (!message) {
    throw new Error(
      `${status.label} returned no text. If the CLI is logged out or blocked, sign in again. ` +
        'Traces will not fall back to another provider.',
    );
  }

  return { message, toolCalls: [] };
}

function sanitizedEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of ENV_SECRETS_TO_STRIP) delete env[key];
  return env;
}

async function resolveBinary(name: string): Promise<string | null> {
  const fromShell = await resolveFromLoginShell(name);
  if (fromShell && isExecutable(fromShell)) return fromShell;

  for (const dir of extraBinDirs()) {
    const candidate = path.join(dir, name);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

async function resolveFromLoginShell(name: string): Promise<string | null> {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'where.exe' : '/bin/bash';
  const args = isWindows ? [name] : ['-lc', `command -v ${shellQuote(name)}`];
  try {
    const result = await runCommand({ command, args, timeoutMs: 8_000, env: process.env });
    if (result.exitCode !== 0) return null;
    const first = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    return first ?? null;
  } catch {
    return null;
  }
}

function extraBinDirs(): string[] {
  const home = os.homedir();
  const dirs = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    path.join(home, '.local', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    path.join(home, 'n', 'bin'),
    path.join(home, '.volta', 'bin'),
    path.join(home, '.asdf', 'shims'),
    path.join(home, '.cargo', 'bin'),
  ];
  const pathValue = process.env.PATH ?? '';
  for (const dir of pathValue.split(path.delimiter)) {
    if (dir) dirs.push(dir);
  }
  return dirs;
}

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

async function launchLogin(binary: string, args: string[]): Promise<string> {
  const command = [shellQuote(binary), ...args.map(shellQuote)].join(' ');
  if (process.platform === 'darwin') {
    await runCommand({
      command: 'osascript',
      args: ['-e', `tell application "Terminal" to do script ${appleScriptQuote(command)}`],
      timeoutMs: 10_000,
      env: sanitizedEnv(),
    });
    return 'Terminal opened. Finish sign-in there, then click Recheck.';
  }

  if (process.platform === 'win32') {
    await runCommand({
      command: 'cmd.exe',
      args: ['/c', 'start', '', binary, ...args],
      timeoutMs: 10_000,
      env: sanitizedEnv(),
    });
    return 'A sign-in window should open. Finish sign-in, then click Recheck.';
  }

  const terminals = [
    { command: 'x-terminal-emulator', args: ['-e', 'bash', '-lc', `${command}; echo; read -p "You can close this window." dummy`] },
    { command: 'gnome-terminal', args: ['--', 'bash', '-lc', `${command}; echo; read -p "You can close this window." dummy`] },
    { command: 'xterm', args: ['-e', 'bash', '-lc', `${command}; echo; read -p "You can close this window." dummy`] },
  ];
  for (const terminal of terminals) {
    const resolved = await resolveBinary(terminal.command);
    if (!resolved) continue;
    try {
      await runCommand({
        command: resolved,
        args: terminal.args,
        timeoutMs: 10_000,
        env: sanitizedEnv(),
      });
      return 'A terminal opened. Finish sign-in there, then click Recheck.';
    } catch {
      continue;
    }
  }

  spawn(binary, args, {
    detached: true,
    stdio: 'ignore',
    env: sanitizedEnv(),
  }).unref();
  return 'Sign-in started. Finish it in the browser or terminal, then click Recheck.';
}

function runCommand(input: {
  command: string;
  args: string[];
  cwd?: string;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env: input.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`Timed out after ${Math.round(input.timeoutMs / 1000)}s`));
    }, input.timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode,
        stdout: redactSecrets(stdout),
        stderr: redactSecrets(stderr),
      });
    });
  });
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function appleScriptQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Bring-your-own agent catalog and fail-closed helpers.
 *
 * Traces never stores Codex / Grok CLI / Claude tokens. Sign-in lives in
 * each vendor CLI. Chat only proceeds when that CLI is installed and
 * reports a login. If it does not, we stop. We do not fall back to API keys.
 */

export const BYO_AGENT_IDS = ['codex', 'grok-cli', 'claude'] as const;

export type ByoAgentId = (typeof BYO_AGENT_IDS)[number];

export interface ByoAgentDefinition {
  id: ByoAgentId;
  label: string;
  binary: string;
  installHint: string;
  loginCommand: string;
  loginArgs: string[];
  statusArgs: string[];
}

export interface ByoAgentStatus {
  id: ByoAgentId;
  label: string;
  binary: string;
  installed: boolean;
  signedIn: boolean;
  resolvedPath: string | null;
  detail: string;
}

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export const BYO_DEFAULT_MODEL = 'default';

export const BYO_AGENTS: Record<ByoAgentId, ByoAgentDefinition> = {
  codex: {
    id: 'codex',
    label: 'Codex',
    binary: 'codex',
    installHint: 'Install the OpenAI Codex CLI, then sign in with your ChatGPT account.',
    loginCommand: 'codex login',
    loginArgs: ['login'],
    statusArgs: ['login', 'status'],
  },
  'grok-cli': {
    id: 'grok-cli',
    label: 'Grok CLI',
    binary: 'grok',
    installHint: 'Install the xAI Grok CLI, then sign in with your xAI account.',
    loginCommand: 'grok login',
    loginArgs: ['login'],
    statusArgs: ['models'],
  },
  claude: {
    id: 'claude',
    label: 'Claude',
    binary: 'claude',
    installHint: 'Install Claude Code, then sign in with your Claude account.',
    loginCommand: 'claude auth login',
    loginArgs: ['auth', 'login'],
    statusArgs: ['auth', 'status'],
  },
};

export function isByoAgentId(value: string): value is ByoAgentId {
  return (BYO_AGENT_IDS as readonly string[]).includes(value);
}

export function isByoReady(status: ByoAgentStatus): boolean {
  return status.installed && status.signedIn;
}

export function failClosedMessage(status: ByoAgentStatus): string {
  const { label, loginCommand, installHint } = BYO_AGENTS[status.id];
  if (!status.installed) {
    return (
      `${label} is not installed, so Traces will not send this chat. ` +
      `${installHint} Then click Recheck. Traces will not fall back to another provider.`
    );
  }
  if (!status.signedIn) {
    return (
      `${label} is installed, but you are not signed in. ` +
      `Use Sign in in Settings > AI & Models, or run \`${loginCommand}\` in a terminal. ` +
      `Traces will not fall back to another provider.`
    );
  }
  return `${label} is unavailable. Traces will not fall back to another provider.`;
}

export function assertByoReady(status: ByoAgentStatus): void {
  if (!isByoReady(status)) throw new Error(failClosedMessage(status));
}

/** Strip secret-shaped strings before showing CLI output in the UI. */
export function redactSecrets(text: string): string {
  return text
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, 'sk-[redacted]')
    .replace(/\bsk-ant-[A-Za-z0-9_-]{8,}/g, 'sk-ant-[redacted]')
    .replace(/\bxai-[A-Za-z0-9_-]{8,}/g, 'xai-[redacted]')
    .replace(/\bAIza[A-Za-z0-9_-]{8,}/g, 'AIza[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._\-+/=]+/gi, 'Bearer [redacted]');
}

export function looksLoggedOut(text: string): boolean {
  return /not logged in|not signed in|logged out|login required|please (log|sign) in|unauthorized|auth(?:entication)? (?:failed|required|expired)|relogin required/i.test(
    text,
  );
}

export function interpretStatusProbe(input: {
  id: ByoAgentId;
  installed: boolean;
  result: CommandResult | null;
}): { signedIn: boolean; detail: string } {
  const def = BYO_AGENTS[input.id];
  if (!input.installed) {
    return { signedIn: false, detail: `${def.label} was not found on PATH.` };
  }
  if (!input.result) {
    return {
      signedIn: false,
      detail: `${def.label} is installed, but Traces could not check the login. Fail closed.`,
    };
  }

  const combined = redactSecrets(`${input.result.stdout}\n${input.result.stderr}`.trim());
  if (looksLoggedOut(combined)) {
    return { signedIn: false, detail: combined || `${def.label} reported that you are logged out.` };
  }

  if (input.result.exitCode !== 0) {
    return {
      signedIn: false,
      detail: combined || `${def.label} login check failed (exit ${input.result.exitCode}).`,
    };
  }

  const detail = firstUsefulLine(combined) || `${def.label} reported a saved login.`;
  return { signedIn: true, detail };
}

export function buildByoPrompt(input: {
  systemPrompt: string;
  messages: { role: string; content: string }[];
}): string {
  const lines = [
    input.systemPrompt.trim(),
    '',
    'You are running as a bring-your-own agent inside Traces.',
    "The working directory is the user's markdown vault. Prefer reading and editing files there.",
    '',
    'Conversation:',
  ];
  for (const message of input.messages) {
    if (message.role === 'system') continue;
    const who = message.role === 'user' ? 'User' : 'Assistant';
    lines.push(`${who}: ${message.content}`);
  }
  lines.push('', 'Reply to the latest user message.');
  return lines.join('\n');
}

export function buildChatArgs(input: {
  id: ByoAgentId;
  prompt: string;
  vaultRoot: string;
}): string[] {
  if (input.id === 'codex') {
    return [
      'exec',
      '--ask-for-approval',
      'never',
      '--sandbox',
      'workspace-write',
      input.prompt,
    ];
  }
  if (input.id === 'claude') {
    return ['-p', '--output-format', 'json', '--permission-mode', 'acceptEdits', input.prompt];
  }
  if (input.id === 'grok-cli') {
    return [
      '-p',
      input.prompt,
      '--output-format',
      'json',
      '--cwd',
      input.vaultRoot,
      '--always-approve',
      '--no-auto-update',
      '--no-alt-screen',
    ];
  }
  const _exhaustive: never = input.id;
  return _exhaustive;
}

export function extractAssistantText(stdout: string): string {
  const trimmed = stdout.trim();
  if (!trimmed) return '';

  const asJson = tryParseJson(trimmed);
  const fromObject = extractFromUnknown(asJson);
  if (fromObject) return fromObject;

  let lastFromNdjson = '';
  for (const line of trimmed.split('\n')) {
    const parsed = tryParseJson(line.trim());
    const text = extractFromUnknown(parsed);
    if (text) lastFromNdjson = text;
  }
  if (lastFromNdjson) return lastFromNdjson;

  const plain = trimmed
    .split('\n')
    .filter((line) => {
      const value = line.trim();
      return value && !value.startsWith('{') && !value.startsWith('[');
    })
    .join('\n')
    .trim();
  return plain || trimmed;
}

function firstUsefulLine(text: string): string {
  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ''
  );
}

function tryParseJson(text: string): unknown {
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractFromUnknown(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (!value || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => extractFromUnknown(entry))
      .filter((entry): entry is string => Boolean(entry));
    return parts.length > 0 ? parts.join('\n') : null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ['result', 'message', 'text', 'output']) {
    const nested = record[key];
    if (typeof nested === 'string' && nested.trim()) return nested;
  }

  if (typeof record.content === 'string' && record.content.trim()) return record.content;
  if (Array.isArray(record.content)) {
    const fromContent = extractFromUnknown(record.content);
    if (fromContent) return fromContent;
  }
  if (record.item && typeof record.item === 'object') {
    const fromItem = extractFromUnknown(record.item);
    if (fromItem) return fromItem;
  }
  return null;
}

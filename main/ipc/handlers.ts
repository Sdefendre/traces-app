import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  setVaultRoot,
  getVaultRoot,
  listFiles,
  readFile,
  writeFile,
  createFile,
  renameFile,
  deleteFile,
} from './file-system';
import { parseVault } from './vault-parser';
import { REALTIME_TOOLS } from './realtime-tools';

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function registerIpcHandlers(vaultRoot: string) {
  setVaultRoot(vaultRoot);

  ipcMain.handle('vault:getVaultPath', async () => {
    return getVaultRoot();
  });

  ipcMain.handle('vault:listFiles', async () => {
    return listFiles();
  });

  ipcMain.handle('vault:readFile', async (_event, filePath: string) => {
    return readFile(filePath);
  });

  ipcMain.handle('vault:writeFile', async (_event, filePath: string, content: string) => {
    return writeFile(filePath, content);
  });

  ipcMain.handle('vault:createFile', async (_event, filePath: string, content?: string) => {
    return createFile(filePath, content);
  });

  ipcMain.handle('vault:renameFile', async (_event, oldPath: string, newPath: string) => {
    return renameFile(oldPath, newPath);
  });

  ipcMain.handle('vault:deleteFile', async (_event, filePath: string) => {
    return deleteFile(filePath);
  });

  ipcMain.handle('vault:getGraphData', async () => {
    const files = await listFiles();
    return parseVault(vaultRoot, files);
  });

  ipcMain.handle('settings:load', async () => {
    try {
      const data = fs.readFileSync(getSettingsPath(), 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  });

  ipcMain.handle('settings:save', async (_event, data: Record<string, unknown>) => {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2), 'utf-8');
  });

  ipcMain.handle(
    'realtime:createSession',
    async (
      _event,
      opts: { apiKey: string; voice?: string; instructions?: string }
    ) => {
      const key = (opts.apiKey && opts.apiKey.trim()) || process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OpenAI API key is required for voice mode');
      const sessionConfig = {
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          audio: {
            output: { voice: opts.voice || 'verse' },
            input: {
              transcription: { model: 'gpt-4o-mini-transcribe' },
            },
          },
          tools: REALTIME_TOOLS,
          ...(opts.instructions ? { instructions: opts.instructions } : {}),
        },
      };
      const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionConfig),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI Realtime session error (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { value: string; session?: { id?: string } };
      return {
        clientSecret: data.value,
        sessionId: data.session?.id ?? '',
      };
    }
  );

  ipcMain.handle(
    'realtime:createGrokSession',
    async (_event, opts: { apiKey: string }) => {
      const key = (opts.apiKey && opts.apiKey.trim()) || process.env.XAI_API_KEY;
      if (!key) throw new Error('xAI API key is required for Grok voice mode');
      const res = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expires_after: { seconds: 300 } }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`xAI Realtime session error (${res.status}): ${text}`);
      }
      const data = (await res.json()) as { value?: string; client_secret?: string };
      return {
        clientSecret: data.value ?? data.client_secret ?? '',
      };
    }
  );

  ipcMain.handle(
    'realtime:executeTool',
    async (
      _event,
      opts: { toolName: string; args: Record<string, string> }
    ) => {
      const { toolName, args } = opts;
      switch (toolName) {
        case 'list_files': {
          const files = await listFiles();
          return JSON.stringify(files);
        }
        case 'read_file': {
          return await readFile(args.path);
        }
        case 'write_file': {
          await writeFile(args.path, args.content);
          return `File written: ${args.path}`;
        }
        case 'edit_file': {
          const content = await readFile(args.path);
          if (!content.includes(args.old_text)) {
            return `Error: Could not find the specified text in ${args.path}`;
          }
          const updated = content.replace(args.old_text, args.new_text);
          await writeFile(args.path, updated);
          return `File edited: ${args.path}`;
        }
        case 'delete_file': {
          await deleteFile(args.path);
          return `File deleted: ${args.path}`;
        }
        case 'search_files': {
          const files = await listFiles();
          const results: string[] = [];
          for (const file of files) {
            const content = await readFile(file);
            if (content.toLowerCase().includes(args.query.toLowerCase())) {
              results.push(file);
            }
          }
          return JSON.stringify(results);
        }
        default:
          return `Unknown tool: ${toolName}`;
      }
    }
  );
}

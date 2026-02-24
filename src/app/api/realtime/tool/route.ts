import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

function safePath(vaultRoot: string, filePath: string): string {
  const resolved = path.resolve(vaultRoot, filePath);
  if (!resolved.startsWith(path.resolve(vaultRoot))) {
    throw new Error('Path traversal not allowed');
  }
  return resolved;
}

async function listFilesRecursive(dir: string, base?: string): Promise<string[]> {
  const root = base ?? dir;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      const sub = await listFilesRecursive(fullPath, root);
      files.push(...sub);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.relative(root, fullPath));
    }
  }

  return files;
}

async function executeTool(
  toolName: string,
  args: Record<string, string>,
  vaultRoot: string,
): Promise<string> {
  switch (toolName) {
    case 'list_files': {
      const files = await listFilesRecursive(vaultRoot);
      return JSON.stringify(files);
    }
    case 'read_file': {
      const fullPath = safePath(vaultRoot, args.path);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    }
    case 'write_file': {
      const fullPath = safePath(vaultRoot, args.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, args.content, 'utf-8');
      return `File written: ${args.path}`;
    }
    case 'edit_file': {
      const fullPath = safePath(vaultRoot, args.path);
      let content = await fs.readFile(fullPath, 'utf-8');
      if (!content.includes(args.old_text)) {
        return `Error: Could not find the specified text in ${args.path}`;
      }
      content = content.replace(args.old_text, args.new_text);
      await fs.writeFile(fullPath, content, 'utf-8');
      return `File edited: ${args.path}`;
    }
    case 'delete_file': {
      const fullPath = safePath(vaultRoot, args.path);
      await fs.unlink(fullPath);
      return `File deleted: ${args.path}`;
    }
    case 'search_files': {
      const files = await listFilesRecursive(vaultRoot);
      const results: string[] = [];
      for (const file of files) {
        const fullPath = path.join(vaultRoot, file);
        const content = await fs.readFile(fullPath, 'utf-8');
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

export async function POST(req: Request) {
  const body = await req.json();
  const { toolName, args, vaultPath } = body as {
    toolName: string;
    args: Record<string, string>;
    vaultPath?: string;
  };

  if (!toolName) {
    return NextResponse.json({ error: 'toolName is required' }, { status: 400 });
  }

  const vaultRoot =
    vaultPath ||
    process.env.VAULT_PATH ||
    path.join(process.env.HOME || '', 'Desktop/Traces Notes');

  try {
    const result = await executeTool(toolName, args || {}, vaultRoot);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tool execution failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

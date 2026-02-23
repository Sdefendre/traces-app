'use client';

import { useState, useMemo, useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import { FileTreeItem, TreeNode } from './FileTreeItem';
import { electronAPI } from '@/lib/electron-api';

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = {
          name,
          path,
          isFile,
          children: isFile ? undefined : [],
        };
        current.push(existing);
      }
      if (!isFile && existing.children) {
        current = existing.children;
      }
    }
  }

  // Sort: folders first, then alphabetically
  function sortTree(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortTree(node.children);
    }
  }
  sortTree(root);
  return root;
}

export function FileTree() {
  const { files, activeFile, setActiveFile, refreshFiles } = useVaultStore();
  const { openFile } = useEditorStore();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const filteredFiles = useMemo(() => {
    if (!search) return files;
    const q = search.toLowerCase();
    return files.filter((f) => f.toLowerCase().includes(q));
  }, [files, search]);

  const tree = useMemo(() => buildTree(filteredFiles), [filteredFiles]);

  const handleSelect = useCallback(
    (path: string) => {
      setActiveFile(path);
      openFile(path);
    },
    [setActiveFile, openFile]
  );

  const handleCreate = useCallback(async () => {
    if (!newFileName.trim()) return;
    const fileName = newFileName.endsWith('.md') ? newFileName : `${newFileName}.md`;
    const filePath = `Memory/${fileName}`;
    await electronAPI.createFile(filePath, `# ${newFileName.replace('.md', '')}\n\n`);
    await refreshFiles();
    setCreating(false);
    setNewFileName('');
    handleSelect(filePath);
  }, [newFileName, refreshFiles, handleSelect]);

  const handleDelete = useCallback(
    async (path: string) => {
      await electronAPI.deleteFile(path);
      await refreshFiles();
    },
    [refreshFiles]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neon-cyan glow-cyan tracking-wider uppercase">
            Jarvis Vault
          </span>
          <button
            onClick={() => setCreating(true)}
            className="text-text-dim hover:text-neon-cyan transition-colors text-lg leading-none"
            title="New Note"
          >
            +
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-void border border-border rounded
                     text-text-primary placeholder:text-text-dim
                     focus:outline-none focus:border-neon-cyan/50"
        />
      </div>

      {/* New file input */}
      {creating && (
        <div className="px-3 py-2 border-b border-border">
          <input
            type="text"
            placeholder="Note name..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
            autoFocus
            className="w-full px-2 py-1 text-xs bg-void border border-neon-cyan/50 rounded
                       text-text-primary placeholder:text-text-dim
                       focus:outline-none focus:border-neon-cyan"
          />
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            activeFile={activeFile}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* File count */}
      <div className="px-3 py-1.5 border-t border-border text-xs text-text-dim">
        {files.length} notes
      </div>
    </div>
  );
}

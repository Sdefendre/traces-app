'use client';

import { useState, useMemo, useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import { useUIStore } from '@/stores/ui-store';
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
  const { files, activeFile, setActiveFile, refreshFiles, openFolder, vaultName } = useVaultStore();
  const { openFile } = useEditorStore();
  const { toggleSidebar } = useUIStore();
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
      <div className="px-5 py-3" style={{ paddingTop: '44px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
            {vaultName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {/* Collapse sidebar */}
            <button
              onClick={toggleSidebar}
              className="transition-colors text-xs leading-none px-1"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              title="Collapse sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={openFolder}
              className="transition-colors text-xs leading-none px-1"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              title="Open Folder"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button
              onClick={() => setCreating(true)}
              className="transition-colors text-lg leading-none"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              title="New Note"
            >
              +
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm rounded
                     placeholder:text-gray-500
                     focus:outline-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        />
      </div>

      {/* New file input */}
      {creating && (
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
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
            className="w-full px-2 py-1.5 text-xs rounded
                       placeholder:text-gray-500
                       focus:outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
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

      {/* Bottom bar: file count */}
      <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-xs text-center" style={{ color: 'var(--text-dim)' }}>
          {files.length} notes
        </div>
      </div>
    </div>
  );
}

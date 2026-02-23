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
  const { chatOpen, toggleChat, darkMode, toggleDarkMode } = useUIStore();
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
      <div className="px-3 py-2" style={{ paddingTop: '40px', borderBottom: '1px solid var(--border, #c0c0c0)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text, #111)' }}>
            {vaultName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={openFolder}
              className="transition-colors text-xs leading-none px-1"
              style={{ color: '#787774' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#37352f')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#787774')}
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
              style={{ color: '#787774' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#37352f')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#787774')}
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
                     placeholder:text-gray-400
                     focus:outline-none"
          style={{
            backgroundColor: 'var(--bg-secondary, #f5f5f5)',
            border: '1px solid var(--border, #c0c0c0)',
            color: 'var(--text, #111)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.1)';
            e.currentTarget.style.borderColor = '#999';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'var(--border, #c0c0c0)';
          }}
        />
      </div>

      {/* New file input */}
      {creating && (
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border, #c0c0c0)' }}>
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
                       placeholder:text-gray-400
                       focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#f7f7f8',
              border: '1px solid #2383e2',
              color: '#37352f',
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(35,131,226,0.25)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
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

      {/* Bottom bar: Dark mode + AI Chat + file count */}
      <div className="px-3 py-3 space-y-2" style={{ borderTop: '1px solid var(--border, #c0c0c0)' }}>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          style={{
            width: '100%',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border, #c0c0c0)',
            background: 'var(--bg-secondary, #f5f5f5)',
            color: 'var(--text, #111)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--border, #c0c0c0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary, #f5f5f5)';
          }}
        >
          {darkMode ? '☀️' : '🌙'} {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* AI Chat button */}
        <button
          onClick={toggleChat}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 10,
            border: 'none',
            background: chatOpen
              ? 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)'
              : 'linear-gradient(135deg, #4a90f7, #a855f7, #f97316)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: chatOpen
              ? '0 0 16px rgba(168, 85, 247, 0.4), 0 2px 8px rgba(99, 102, 241, 0.3)'
              : '0 2px 10px rgba(74, 144, 247, 0.25)',
            transition: 'box-shadow 0.3s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.5), 0 4px 14px rgba(74, 144, 247, 0.35)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = chatOpen
              ? '0 0 16px rgba(168, 85, 247, 0.4), 0 2px 8px rgba(99, 102, 241, 0.3)'
              : '0 2px 10px rgba(74, 144, 247, 0.25)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span style={{ fontSize: 15 }}>&#10024;</span>
          {chatOpen ? 'Close AI Chat' : 'AI Chat'}
        </button>

        <div className="text-xs text-center" style={{ color: 'var(--text-dim, #bbb)' }}>
          {files.length} notes
        </div>
      </div>
    </div>
  );
}

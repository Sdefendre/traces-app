'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import { useUIStore } from '@/stores/ui-store';
import { FileTreeItem, TreeNode } from './FileTreeItem';
import { electronAPI } from '@/lib/electron-api';
import { Button } from '@/components/ui/button';
import { ChevronLeft, FolderOpen, Plus } from 'lucide-react';

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Listen for global keyboard shortcut events
  useEffect(() => {
    const handleNewNote = () => {
      // Expand sidebar if collapsed so the create input is visible
      const { sidebarCollapsed } = useUIStore.getState();
      if (sidebarCollapsed) useUIStore.getState().toggleSidebar();
      setCreating(true);
    };

    const handleFocusSearch = () => {
      // Expand sidebar if collapsed so the search input is visible
      const { sidebarCollapsed } = useUIStore.getState();
      if (sidebarCollapsed) useUIStore.getState().toggleSidebar();
      searchInputRef.current?.focus();
    };

    window.addEventListener('traces:new-note', handleNewNote);
    window.addEventListener('traces:focus-search', handleFocusSearch);
    return () => {
      window.removeEventListener('traces:new-note', handleNewNote);
      window.removeEventListener('traces:focus-search', handleFocusSearch);
    };
  }, []);

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
      // Auto-expand editor if it's collapsed
      const { editorCollapsed, setEditorCollapsed } = useUIStore.getState();
      if (editorCollapsed) setEditorCollapsed(false);
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
      <div className="py-3 titlebar-drag" style={{ paddingTop: '48px', paddingLeft: 'var(--titlebar-safe-left)', paddingRight: 20, borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
            {vaultName}
          </span>
          <div className="flex items-center gap-0.5 shrink-0 rounded-xl px-1.5 py-1 glass titlebar-no-drag">
            <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} title="Collapse sidebar" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="size-3.5" />
            </Button>
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            <Button variant="ghost" size="icon-sm" onClick={openFolder} title="Open Folder" className="text-muted-foreground hover:text-foreground transition-colors">
              <FolderOpen className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setCreating(true)} title="New Note" className="text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm rounded text-left
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
        <div className="py-2" style={{ paddingLeft: 'var(--titlebar-safe-left)', paddingRight: 20, borderBottom: '1px solid var(--border)' }}>
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
      <div className="flex-1 overflow-y-auto py-1 text-left flex flex-col items-start">
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
      <div className="py-3" style={{ paddingLeft: 'var(--titlebar-safe-left)', paddingRight: 20, borderTop: '1px solid var(--border)' }}>
        <div className="text-xs text-left" style={{ color: 'var(--text-dim)' }}>
          {files.length} notes
        </div>
      </div>
    </div>
  );
}

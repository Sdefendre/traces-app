'use client';

import { useState, useCallback } from 'react';
import type { NodeCategory } from '@/types';
import { CATEGORY_COLORS } from '@/types';

export interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children?: TreeNode[];
}

interface FileTreeItemProps {
  node: TreeNode;
  depth: number;
  activeFile: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
}

function getCategoryFromPath(path: string): NodeCategory {
  const parts = path.split('/');
  if (parts[0] === 'Memory') {
    if (parts[1] === 'journal') return 'journal';
    if (parts[1] === 'personal') return 'personal';
    if (parts[1] === 'business') return 'business';
    if (parts[1] === 'archive') return 'archive';
    return 'journal';
  }
  if (parts[0] === 'Workspace') return 'workspace';
  return 'archive';
}

export function FileTreeItem({ node, depth, activeFile, onSelect, onDelete }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const isActive = node.isFile && activeFile === node.path;
  const category = getCategoryFromPath(node.path);
  const dotColor = CATEGORY_COLORS[category];

  const handleClick = useCallback(() => {
    if (node.isFile) {
      onSelect(node.path);
    } else {
      setExpanded((e) => !e);
    }
  }, [node, onSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors titlebar-no-drag"
        style={{
          paddingLeft: `${depth * 16 + 20}px`,
          fontSize: '14px',
          fontWeight: node.isFile ? 400 : 600,
          borderRadius: '4px',
          margin: '0 4px',
          backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : undefined,
          color: 'var(--text)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Folder arrow or file dot */}
        {node.isFile ? (
          <span
            className="rounded-full flex-shrink-0"
            style={{ width: '7px', height: '7px', backgroundColor: dotColor }}
          />
        ) : (
          <span className="flex-shrink-0 w-3 text-center" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
            {expanded ? '\u25BE' : '\u25B8'}
          </span>
        )}

        <span className="truncate">
          {node.isFile ? node.name.replace('.md', '') : node.name}
        </span>
      </div>

      {/* Children */}
      {!node.isFile && expanded && node.children && (
        <>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 rounded py-1 min-w-[140px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: 'rgba(10, 10, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            {node.isFile && (
              <>
                <button
                  className="w-full px-3 py-1.5 text-xs text-left transition-colors"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => {
                    navigator.clipboard.writeText(node.path);
                    setContextMenu(null);
                  }}
                >
                  Copy Path
                </button>
                <button
                  className="w-full px-3 py-1.5 text-xs text-left transition-colors"
                  style={{ color: '#ef4444' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => {
                    onDelete(node.path);
                    setContextMenu(null);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

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
        className={`
          flex items-center gap-1.5 px-2 py-0.5 cursor-pointer text-xs
          transition-colors titlebar-no-drag
          ${isActive
            ? 'bg-neon-cyan/10 text-neon-cyan'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Folder arrow or file dot */}
        {node.isFile ? (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          />
        ) : (
          <span className="text-text-dim flex-shrink-0 w-3 text-center">
            {expanded ? 'v' : '>'}
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
            className="fixed z-50 bg-surface border border-border rounded shadow-lg py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {node.isFile && (
              <>
                <button
                  className="w-full px-3 py-1 text-xs text-left text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  onClick={() => {
                    navigator.clipboard.writeText(node.path);
                    setContextMenu(null);
                  }}
                >
                  Copy Path
                </button>
                <button
                  className="w-full px-3 py-1 text-xs text-left text-neon-pink hover:bg-surface-hover"
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

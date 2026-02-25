'use client';

import { useState, useCallback } from 'react';
import type { NodeCategory } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

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

  const row = (
    <div
      className={`flex items-center justify-start gap-1.5 px-2 py-1.5 cursor-pointer transition-colors titlebar-no-drag rounded mx-1 text-left ${
        isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
      }`}
      style={{
        paddingLeft: `calc(var(--titlebar-safe-left) + ${depth * 16}px)`,
        fontSize: '14px',
        fontWeight: node.isFile ? 400 : 600,
        color: 'var(--text)',
      }}
      onClick={handleClick}
    >
      {/* Folder arrow or file dot */}
      {node.isFile ? (
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: '7px', height: '7px', backgroundColor: dotColor }}
        />
      ) : (
        <span className="flex-shrink-0 w-3 text-center text-muted-foreground text-[11px]">
          {expanded ? '\u25BE' : '\u25B8'}
        </span>
      )}

      <span className="truncate text-left block">
        {node.isFile ? node.name.replace('.md', '') : node.name}
      </span>
    </div>
  );

  return (
    <>
      {node.isFile ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
          <ContextMenuContent className="min-w-[140px] bg-[rgba(10,10,20,0.95)] backdrop-blur-[20px] border-white/[0.08]">
            <ContextMenuItem
              onClick={() => navigator.clipboard.writeText(node.path)}
              className="text-xs"
            >
              Copy Path
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onDelete(node.path)}
              className="text-xs text-destructive focus:text-destructive"
            >
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        row
      )}

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
    </>
  );
}

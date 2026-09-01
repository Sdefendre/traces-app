'use client';

import { useVaultStore } from '@/stores/vault-store';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';

/** Shown over every graph view when the vault has no notes. */
export function GraphEmptyState() {
  const openFolder = useVaultStore((state) => state.openFolder);

  const handleNewNote = () => {
    const { editorCollapsed, setEditorCollapsed } = useUIStore.getState();
    if (editorCollapsed) setEditorCollapsed(false);
    window.dispatchEvent(new CustomEvent('traces:new-note'));
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-[rgba(5,5,16,0.72)] px-6 py-5 text-center shadow-lg backdrop-blur-md titlebar-no-drag"
      >
        <div className="space-y-1">
          <div className="text-[15px] font-medium tracking-tight text-foreground">No notes yet</div>
          <div className="text-[13px] text-muted-foreground/80 leading-relaxed">
            Create a note or open a folder to see your graph.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="cta" onClick={handleNewNote} className="justify-center">
            <Plus className="size-3.5" />
            <span className="leading-none">New Note</span>
          </Button>
          <Button variant="outline" onClick={openFolder} className="justify-center">
            <FolderOpen className="size-3.5" />
            <span className="leading-none">Open Folder</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

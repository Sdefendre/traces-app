'use client';

import { useGraphStore, ViewMode } from '@/stores/graph-store';
import { Network, Mountain, Cuboid } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ViewToggle() {
  const { viewMode, setViewMode } = useGraphStore();

  const modes: { id: ViewMode; label: string; icon: any }[] = [
    { id: 'galaxy', label: 'Galaxy', icon: Network },
    { id: 'terrain', label: 'Terrain', icon: Mountain },
    { id: 'cluster', label: 'Cluster', icon: Cuboid },
  ];

  return (
    <div className="absolute top-12 left-3 z-30 flex bg-zinc-900/80 backdrop-blur-md rounded-md p-1 border border-zinc-800 shadow-xl titlebar-no-drag">
      {modes.map((m) => {
        const active = viewMode === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all",
              active 
                ? "bg-zinc-800 text-white shadow-sm" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
            title={m.label}
          >
            <Icon size={14} />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

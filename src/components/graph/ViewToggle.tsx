'use client';

import { useGraphStore, type ViewMode } from '@/stores/graph-store';
import { Atom, Cuboid, Mountain, Network, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  /** When true, adds left padding to avoid macOS traffic lights (e.g. in fullscreen) */
  useSafeArea?: boolean;
}

const VIEW_MODES: readonly { id: ViewMode; label: string; icon: LucideIcon }[] = [
  { id: 'galaxy', label: 'Galaxy View', icon: Network },
  { id: 'terrain', label: 'Terrain View', icon: Mountain },
  { id: 'cluster', label: 'Cluster View', icon: Cuboid },
  { id: 'particle', label: 'Particle View', icon: Atom },
];

export function ViewToggle({ useSafeArea }: ViewToggleProps) {
  const viewMode = useGraphStore((state) => state.viewMode);
  const setViewMode = useGraphStore((state) => state.setViewMode);

  return (
    <div
      role="group"
      aria-label="Graph view"
      className="absolute top-12 z-30 flex items-center gap-0.5 rounded-xl px-1.5 py-1 glass titlebar-no-drag"
      style={{ left: useSafeArea ? 'var(--titlebar-safe-left)' : '0.75rem' }}
    >
      {VIEW_MODES.map((m) => {
        const active = viewMode === m.id;
        const Icon = m.icon;
        return (
          <Button
            key={m.id}
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label={m.label}
            aria-pressed={active}
            onClick={() => setViewMode(m.id)}
            className={cn(
              "transition-colors",
              active 
                ? "bg-white/10 text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            title={m.label}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </Button>
        );
      })}
    </div>
  );
}

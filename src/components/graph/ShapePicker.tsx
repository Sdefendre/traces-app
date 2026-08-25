'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/stores/graph-store';
import type { ParticleShape } from '../../../shared/particle-shapes';

interface ShapePickerProps {
  /** Keeps fullscreen controls clear of the macOS traffic lights. */
  useSafeArea?: boolean;
}

const SHAPE_OPTIONS: readonly {
  id: ParticleShape;
  label: string;
  glyph: string;
}[] = [
  { id: 'mobius', label: 'Möbius Strip', glyph: '∞' },
  { id: 'toroidal', label: 'Toroidal Vortex', glyph: '◎' },
  { id: 'harmonics', label: 'Spherical Harmonics', glyph: '✳' },
  { id: 'lissajous', label: 'Lissajous Curve', glyph: '∿' },
  { id: 'fractal', label: 'Fractal Branches', glyph: 'ψ' },
];

export function ShapePicker({ useSafeArea = false }: ShapePickerProps) {
  const viewMode = useGraphStore((state) => state.viewMode);
  const particleShape = useGraphStore((state) => state.particleShape);
  const setParticleShape = useGraphStore((state) => state.setParticleShape);

  if (viewMode !== 'particle') return null;

  return (
    <div
      role="group"
      aria-label="Particle shape"
      className="absolute top-[5.5rem] z-40 flex items-center gap-0.5 rounded-xl px-1.5 py-1 glass titlebar-no-drag"
      style={{ left: useSafeArea ? 'var(--titlebar-safe-left)' : '0.75rem' }}
    >
      {SHAPE_OPTIONS.map((shape) => {
        const active = particleShape === shape.id;
        const accessibleLabel = `Use ${shape.label} particle shape`;
        return (
          <Button
            key={shape.id}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={accessibleLabel}
            aria-pressed={active}
            title={accessibleLabel}
            data-particle-shape={shape.id}
            onClick={() => setParticleShape(shape.id)}
            className={cn(
              'text-sm transition-colors',
              active
                ? 'bg-white/10 text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
            )}
          >
            <span aria-hidden="true">{shape.glyph}</span>
          </Button>
        );
      })}
    </div>
  );
}

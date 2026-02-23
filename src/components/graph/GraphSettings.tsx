'use client';

import { useGraphStore } from '@/stores/graph-store';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums text-foreground">{value.toFixed(step < 0.1 ? 2 : 1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 appearance-none rounded-sm cursor-pointer accent-[#6366f1]"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function GraphSettings() {
  const { settings, updateSettings } = useGraphStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground titlebar-no-drag" title="Graph settings">
          <Settings className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[220px] p-3.5 space-y-3.5 bg-[rgba(10,10,20,0.95)] backdrop-blur-[20px] border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <SliderRow
          label="Node Size"
          value={settings.nodeSize}
          min={0.5}
          max={4.0}
          step={0.1}
          onChange={(v) => updateSettings({ nodeSize: v })}
        />
        <ToggleRow
          label="Show Labels"
          checked={settings.showLabels}
          onChange={(v) => updateSettings({ showLabels: v })}
        />
        <SliderRow
          label="Line Thickness"
          value={settings.lineThickness}
          min={0.5}
          max={3.0}
          step={0.1}
          onChange={(v) => updateSettings({ lineThickness: v })}
        />
        <ToggleRow
          label="Auto Rotate"
          checked={settings.autoRotate}
          onChange={(v) => updateSettings({ autoRotate: v })}
        />
        <SliderRow
          label="Rotate Speed"
          value={settings.rotateSpeed}
          min={0}
          max={1.0}
          step={0.05}
          onChange={(v) => updateSettings({ rotateSpeed: v })}
        />
        <div className="flex justify-between items-center">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Line Color</span>
          <input
            type="color"
            value={settings.lineColor || '#27272a'}
            onInput={(e) => updateSettings({ lineColor: (e.target as HTMLInputElement).value })}
            onChange={(e) => updateSettings({ lineColor: e.target.value })}
            className="w-7 h-5 border border-white/10 rounded cursor-pointer p-0 bg-transparent"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '@/stores/graph-store';

/* ------------------------------------------------------------------ */
/*  Gear SVG icon                                                     */
/* ------------------------------------------------------------------ */
function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.8 1.5h2.4l.3 1.7a5 5 0 0 1 1.2.7l1.6-.6.9 1.6-1.3 1.1a5 5 0 0 1 0 1.4l1.3 1.1-.9 1.6-1.6-.6a5 5 0 0 1-1.2.7l-.3 1.7H6.8l-.3-1.7a5 5 0 0 1-1.2-.7l-1.6.6-.9-1.6 1.3-1.1a5 5 0 0 1 0-1.4L2.8 4.9l.9-1.6 1.6.6a5 5 0 0 1 1.2-.7l.3-1.7Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Slider row                                                        */
/* ------------------------------------------------------------------ */
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
          {value.toFixed(step < 0.1 ? 2 : 1)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: 4,
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          outline: 'none',
          cursor: 'pointer',
          accentColor: '#6366f1',
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                     */
/* ------------------------------------------------------------------ */
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
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 32,
          height: 18,
          borderRadius: 9,
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          background: checked ? '#6366f1' : 'rgba(255,255,255,0.15)',
          transition: 'background 0.15s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GraphSettings                                                     */
/* ------------------------------------------------------------------ */
export function GraphSettings() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings, updateSettings } = useGraphStore();

  /* Close on click outside */
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Gear button */}
      <button
        type="button"
        aria-label="Graph settings"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-6 w-6 items-center justify-center rounded text-sm transition-colors"
        style={{
          color: 'var(--text-secondary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        <GearIcon />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 32,
            right: 0,
            width: 220,
            background: 'rgba(10, 10, 20, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            zIndex: 60,
          }}
        >
          {/* Node Size */}
          <SliderRow
            label="Node Size"
            value={settings.nodeSize}
            min={0.5}
            max={4.0}
            step={0.1}
            onChange={(v) => updateSettings({ nodeSize: v })}
          />

          {/* Show Labels */}
          <ToggleRow
            label="Show Labels"
            checked={settings.showLabels}
            onChange={(v) => updateSettings({ showLabels: v })}
          />

          {/* Line Thickness */}
          <SliderRow
            label="Line Thickness"
            value={settings.lineThickness}
            min={0.5}
            max={3.0}
            step={0.1}
            onChange={(v) => updateSettings({ lineThickness: v })}
          />

          {/* Auto Rotate */}
          <ToggleRow
            label="Auto Rotate"
            checked={settings.autoRotate}
            onChange={(v) => updateSettings({ autoRotate: v })}
          />

          {/* Rotate Speed */}
          <SliderRow
            label="Rotate Speed"
            value={settings.rotateSpeed}
            min={0}
            max={1.0}
            step={0.05}
            onChange={(v) => updateSettings({ rotateSpeed: v })}
          />

          {/* Line Color */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
              Line Color
            </span>
            <input
              type="color"
              value={settings.lineColor || '#27272a'}
              onInput={(e) => updateSettings({ lineColor: (e.target as HTMLInputElement).value })}
              onChange={(e) => updateSettings({ lineColor: e.target.value })}
              style={{
                width: 28,
                height: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                cursor: 'pointer',
                padding: 0,
                background: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { create } from 'zustand';

export type ViewMode = 'galaxy' | 'terrain' | 'cluster';

interface GraphSettings {
  nodeSize: number;
  showLabels: boolean;
  lineThickness: number;
  autoRotate: boolean;
  rotateSpeed: number;
  lineColor: string;
  terrainOpacity: number;
  terrainWireframe: boolean;
  /** When true, reduces 3D complexity (fewer stars, simpler terrain) to save CPU/GPU */
  lowPowerMode: boolean;
}

interface GraphState {
  viewMode: ViewMode;
  hoveredNode: string | null;
  selectedNode: string | null;
  cameraTarget: [number, number, number] | null;
  zoomDistance: number;
  settings: GraphSettings;

  setViewMode: (mode: ViewMode) => void;
  setHoveredNode: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  setCameraTarget: (pos: [number, number, number] | null) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  updateSettings: (partial: Partial<GraphSettings>) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  viewMode: 'galaxy',
  hoveredNode: null,
  selectedNode: null,
  cameraTarget: null,
  zoomDistance: 160,
  settings: {
    nodeSize: 1.5,
    showLabels: true,
    lineThickness: 1,
    autoRotate: true,
    rotateSpeed: 0.15,
    lineColor: '#27272a',
    terrainOpacity: 0.12,
    terrainWireframe: true,
    lowPowerMode: false,
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setHoveredNode: (id) => set({ hoveredNode: id }),
  setSelectedNode: (id) => set({ selectedNode: id }),
  setCameraTarget: (pos) => set({ cameraTarget: pos }),
  zoomIn: () => set((s) => ({ zoomDistance: Math.max(20, s.zoomDistance * 0.75) })),
  zoomOut: () => set((s) => ({ zoomDistance: Math.min(500, s.zoomDistance * 1.35) })),
  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),
}));

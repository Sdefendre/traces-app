import { create } from 'zustand';

interface GraphSettings {
  nodeSize: number;
  showLabels: boolean;
  lineThickness: number;
  autoRotate: boolean;
  rotateSpeed: number;
}

interface GraphState {
  hoveredNode: string | null;
  selectedNode: string | null;
  cameraTarget: [number, number, number] | null;
  settings: GraphSettings;

  setHoveredNode: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  setCameraTarget: (pos: [number, number, number] | null) => void;
  updateSettings: (partial: Partial<GraphSettings>) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  hoveredNode: null,
  selectedNode: null,
  cameraTarget: null,
  settings: {
    nodeSize: 1.5,
    showLabels: true,
    lineThickness: 1,
    autoRotate: true,
    rotateSpeed: 0.15,
  },

  setHoveredNode: (id) => set({ hoveredNode: id }),
  setSelectedNode: (id) => set({ selectedNode: id }),
  setCameraTarget: (pos) => set({ cameraTarget: pos }),
  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),
}));

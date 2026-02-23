import { create } from 'zustand';

interface GraphState {
  hoveredNode: string | null;
  selectedNode: string | null;
  cameraTarget: [number, number, number] | null;

  setHoveredNode: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  setCameraTarget: (pos: [number, number, number] | null) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  hoveredNode: null,
  selectedNode: null,
  cameraTarget: null,

  setHoveredNode: (id) => set({ hoveredNode: id }),
  setSelectedNode: (id) => set({ selectedNode: id }),
  setCameraTarget: (pos) => set({ cameraTarget: pos }),
}));

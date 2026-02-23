export interface GraphNode {
  id: string;
  label: string;
  category: string;
  path: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'wiki-link' | 'folder-sibling' | 'cross-folder';
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface VaultFile {
  path: string;
  name: string;
  directory: string;
  category: string;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

export type NodeCategory = 'journal' | 'personal' | 'business' | 'workspace' | 'archive';

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  journal: '#00f0ff',
  personal: '#b84dff',
  business: '#ff8c42',
  workspace: '#39ff14',
  archive: '#666680',
};

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
  /** Set when a save-on-close attempt fails; cleared on edit or successful save. */
  saveError?: string | null;
}

export interface CloseTabOptions {
  /** Skip save attempt and remove the tab (e.g. file already deleted on disk). */
  discard?: boolean;
}

export type NodeCategory = 'journal' | 'personal' | 'business' | 'workspace' | 'archive';

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  journal: '#4a90f7',   // vivid blue
  personal: '#a855f7',  // vivid purple
  business: '#f97316',  // vivid orange
  workspace: '#22c55e', // vivid green
  archive: '#94a3b8',   // slate gray
};

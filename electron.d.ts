export interface ElectronAPI {
  listFiles: () => Promise<string[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createFile: (filePath: string, content?: string) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
  getGraphData: () => Promise<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  }>;
  onFileChange: (callback: (event: string, filePath: string) => void) => () => void;
  onGraphUpdate: (callback: (data: { nodes: GraphNode[]; edges: GraphEdge[] }) => void) => () => void;
}

interface GraphNode {
  id: string;
  label: string;
  category: string;
  path: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'wiki-link' | 'folder-sibling' | 'cross-folder';
  strength: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

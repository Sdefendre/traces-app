import fs from 'fs/promises';
import path from 'path';

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

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

function getCategory(filePath: string): string {
  const parts = filePath.split(path.sep);
  if (parts[0] === 'Memory') {
    if (parts[1] === 'journal') return 'journal';
    if (parts[1] === 'personal') return 'personal';
    if (parts[1] === 'business') return 'business';
    if (parts[1] === 'archive') return 'archive';
    // Top-level Memory files
    return 'journal';
  }
  if (parts[0] === 'Workspace') return 'workspace';
  return 'archive';
}

function fileId(filePath: string): string {
  // Use filename without extension as ID
  return path.basename(filePath, '.md');
}

export async function parseVault(vaultRoot: string, files: string[]): Promise<GraphData> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  // File ID → relative path mapping for link resolution
  const idToPath = new Map<string, string>();
  const pathToId = new Map<string, string>();

  // Build node list
  for (const file of files) {
    const id = fileId(file);
    nodes.push({
      id,
      label: id,
      category: getCategory(file),
      path: file,
    });
    idToPath.set(id.toLowerCase(), file);
    pathToId.set(file, id);
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  function addEdge(source: string, target: string, type: GraphEdge['type'], strength: number) {
    const key = [source, target].sort().join('::') + '::' + type;
    if (!edgeSet.has(key) && source !== target) {
      edgeSet.add(key);
      edges.push({ source, target, type, strength });
    }
  }

  // Parse wiki-links from each file
  for (const file of files) {
    const fullPath = path.join(vaultRoot, file);
    let content: string;
    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch {
      continue;
    }

    const sourceId = pathToId.get(file)!;
    let match: RegExpExecArray | null;
    const regex = new RegExp(WIKI_LINK_REGEX.source, WIKI_LINK_REGEX.flags);

    while ((match = regex.exec(content)) !== null) {
      const linkTarget = match[1].trim();
      // Try exact match, then case-insensitive
      if (nodeIds.has(linkTarget)) {
        addEdge(sourceId, linkTarget, 'wiki-link', 1.0);
      } else if (idToPath.has(linkTarget.toLowerCase())) {
        const targetFile = idToPath.get(linkTarget.toLowerCase())!;
        const targetId = pathToId.get(targetFile)!;
        addEdge(sourceId, targetId, 'wiki-link', 1.0);
      }
    }
  }

  // Folder-sibling edges: files in the same directory
  const folderGroups = new Map<string, string[]>();
  for (const file of files) {
    const dir = path.dirname(file);
    if (!folderGroups.has(dir)) folderGroups.set(dir, []);
    folderGroups.get(dir)!.push(pathToId.get(file)!);
  }

  for (const [, siblings] of folderGroups) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        addEdge(siblings[i], siblings[j], 'folder-sibling', 0.3);
      }
    }
  }

  // Cross-folder bridge edges: connect closest files between different top-level folders
  const topLevelGroups = new Map<string, string[]>();
  for (const file of files) {
    const topDir = file.split(path.sep)[0];
    if (!topLevelGroups.has(topDir)) topLevelGroups.set(topDir, []);
    topLevelGroups.get(topDir)!.push(pathToId.get(file)!);
  }

  const topDirs = [...topLevelGroups.keys()];
  for (let i = 0; i < topDirs.length; i++) {
    for (let j = i + 1; j < topDirs.length; j++) {
      const groupA = topLevelGroups.get(topDirs[i])!;
      const groupB = topLevelGroups.get(topDirs[j])!;
      // Connect first 2 nodes of each group as bridges
      const bridgeCount = Math.min(2, groupA.length, groupB.length);
      for (let k = 0; k < bridgeCount; k++) {
        addEdge(groupA[k], groupB[k], 'cross-folder', 0.15);
      }
    }
  }

  return { nodes, edges };
}

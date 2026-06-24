import { normalizeRelativePath } from '@/lib/paths';

export interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children?: TreeNode[];
}

export function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const rawFile of files) {
    const file = normalizeRelativePath(rawFile);
    const parts = file.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const nodePath = parts.slice(0, i + 1).join('/');

      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = {
          name,
          path: nodePath,
          isFile,
          children: isFile ? undefined : [],
        };
        current.push(existing);
      }
      if (!isFile && existing.children) {
        current = existing.children;
      }
    }
  }

  function sortTree(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortTree(node.children);
    }
  }
  sortTree(root);
  return root;
}
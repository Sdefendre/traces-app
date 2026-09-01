import { useMemo } from 'react';
import * as THREE from 'three';
import type { GraphNode } from '@/types';

export function useClusterLayout(nodes: GraphNode[]) {
  const layout = useMemo(() => {
    const positions = new Map<string, THREE.Vector3>();
    const categoryCenters = new Map<string, THREE.Vector3>();
    
    // Group nodes by category
    const categories = new Map<string, GraphNode[]>();
    for (const node of nodes) {
      if (!categories.has(node.category)) {
        categories.set(node.category, []);
      }
      categories.get(node.category)!.push(node);
    }

    const categoryKeys = Array.from(categories.keys());
    const numCategories = categoryKeys.length;
    const ringRadius = 160; // Tighter ring for categories

    // Position categories in a ring
    categoryKeys.forEach((key, i) => {
      const angle = (i / numCategories) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      const center = new THREE.Vector3(x, 0, z);
      categoryCenters.set(key, center);
    });

    // Position nodes within their category's sphere
    categories.forEach((catNodes, key) => {
      const center = categoryCenters.get(key)!;
      const numNodes = catNodes.length;
      // Scale sphere radius based on number of nodes (volume ~ N)
      const baseRadius = 12;
      const sphereRadius = baseRadius * Math.pow(numNodes, 1/3);

      catNodes.forEach((node, i) => {
        // Fibonacci sphere distribution for even spacing on surface
        const phi = Math.acos(1 - 2 * (i + 0.5) / numNodes);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;

        // Add some radial variation so it's a solid ball, not just a hollow shell
        // random between 0.5 and 1.0 of the max radius for a tighter ball
        const r = sphereRadius * (0.5 + 0.5 * Math.pow(Math.random(), 1/3));

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        const pos = new THREE.Vector3(
          center.x + x,
          center.y + y,
          center.z + z
        );
        positions.set(node.id, pos);
      });
    });

    return { positions, categoryCenters };
  }, [nodes]);

  return layout;
}

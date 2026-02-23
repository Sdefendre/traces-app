'use client';

import { useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import { useGraphStore } from '@/stores/graph-store';
import { useForceGraph } from './useForceGraph';
import { NeuralNode } from './NeuralNode';
import { Synapse } from './Synapse';
import { BackgroundField } from './BackgroundField';
import type { GraphNode } from '@/types';
import { useRef, useState } from 'react';

export function GraphScene() {
  const { graphData } = useVaultStore();
  const { openFile } = useEditorStore();
  const { hoveredNode } = useGraphStore();
  const { setActiveFile } = useVaultStore();
  const { getPositions, tickRef } = useForceGraph(graphData.nodes, graphData.edges);
  const [, setRenderTick] = useState(0);

  // Build adjacency map for connected-node highlighting
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of graphData.edges) {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    }
    return map;
  }, [graphData.edges]);

  // Node category lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of graphData.nodes) {
      map.set(node.id, node.category);
    }
    return map;
  }, [graphData.nodes]);

  // Connected to hovered?
  const connectedToHovered = useCallback(
    (nodeId: string) => {
      if (!hoveredNode) return false;
      return adjacencyMap.get(hoveredNode)?.has(nodeId) || false;
    },
    [hoveredNode, adjacencyMap]
  );

  const handleSelect = useCallback(
    (node: GraphNode) => {
      setActiveFile(node.path);
      openFile(node.path);
    },
    [openFile, setActiveFile]
  );

  // Trigger re-render when force simulation updates
  useFrame(() => {
    setRenderTick(tickRef.current);
  });

  const positions = getPositions();

  return (
    <>
      <BackgroundField />

      {/* Synapses first (behind nodes) */}
      {graphData.edges.map((edge, i) => {
        const sPos = positions.get(edge.source);
        const tPos = positions.get(edge.target);
        if (!sPos || !tPos) return null;

        const highlighted =
          hoveredNode === edge.source ||
          hoveredNode === edge.target;

        return (
          <Synapse
            key={`edge-${i}`}
            edge={edge}
            sourcePos={[sPos.x, sPos.y, sPos.z]}
            targetPos={[tPos.x, tPos.y, tPos.z]}
            sourceCategory={categoryMap.get(edge.source) || 'archive'}
            highlighted={highlighted}
          />
        );
      })}

      {/* Neural nodes */}
      {graphData.nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        return (
          <NeuralNode
            key={node.id}
            node={node}
            position={[pos.x, pos.y, pos.z]}
            isConnected={connectedToHovered(node.id)}
            onSelect={handleSelect}
          />
        );
      })}
    </>
  );
}

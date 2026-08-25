'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useClusterLayout } from './useClusterLayout';
import { ClusterCard } from './ClusterCard';
import { Synapse } from './Synapse';
import { Text } from '@react-three/drei';
import type { GraphNode } from '@/types';
import * as THREE from 'three';
import type { GraphControlsRef } from './graph-controls';

export function ClusterScene({ controlsRef }: { controlsRef?: GraphControlsRef }) {
  const { graphData } = useVaultStore();
  const { openFile } = useEditorStore();
  const { hoveredNode, selectedNode, setSelectedNode, settings } = useGraphStore();
  const { setActiveFile } = useVaultStore();
  const { positions, categoryCenters } = useClusterLayout(graphData.nodes, graphData.edges);
  const { camera } = useThree();
  const cameraTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const cameraLerpFrames = useRef(0);

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
      setSelectedNode(node.id);
      // Expand notes panel if collapsed so the selected note is visible
      const { editorCollapsed, setEditorCollapsed } = useUIStore.getState();
      if (editorCollapsed) setEditorCollapsed(false);
    },
    [openFile, setActiveFile, setSelectedNode]
  );

  useFrame(() => {
    // When a node is selected, smoothly animate the camera toward it
    if (selectedNode) {
      const pos = positions.get(selectedNode);
      if (pos) {
        const target = new THREE.Vector3(pos.x, pos.y, pos.z);
        if (!cameraTargetPosRef.current || !cameraTargetPosRef.current.equals(target)) {
          cameraTargetPosRef.current = target;
          cameraLerpFrames.current = 0;
        }
      }
    }

    if (cameraTargetPosRef.current && cameraLerpFrames.current < 60) {
      cameraLerpFrames.current++;
      const t = cameraLerpFrames.current / 60;
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      
      if (controlsRef?.current) {
        // Move OrbitControls target to node
        controlsRef.current.target.lerp(cameraTargetPosRef.current, eased * 0.1);
        
        // Move camera closer for cards, but let OrbitControls handle rotation
        const camTarget = cameraTargetPosRef.current.clone().add(new THREE.Vector3(0, 0, 50));
        camera.position.lerp(camTarget, eased * 0.05);
        controlsRef.current.update();
      }
    }
  });

  return (
    <>
      {/* Render Category Titles in the center of their clusters */}
      {Array.from(categoryCenters.entries()).map(([cat, center]) => (
        <Text
          key={`label-${cat}`}
          position={[center.x, center.y + 60, center.z]}
          fontSize={10}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.2}
          outlineColor="#000000"
        >
          {cat.toUpperCase()}
        </Text>
      ))}

      {/* Edges */}
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
            lineThickness={settings.lineThickness}
            lineColor={settings.lineColor}
            variant="holographic"
          />
        );
      })}

      {/* Cards */}
      {graphData.nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        return (
          <ClusterCard
            key={node.id}
            node={node}
            position={[pos.x, pos.y, pos.z]}
            isConnected={connectedToHovered(node.id)}
            onSelect={handleSelect}
            nodeSize={settings.nodeSize}
          />
        );
      })}
    </>
  );
}

// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useTerrainLayout } from './useTerrainLayout';
import { TerrainNode } from './TerrainNode';
import { TerrainMesh } from './TerrainMesh';
import type { GraphNode } from '@/types';
import * as THREE from 'three';
import type { GraphControlsRef } from './graph-controls';

export function TerrainScene({ controlsRef }: { controlsRef?: GraphControlsRef }) {
  const { graphData } = useVaultStore();
  const { openFile } = useEditorStore();
  const { selectedNode, setSelectedNode, settings } = useGraphStore();
  const { setActiveFile } = useVaultStore();
  const { getPositions, config } = useTerrainLayout(graphData.nodes, graphData.edges);
  const cameraTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const cameraLerpFrames = useRef(0);

  const handleSelect = useCallback(
    (node: GraphNode) => {
      setActiveFile(node.path);
      openFile(node.path);
      setSelectedNode(node.id);
      const { editorCollapsed, setEditorCollapsed } = useUIStore.getState();
      if (editorCollapsed) setEditorCollapsed(false);
    },
    [openFile, setActiveFile, setSelectedNode]
  );

  // Smooth camera animation toward selected node (elevated view offset)
  useFrame((state) => {
    const { camera } = state;
    if (selectedNode) {
      const pos = getPositions().get(selectedNode);
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
      const eased = 1 - Math.pow(1 - t, 3);
      
      if (controlsRef?.current) {
        // Move OrbitControls target to node
        controlsRef.current.target.lerp(cameraTargetPosRef.current, eased * 0.1);
        
        // Elevate camera slightly to look down at terrain
        const camTarget = cameraTargetPosRef.current.clone().add(new THREE.Vector3(0, 20, 40));
        camera.position.lerp(camTarget, eased * 0.05);
        controlsRef.current.update();
      }
    }
  });

  const positions = getPositions();

  return (
    <>
      <TerrainMesh config={config} />

      {graphData.nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        return (
          <TerrainNode
            key={node.id}
            node={node}
            position={[pos.x, pos.y, pos.z]}
            onSelect={handleSelect}
            nodeSize={settings.nodeSize}
          />
        );
      })}
    </>
  );
}

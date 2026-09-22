// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphNode, NodeCategory } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import { useGraphStore } from '@/stores/graph-store';

interface TerrainNodeProps {
  node: GraphNode;
  position: [number, number, number];
  onSelect: (node: GraphNode) => void;
  nodeSize: number;
}

export function TerrainNode({ node, position, onSelect, nodeSize }: TerrainNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { hoveredNode, setHoveredNode } = useGraphStore();

  const categoryColor = CATEGORY_COLORS[node.category as NodeCategory] || CATEGORY_COLORS.archive;
  const catColor = useMemo(() => new THREE.Color(categoryColor), [categoryColor]);

  const isHighlighted = hoveredNode === node.id;

  useEffect(() => () => {
    document.body.style.cursor = '';
    if (useGraphStore.getState().hoveredNode === node.id) {
      useGraphStore.getState().setHoveredNode(null);
    }
  }, [node.id]);
  const targetScale = hovered ? 1.4 : isHighlighted ? 1.2 : 1;
  const radius = nodeSize * 0.5;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const t = clock.getElapsedTime();

    // Smooth scale transition
    const currentScale = meshRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.1;

    // Subtle breathing animation
    const breathe = 1 + Math.sin(t * 1.5 + position[0]) * 0.015;
    meshRef.current.scale.setScalar(newScale * breathe);

    // Emissive intensity — higher default to pop on dark terrain
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const targetEmissive = hovered ? 1.2 : isHighlighted ? 0.8 : 0.5;
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.1;

    // Position update
    meshRef.current.position.set(...position);
  });

  return (
    <>
      {/* Core dot — smaller sphere, no ring */}
      <mesh
        ref={meshRef}
        position={position}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setHoveredNode(node.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          setHoveredNode(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={catColor}
          emissive={catColor}
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Label — show on hover only */}
      {hovered && (
        <Html position={position} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              color: '#e5e5e5',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              transform: `translateY(-${radius * 8 + 16}px)`,
              textAlign: 'center',
              textShadow: '0 1px 4px rgba(0,0,0,0.7)',
            }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </>
  );
}

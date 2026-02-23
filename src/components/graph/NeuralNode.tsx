// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphNode, NodeCategory } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';

interface NeuralNodeProps {
  node: GraphNode;
  position: [number, number, number];
  isConnected: boolean;
  onSelect: (node: GraphNode) => void;
  nodeSize: number;
  showLabels: boolean;
}

export function NeuralNode({ node, position, isConnected, onSelect, nodeSize, showLabels }: NeuralNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { hoveredNode, setHoveredNode } = useGraphStore();
  const { darkMode } = useUIStore();

  const categoryColor = CATEGORY_COLORS[node.category as NodeCategory] || CATEGORY_COLORS.archive;
  const catColor = useMemo(() => new THREE.Color(categoryColor), [categoryColor]);
  // Slightly lighter version for the ring
  const ringColor = useMemo(() => new THREE.Color(categoryColor).lerp(new THREE.Color('#ffffff'), 0.3), [categoryColor]);

  const isHighlighted = hoveredNode === node.id || isConnected;

  const targetScale = hovered ? 1.3 : isHighlighted ? 1.1 : 1;
  const radius = nodeSize;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const t = clock.getElapsedTime();

    // Smooth scale transition
    const currentScale = meshRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.1;
    meshRef.current.scale.setScalar(newScale);

    // Gentle breathing pulse
    const breathe = 1 + Math.sin(t * 1.5 + position[0]) * 0.03;
    meshRef.current.scale.setScalar(newScale * breathe);

    // Emissive intensity
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const targetEmissive = hovered ? 1.0 : isHighlighted ? 0.6 : 0.3;
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.1;

    // Position update
    meshRef.current.position.set(...position);

    // Ring
    if (ringRef.current) {
      ringRef.current.position.set(...position);
      ringRef.current.scale.setScalar(newScale * breathe);
      const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
      const targetRingOpacity = hovered ? 0.5 : isHighlighted ? 0.3 : 0.15;
      ringMat.opacity += (targetRingOpacity - ringMat.opacity) * 0.1;
    }
  });

  return (
    <>
      {/* Core node — clean sphere */}
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
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={catColor}
          emissive={catColor}
          emissiveIntensity={0.3}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {/* Subtle ring outline */}
      <mesh ref={ringRef} position={position}>
        <ringGeometry args={[radius * 1.3, radius * 1.5, 32]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      {showLabels && (
        <Html position={position} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              color: darkMode ? '#e5e5e5' : '#333',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '10px',
              fontWeight: hovered ? 600 : 400,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              transform: `translateY(-${radius * 8 + 14}px)`,
              textAlign: 'center',
              opacity: hovered ? 1 : 0.7,
              textShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.8)',
            }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </>
  );
}

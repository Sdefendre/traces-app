// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphNode, NodeCategory } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import { useGraphStore } from '@/stores/graph-store';

interface NeuralNodeProps {
  node: GraphNode;
  position: [number, number, number];
  isConnected: boolean;
  onSelect: (node: GraphNode) => void;
}

export function NeuralNode({ node, position, isConnected, onSelect }: NeuralNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { hoveredNode, setHoveredNode } = useGraphStore();

  const color = CATEGORY_COLORS[node.category as NodeCategory] || CATEGORY_COLORS.archive;
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  const isHighlighted = hoveredNode === node.id || isConnected;
  const baseEmissive = isHighlighted ? 1.2 : 0.6;
  const targetEmissive = hovered ? 1.5 : baseEmissive;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const t = clock.getElapsedTime();

    // Breathing animation — sine wave scale pulse
    const breathe = 1 + Math.sin(t * 1.5 + node.id.length * 0.5) * 0.08;
    const hoverScale = hovered ? 1.4 : 1;
    const scale = breathe * hoverScale;
    meshRef.current.scale.setScalar(scale);

    // Smooth emissive intensity
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.1;

    // Position update
    meshRef.current.position.set(...position);

    // Glow shell
    if (glowRef.current) {
      glowRef.current.position.set(...position);
      glowRef.current.scale.setScalar(scale * 1.8);
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMat.opacity = hovered ? 0.25 : isHighlighted ? 0.15 : 0.08;
    }
  });

  return (
    <>
      {/* Core sphere */}
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
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color={threeColor}
          emissive={threeColor}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Outer glow shell */}
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Label on hover */}
      {hovered && (
        <Html position={position} center style={{ pointerEvents: 'none' }}>
          <div
            className="px-2 py-1 rounded text-xs whitespace-nowrap"
            style={{
              background: 'rgba(10, 10, 15, 0.9)',
              border: `1px solid ${color}`,
              color: color,
              transform: 'translateY(-24px)',
              textShadow: `0 0 8px ${color}`,
            }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </>
  );
}

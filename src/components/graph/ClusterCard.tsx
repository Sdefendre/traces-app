'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphNode } from '@/types';
import { CATEGORY_COLORS } from '@/types';

interface ClusterCardProps {
  node: GraphNode;
  position: [number, number, number];
  isConnected: boolean;
  onSelect: (node: GraphNode) => void;
  nodeSize: number;
}

export function ClusterCard({ node, position, isConnected, onSelect, nodeSize }: ClusterCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      // Make cards always face the camera
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  const baseColor = CATEGORY_COLORS[node.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.archive;
  const scale = hovered ? 1.2 : 1;
  const cardWidth = 10 * nodeSize;
  const cardHeight = 14 * nodeSize;

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      <RoundedBox
        args={[cardWidth, cardHeight, 0.5]}
        radius={0.5}
        smoothness={4}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button === 0) onSelect(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={hovered || isConnected ? 0.6 : 0.1}
          transparent
          opacity={0.8}
        />
        
        {/* Title Text */}
        <Text
          position={[0, cardHeight / 2 - 2, 0.3]} // top-aligned
          fontSize={1.2 * nodeSize}
          color="#ffffff"
          anchorX="center"
          anchorY="top"
          maxWidth={cardWidth - 2}
          textAlign="center"
        >
          {node.label}
        </Text>
        
        {/* Placeholder for content lines representing file contents */}
        <group position={[0, 0, 0.3]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[0, cardHeight / 4 - 2 - i * 1.5, 0]}>
              <planeGeometry args={[cardWidth - 4, 0.5]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
            </mesh>
          ))}
        </group>
      </RoundedBox>
    </group>
  );
}

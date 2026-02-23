// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GraphEdge } from '@/types';
import { useUIStore } from '@/stores/ui-store';

interface SynapseProps {
  edge: GraphEdge;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  sourceCategory: string;
  highlighted: boolean;
  lineThickness: number;
}

// Reusable vectors to avoid allocations per frame
const _start = new THREE.Vector3();
const _end = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

export function Synapse({ edge, sourcePos, targetPos, sourceCategory, highlighted, lineThickness }: SynapseProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { darkMode } = useUIStore();
  const lineColor = useMemo(() => new THREE.Color(darkMode ? '#555555' : '#37352f'), [darkMode]);

  // Thickness based on edge type
  const baseRadius = edge.type === 'wiki-link' ? 0.25 : edge.type === 'folder-sibling' ? 0.18 : 0.12;
  const radius = baseRadius * lineThickness;

  useFrame(() => {
    if (!meshRef.current) return;

    _start.set(sourcePos[0], sourcePos[1], sourcePos[2]);
    _end.set(targetPos[0], targetPos[1], targetPos[2]);

    // Position at midpoint
    _mid.copy(_start).add(_end).multiplyScalar(0.5);
    meshRef.current.position.copy(_mid);

    // Scale Y to the distance
    const dist = _start.distanceTo(_end);
    meshRef.current.scale.set(1, dist, 1);

    // Rotate to align with direction
    _dir.copy(_end).sub(_start).normalize();
    _quat.setFromUnitVectors(_up, _dir);
    meshRef.current.quaternion.copy(_quat);

    // Opacity
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    const targetOpacity = highlighted ? 0.8 : 0.5;
    mat.opacity += (targetOpacity - mat.opacity) * 0.1;
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[radius, radius, 1, 6, 1]} />
      <meshBasicMaterial
        color={lineColor}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

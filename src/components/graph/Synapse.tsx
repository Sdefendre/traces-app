// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GraphEdge } from '@/types';
import type { NodePosition } from './useForceGraph';

interface SynapseProps {
  edge: GraphEdge;
  getPositions?: () => Map<string, NodePosition>;
  sourcePos?: [number, number, number];
  targetPos?: [number, number, number];
  sourceCategory: string;
  highlighted: boolean;
  lineThickness: number;
  lineColor: string;
  variant?: 'default' | 'holographic';
}

const _start = new THREE.Vector3();
const _end = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

export function Synapse({ edge, getPositions, sourcePos, targetPos, sourceCategory, highlighted, lineThickness, lineColor: lineColorProp, variant = 'default' }: SynapseProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const defaultColor = useMemo(() => new THREE.Color(lineColorProp), [lineColorProp]);
  const holoScratch = useMemo(() => new THREE.Color(), []);

  const baseRadius = edge.type === 'wiki-link' ? 0.25 : edge.type === 'folder-sibling' ? 0.18 : 0.12;
  const radius = baseRadius * lineThickness * (variant === 'holographic' ? 1.5 : 1); // Make holographic slightly thicker

  useFrame(() => {
    if (!meshRef.current) return;

    // Positions from simulation ref each frame — no React setState in useFrame.
    if (getPositions) {
      const s = getPositions().get(edge.source);
      const t = getPositions().get(edge.target);
      if (!s || !t) return;
      _start.set(s.x, s.y, s.z);
      _end.set(t.x, t.y, t.z);
    } else if (sourcePos && targetPos) {
      _start.set(sourcePos[0], sourcePos[1], sourcePos[2]);
      _end.set(targetPos[0], targetPos[1], targetPos[2]);
    } else {
      return;
    }

    _mid.copy(_start).add(_end).multiplyScalar(0.5);
    meshRef.current.position.copy(_mid);

    const dist = _start.distanceTo(_end);
    meshRef.current.scale.set(1, dist, 1);

    _dir.copy(_end).sub(_start).normalize();
    _quat.setFromUnitVectors(_up, _dir);
    meshRef.current.quaternion.copy(_quat);

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (variant === 'holographic') {
      const percent = Math.max(0, Math.min(1, dist / 400));
      if (percent < 0.5) {
        holoScratch.set('#06b6d4').lerp(new THREE.Color('#a855f7'), percent * 2);
      } else {
        holoScratch.set('#a855f7').lerp(new THREE.Color('#d946ef'), (percent - 0.5) * 2);
      }
      mat.color.copy(holoScratch);
    } else {
      mat.color.copy(defaultColor);
    }
    mat.needsUpdate = true;
    
    const targetOpacity = highlighted ? 0.8 : (variant === 'holographic' ? 0.4 : 0.5);
    mat.opacity += (targetOpacity - mat.opacity) * 0.1;
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[radius, radius, 1, 6, 1]} />
      <meshBasicMaterial
        color={defaultColor}
        transparent
        opacity={variant === 'holographic' ? 0.4 : 0.5}
        depthWrite={false}
        blending={variant === 'holographic' ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

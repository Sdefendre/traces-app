// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GraphEdge, NodeCategory } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import { useGraphStore } from '@/stores/graph-store';

interface SynapseProps {
  edge: GraphEdge;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  sourceCategory: string;
  highlighted: boolean;
}

export function Synapse({ edge, sourcePos, targetPos, sourceCategory, highlighted }: SynapseProps) {
  const lineRef = useRef<THREE.Line>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const color = CATEGORY_COLORS[sourceCategory as NodeCategory] || '#666680';
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  const particleCount = edge.type === 'wiki-link' ? 8 : edge.type === 'folder-sibling' ? 3 : 1;

  // Particle positions along the curve
  const particlePositions = useMemo(() => {
    return new Float32Array(particleCount * 3);
  }, [particleCount]);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;

    const t = clock.getElapsedTime();

    // Update line geometry between current positions
    const positions = lineRef.current.geometry.attributes.position;
    if (positions) {
      // Midpoint with offset for curve effect
      const midX = (sourcePos[0] + targetPos[0]) / 2;
      const midY = (sourcePos[1] + targetPos[1]) / 2 + 3;
      const midZ = (sourcePos[2] + targetPos[2]) / 2;

      const arr = positions.array as Float32Array;
      arr[0] = sourcePos[0]; arr[1] = sourcePos[1]; arr[2] = sourcePos[2];
      arr[3] = midX; arr[4] = midY; arr[5] = midZ;
      arr[6] = targetPos[0]; arr[7] = targetPos[1]; arr[8] = targetPos[2];
      positions.needsUpdate = true;
    }

    // Animate line opacity
    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    const targetOpacity = highlighted ? 0.6 : edge.type === 'wiki-link' ? 0.3 : 0.1;
    mat.opacity += (targetOpacity - mat.opacity) * 0.1;

    // Animate particles flowing along the curve
    if (particlesRef.current) {
      const pPositions = particlesRef.current.geometry.attributes.position;
      if (pPositions) {
        const arr = pPositions.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const phase = (t * 0.5 + i / particleCount) % 1;
          // Quadratic bezier interpolation
          const midX = (sourcePos[0] + targetPos[0]) / 2;
          const midY = (sourcePos[1] + targetPos[1]) / 2 + 3;
          const midZ = (sourcePos[2] + targetPos[2]) / 2;

          const t1 = 1 - phase;
          arr[i * 3] = t1 * t1 * sourcePos[0] + 2 * t1 * phase * midX + phase * phase * targetPos[0];
          arr[i * 3 + 1] = t1 * t1 * sourcePos[1] + 2 * t1 * phase * midY + phase * phase * targetPos[1];
          arr[i * 3 + 2] = t1 * t1 * sourcePos[2] + 2 * t1 * phase * midZ + phase * phase * targetPos[2];
        }
        pPositions.needsUpdate = true;
      }

      const pMat = particlesRef.current.material as THREE.PointsMaterial;
      pMat.opacity = highlighted ? 0.8 : 0.3;
    }
  });

  return (
    <>
      {/* Connection line */}
      <line ref={lineRef as React.RefObject<THREE.Line>}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(9), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={threeColor}
          transparent
          opacity={0.15}
          linewidth={1}
        />
      </line>

      {/* Flowing particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={threeColor}
          size={0.5}
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
}

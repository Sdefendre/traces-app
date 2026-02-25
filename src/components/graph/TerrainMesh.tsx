// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getElevation, TerrainConfig } from './useTerrainLayout';
import { useGraphStore } from '@/stores/graph-store';

interface TerrainMeshProps {
  config: TerrainConfig;
}

export function TerrainMesh({ config }: TerrainMeshProps) {
  const wireRef = useRef<THREE.Mesh>(null);
  const mousePos = useRef(new THREE.Vector3(0, -9999, 0));
  const lowPowerMode = useGraphStore((s) => s.settings.lowPowerMode);

  const { geometry, colors, originalPositions, currentY } = useMemo(() => {
    const size = config.maxRadius * 2.5; // Scale grid to encompass mountain
    const segments = lowPowerMode ? 50 : 120; // Lower resolution in low power mode
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const posArr = geo.attributes.position;
    const vertexCount = posArr.count;

    const colorAttr = new Float32Array(vertexCount * 3);
    const tmpColor = new THREE.Color();
    const originalPositions = new Float32Array(vertexCount * 3);
    const currentY = new Float32Array(vertexCount);

    for (let i = 0; i < vertexCount; i++) {
      const vx = posArr.getX(i);
      const vz = posArr.getZ(i);

      // Determine height from our layout function
      const vy = getElevation(vx, vz, config);
      posArr.setY(i, vy);
      
      originalPositions[i * 3] = vx;
      originalPositions[i * 3 + 1] = vy;
      originalPositions[i * 3 + 2] = vz;
      currentY[i] = vy;

      // Height percent mapped to a color gradient relative to peak
      const heightPercent = Math.max(0, Math.min(1, (vy + 5) / (config.peakHeight + 5)));

      // Holographic synthwave gradient:
      // Base: Magenta (#d946ef) -> Mid: Purple (#a855f7) -> Peak: Cyan (#06b6d4)
      if (heightPercent < 0.5) {
        // lower half
        tmpColor.set('#d946ef').lerp(new THREE.Color('#a855f7'), heightPercent * 2);
      } else {
        // upper half
        tmpColor.set('#a855f7').lerp(new THREE.Color('#06b6d4'), (heightPercent - 0.5) * 2);
      }

      colorAttr[i * 3] = tmpColor.r;
      colorAttr[i * 3 + 1] = tmpColor.g;
      colorAttr[i * 3 + 2] = tmpColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    geo.computeVertexNormals();

    return { geometry: geo, colors: colorAttr, originalPositions, currentY };
  }, [config, lowPowerMode]);

  // Liquid hover physics + scanning wireframe effect (simplified in low power mode)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (wireRef.current && wireRef.current.material) {
      wireRef.current.material.opacity = lowPowerMode ? 0.5 : 0.45 + Math.sin(t * 1.5) * 0.15;
    }

    if (lowPowerMode) return; // Skip expensive per-vertex ripple updates

    let needsUpdate = false;
    const posArr = geometry.attributes.position;
    const isHovering = mousePos.current.y > -9000;

    for (let i = 0; i < posArr.count; i++) {
      const vx = originalPositions[i * 3];
      const vy = originalPositions[i * 3 + 1];
      const vz = originalPositions[i * 3 + 2];

      let targetY = vy;

      if (isHovering) {
        const dx = vx - mousePos.current.x;
        const dz = vz - mousePos.current.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Liquid ripple effect if close to mouse
        if (dist < 60) {
          // Push down like a blanket
          const push = Math.exp(-(dist * dist) / 800) * -12;
          // Radiating ripples
          const ripple = Math.cos(dist * 0.4 - t * 6) * 3 * Math.exp(-dist * 0.05);
          targetY += push + ripple;
        }
      }

      // Smoothly lerp current position to target position for organic physics
      const diff = targetY - currentY[i];
      if (Math.abs(diff) > 0.05) {
        currentY[i] += diff * 0.15;
        posArr.setY(i, currentY[i]);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      posArr.needsUpdate = true;
      geometry.computeVertexNormals();
    }
  });

  return (
    <group>
      {/* Invisible raycast surface for pointer events, slightly larger to catch edges */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => mousePos.current.copy(e.point)}
        onPointerOut={() => mousePos.current.set(0, -9999, 0)}
        visible={false} // Hidden, only for raycasting physics
      >
        <planeGeometry args={[config.maxRadius * 2.5, config.maxRadius * 2.5]} />
        <meshBasicMaterial />
      </mesh>

      {/* Solid dark under-layer to prevent seeing the wireframe from behind/through the mountain */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color="#030308" // Deep space/void color
          side={THREE.DoubleSide}
          depthWrite={true}
        />
      </mesh>

      {/* Glowing Holographic Wireframe Layer */}
      <mesh ref={wireRef} geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          wireframe
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

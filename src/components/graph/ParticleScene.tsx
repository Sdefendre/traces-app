'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { advanceParticleMorph, createParticleVisualBuffers } from '../../../shared/particle-rendering';
import { useVaultStore } from '@/stores/vault-store';
import { useEditorStore } from '@/stores/editor-store';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { CATEGORY_COLORS, type GraphNode, type NodeCategory } from '@/types';
import type { GraphControlsRef } from './graph-controls';
import { useParticleLayout } from './useParticleLayout';

const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute float particleSize;
  attribute float emphasis;
  varying vec3 vColor;
  varying float vEmphasis;

  void main() {
    vColor = color;
    vEmphasis = emphasis;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float perspective = 300.0 / max(1.0, -viewPosition.z);
    gl_PointSize = clamp(particleSize * emphasis * perspective, 2.0, 64.0);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vEmphasis;

  void main() {
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
    if (distanceFromCenter > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.2, distanceFromCenter);
    float halo = 1.0 - smoothstep(0.1, 0.5, distanceFromCenter);
    float alpha = core * 0.9 + halo * 0.5;
    float brightness = core * 1.5 + halo * 0.8 + (vEmphasis - 1.0) * 0.45;
    gl_FragColor = vec4(vColor * brightness, alpha);
  }
`;

interface ParticleTooltipProps {
  node: GraphNode;
  index: number;
  positions: Float32Array;
}

function formatNoteSize(fileSize: number): string {
  if (!Number.isFinite(fileSize) || fileSize <= 0) return 'Size unavailable';
  return `${Math.round(fileSize).toLocaleString()} characters`;
}

function ParticleTooltip({ node, index, positions }: ParticleTooltipProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const offset = index * 3;
    if (!groupRef.current || offset + 2 >= positions.length) return;
    groupRef.current.position.set(
      positions[offset],
      positions[offset + 1],
      positions[offset + 2],
    );
  });

  return (
    <group ref={groupRef}>
      <Html center style={{ pointerEvents: 'none' }}>
        <div
          role="tooltip"
          className="-translate-y-7 whitespace-nowrap rounded-lg border border-white/[0.08] bg-[rgba(5,5,16,0.82)] px-2.5 py-1.5 text-center shadow-lg backdrop-blur-md"
        >
          <div className="text-[11px] font-semibold text-zinc-100">{node.label}</div>
          <div className="text-[9px] text-zinc-400">{formatNoteSize(node.fileSize)}</div>
        </div>
      </Html>
    </group>
  );
}

function createEmphasisBuffer(
  nodeAtIndex: readonly string[],
  hoveredNode: string | null,
  selectedNode: string | null,
): Float32Array {
  const emphasis = new Float32Array(nodeAtIndex.length);
  for (let index = 0; index < nodeAtIndex.length; index += 1) {
    const id = nodeAtIndex[index];
    emphasis[index] = id === selectedNode ? 1.65 : id === hoveredNode ? 1.35 : 1;
  }
  return emphasis;
}

function positionBoundsRadius(source: Float32Array, target: Float32Array): number {
  let maxSquaredRadius = 1;
  for (const positions of [source, target]) {
    for (let offset = 0; offset < positions.length; offset += 3) {
      const squaredRadius =
        positions[offset] ** 2 +
        positions[offset + 1] ** 2 +
        positions[offset + 2] ** 2;
      maxSquaredRadius = Math.max(maxSquaredRadius, squaredRadius);
    }
  }
  return Math.sqrt(maxSquaredRadius) + 12;
}

interface ParticleSceneProps {
  controlsRef?: GraphControlsRef;
}

export function ParticleScene({ controlsRef }: ParticleSceneProps) {
  const graphData = useVaultStore((state) => state.graphData);
  const setActiveFile = useVaultStore((state) => state.setActiveFile);
  const openFile = useEditorStore((state) => state.openFile);
  const particleShape = useGraphStore((state) => state.particleShape);
  const hoveredNode = useGraphStore((state) => state.hoveredNode);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const setHoveredNode = useGraphStore((state) => state.setHoveredNode);
  const setSelectedNode = useGraphStore((state) => state.setSelectedNode);
  const lowPowerMode = useGraphStore((state) => state.settings.lowPowerMode);
  const nodeSize = useGraphStore((state) => state.settings.nodeSize);
  const { camera, gl, raycaster } = useThree();
  const runtime = useParticleLayout(
    graphData.nodes,
    graphData.edges,
    particleShape,
    lowPowerMode,
  );
  const { layout } = runtime;
  const pointsRef = useRef<THREE.Points>(null);
  const cameraFocusSecondsRef = useRef(0);
  const focusTargetRef = useRef(new THREE.Vector3());
  const desiredCameraRef = useRef(new THREE.Vector3());
  const cameraOffsetRef = useRef(new THREE.Vector3(0, 0, 45));

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of graphData.nodes) map.set(node.id, node);
    return map;
  }, [graphData.nodes]);

  const sizeScale = Number.isFinite(nodeSize)
    ? Math.max(1 / 3, Math.min(8 / 3, nodeSize / 1.5))
    : 1;
  const visuals = useMemo(() => {
    const nodes = graphData.nodes.map((node) => ({
      id: node.id,
      fileSize: node.fileSize,
      color: CATEGORY_COLORS[node.category as NodeCategory] ?? CATEGORY_COLORS.archive,
    }));
    return createParticleVisualBuffers(nodes, layout.nodeAtIndex, {
      minPointSize: 3 * sizeScale,
      maxPointSize: 9 * sizeScale,
    });
  }, [graphData.nodes, layout.nodeAtIndex, sizeScale]);
  const emphasis = useMemo(
    () => createEmphasisBuffer(layout.nodeAtIndex, hoveredNode, selectedNode),
    [hoveredNode, layout.nodeAtIndex, selectedNode],
  );
  const boundsRadius = useMemo(
    () => positionBoundsRadius(layout.sourcePositions, layout.targetPositions),
    [layout.sourcePositions, layout.targetPositions],
  );

  const handleSelect = useCallback((node: GraphNode) => {
    setActiveFile(node.path);
    void openFile(node.path);
    setSelectedNode(node.id);
    cameraFocusSecondsRef.current = 1.15;
    const { editorCollapsed, setEditorCollapsed } = useUIStore.getState();
    if (editorCollapsed) setEditorCollapsed(false);
  }, [openFile, setActiveFile, setSelectedNode]);

  const setHoverFromIndex = useCallback((index: number | undefined) => {
    const nextHoveredNode = index !== undefined ? layout.nodeAtIndex[index] ?? null : null;
    if (useGraphStore.getState().hoveredNode !== nextHoveredNode) {
      setHoveredNode(nextHoveredNode);
    }
    gl.domElement.style.cursor = nextHoveredNode ? 'pointer' : '';
  }, [gl.domElement, layout.nodeAtIndex, setHoveredNode]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHoverFromIndex(event.index);
  }, [setHoverFromIndex]);

  const handlePointerOut = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHoverFromIndex(undefined);
  }, [setHoverFromIndex]);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.nativeEvent.button !== 0 || event.index === undefined) return;
    const node = nodeMap.get(layout.nodeAtIndex[event.index]);
    if (node) handleSelect(node);
  }, [handleSelect, layout.nodeAtIndex, nodeMap]);

  useEffect(() => {
    cameraFocusSecondsRef.current = selectedNode ? 1.15 : 0;
  }, [runtime.revision, selectedNode]);

  useEffect(() => () => {
    gl.domElement.style.cursor = '';
    useGraphStore.getState().setHoveredNode(null);
  }, [gl.domElement]);

  useEffect(() => {
    const previousThreshold = raycaster.params.Points?.threshold;
    raycaster.params.Points = { threshold: 2.5 };
    return () => {
      raycaster.params.Points = { threshold: previousThreshold ?? 1 };
    };
  }, [raycaster]);

  useLayoutEffect(() => {
    if (!pointsRef.current) return;
    pointsRef.current.geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(),
      boundsRadius,
    );
  }, [boundsRadius, runtime.revision]);

  useFrame((_state, delta) => {
    if (runtime.morphProgress.current < 1) {
      runtime.morphProgress.current = advanceParticleMorph(
        layout.positions,
        layout.sourcePositions,
        layout.targetPositions,
        runtime.morphProgress.current,
        Math.min(delta, 0.1),
      );
      const positionAttribute = pointsRef.current?.geometry.getAttribute('position');
      if (positionAttribute) positionAttribute.needsUpdate = true;
    }

    if (!selectedNode || cameraFocusSecondsRef.current <= 0) return;
    const selectedIndex = layout.indexOfNode.get(selectedNode);
    const controls = controlsRef?.current;
    if (selectedIndex === undefined || !controls) return;

    const offset = selectedIndex * 3;
    focusTargetRef.current.set(
      layout.positions[offset],
      layout.positions[offset + 1],
      layout.positions[offset + 2],
    );
    desiredCameraRef.current.copy(focusTargetRef.current).add(cameraOffsetRef.current);

    const frameDelta = Math.min(delta, 0.1);
    controls.target.lerp(focusTargetRef.current, 1 - Math.exp(-frameDelta * 6));
    camera.position.lerp(desiredCameraRef.current, 1 - Math.exp(-frameDelta * 4));
    controls.update();
    cameraFocusSecondsRef.current = Math.max(0, cameraFocusSecondsRef.current - delta);
  });

  if (layout.nodeAtIndex.length === 0) {
    return (
      <Html center style={{ pointerEvents: 'none' }}>
        <div
          role="status"
          className="whitespace-nowrap rounded-xl border border-white/[0.08] bg-[rgba(5,5,16,0.72)] px-4 py-2 text-center text-xs text-zinc-400 shadow-lg backdrop-blur-md"
        >
          No notes to arrange in Particle View
        </div>
      </Html>
    );
  }

  const hoveredIndex = hoveredNode ? layout.indexOfNode.get(hoveredNode) : undefined;
  const hoveredNote = hoveredNode ? nodeMap.get(hoveredNode) : undefined;

  return (
    <>
      <points
        ref={pointsRef}
        frustumCulled={false}
        onPointerOver={handlePointerMove}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <bufferGeometry key={runtime.revision}>
          <bufferAttribute
            attach="attributes-position"
            args={[layout.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[visuals.colors, 3]}
          />
          <bufferAttribute
            key={`particle-size-${runtime.revision}-${sizeScale}`}
            attach="attributes-particleSize"
            args={[visuals.sizes, 1]}
          />
          <bufferAttribute
            key={`particle-emphasis-${runtime.revision}-${hoveredNode ?? 'none'}-${selectedNode ?? 'none'}`}
            attach="attributes-emphasis"
            args={[emphasis, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={PARTICLE_VERTEX_SHADER}
          fragmentShader={PARTICLE_FRAGMENT_SHADER}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {hoveredNote && hoveredIndex !== undefined && (
        <ParticleTooltip
          node={hoveredNote}
          index={hoveredIndex}
          positions={layout.positions}
        />
      )}
    </>
  );
}

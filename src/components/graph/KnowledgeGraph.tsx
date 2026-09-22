'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { GraphScene } from './GraphScene';
import { ClusterScene } from './ClusterScene';
import { TerrainScene } from './TerrainScene';
import { ParticleScene } from './ParticleScene';

import { BackgroundField } from './BackgroundField';
import { GraphEmptyState } from './GraphEmptyState';
import { useGraphStore } from '@/stores/graph-store';
import { useVaultStore } from '@/stores/vault-store';
import * as THREE from 'three';
import type { GraphControls, GraphControlsRef } from './graph-controls';

/** Reset orbit camera when switching Galaxy / Terrain / Cluster / Particle. */
function ResetFramingOnViewChange({
  viewMode,
  controlsRef,
}: {
  viewMode: string;
  controlsRef: GraphControlsRef;
}) {
  const { camera } = useThree();
  const prevView = useRef(viewMode);

  useEffect(() => {
    if (prevView.current === viewMode) return;
    prevView.current = viewMode;
    camera.position.set(0, 0, 160);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    // Stop leftover fly-to from the previous view, which left particles as specks.
    useGraphStore.setState({ selectedNode: null, zoomDistance: 160, cameraTarget: null });
  }, [viewMode, camera, controlsRef]);

  return null;
}
function CameraController({
  controlsRef,
  zoomAnimatingRef,
}: {
  controlsRef: GraphControlsRef;
  zoomAnimatingRef: RefObject<boolean>;
}) {
  const zoomDistance = useGraphStore((state) => state.zoomDistance);
  const { camera } = useThree();
  const prevZoomRef = useRef(zoomDistance);
  
  useFrame(() => {
    if (!controlsRef.current || zoomDistance === prevZoomRef.current) return;
    const currentDist = camera.position.distanceTo(controlsRef.current.target);
    // The scroll wheel already moved the camera. Accept that distance as the new baseline.
    if (!zoomAnimatingRef.current && Math.abs(zoomDistance - currentDist) < 1) {
      prevZoomRef.current = zoomDistance;
      return;
    }
    zoomAnimatingRef.current = true;
    const dir = camera.position.clone().sub(controlsRef.current.target).normalize();
    const newDist = currentDist + (zoomDistance - currentDist) * 0.1;

    if (Math.abs(zoomDistance - currentDist) > 0.5) {
      camera.position.copy(controlsRef.current.target.clone().add(dir.multiplyScalar(newDist)));
      controlsRef.current.update();
    } else {
      prevZoomRef.current = zoomDistance;
      zoomAnimatingRef.current = false;
    }
  });

  return null;
}

export function KnowledgeGraph() {
  const settings = useGraphStore((state) => state.settings);
  const viewMode = useGraphStore((state) => state.viewMode);
  const hasNotes = useVaultStore((state) => state.graphData.nodes.length > 0);
  const controlsRef = useRef<GraphControls>(null);
  const zoomAnimatingRef = useRef(false);

  // Always deep space navy-black regardless of theme
  const bgColor = useMemo(() => new THREE.Color('#050510'), []);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 160], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: !settings.lowPowerMode, alpha: false }}
        dpr={settings.lowPowerMode ? [1, 1] : undefined}
        scene={{ background: bgColor }}
        onPointerMissed={() => {
          useGraphStore.getState().setSelectedNode(null);
          useGraphStore.getState().setCameraTarget(null);
        }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[80, 80, 80]} color="#aabbff" intensity={0.3} />
        <pointLight position={[-60, -40, 60]} color="#8899dd" intensity={0.2} />

        <BackgroundField />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={10}
          maxDistance={1000}
          enablePan={true}
          autoRotate={settings.autoRotate}
          autoRotateSpeed={settings.rotateSpeed}
          onChange={() => {
            if (zoomAnimatingRef.current) return;
            const controls = controlsRef.current;
            if (!controls) return;
            const distance = controls.object.position.distanceTo(controls.target);
            useGraphStore.setState({ zoomDistance: distance });
          }}
        />

        <CameraController controlsRef={controlsRef} zoomAnimatingRef={zoomAnimatingRef} />
        <ResetFramingOnViewChange viewMode={viewMode} controlsRef={controlsRef} />
        
        {viewMode === 'galaxy' && <GraphScene controlsRef={controlsRef} />}
        {viewMode === 'terrain' && <TerrainScene controlsRef={controlsRef} />}
        {viewMode === 'cluster' && <ClusterScene controlsRef={controlsRef} />}
        {viewMode === 'particle' && <ParticleScene controlsRef={controlsRef} />}

        {/* Bloom disabled in low power mode — post-processing is GPU-intensive */}
        {!settings.lowPowerMode && (
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.1}
              luminanceSmoothing={0.9}
              intensity={1.0}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>

      {!hasNotes && <GraphEmptyState />}
    </div>
  );
}

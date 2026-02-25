// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { GraphScene } from './GraphScene';
import { ClusterScene } from './ClusterScene';
import { TerrainScene } from './TerrainScene';

import { BackgroundField } from './BackgroundField';
import { useGraphStore } from '@/stores/graph-store';
import * as THREE from 'three';

/** Centralized Camera Controller to handle programmatic zoom and flying to nodes without fighting OrbitControls */
function CameraController({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { zoomDistance, selectedNode, viewMode } = useGraphStore();
  const { camera } = useThree();
  const prevZoomRef = useRef(zoomDistance);
  const prevNodeRef = useRef(selectedNode);
  
  // Need to get access to positions depending on viewMode
  // For simplicity we will handle the "fly to node" locally in the scenes themselves, 
  // but we must update OrbitControls target instead of just the camera!
  
  useFrame(() => {
    // Handle programmatic zoom from buttons
    if (controlsRef.current && zoomDistance !== prevZoomRef.current) {
      const dir = camera.position.clone().sub(controlsRef.current.target).normalize();
      const currentDist = camera.position.distanceTo(controlsRef.current.target);
      const newDist = currentDist + (zoomDistance - currentDist) * 0.1;
      
      if (Math.abs(zoomDistance - currentDist) > 0.5) {
        camera.position.copy(controlsRef.current.target.clone().add(dir.multiplyScalar(newDist)));
        controlsRef.current.update();
      } else {
        prevZoomRef.current = zoomDistance;
      }
    }
  });

  return null;
}

export function KnowledgeGraph() {
  const { settings, viewMode } = useGraphStore();
  const controlsRef = useRef(null);

  // Always deep space navy-black regardless of theme
  const bgColor = useMemo(() => new THREE.Color('#050510'), []);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 160], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        scene={{ background: bgColor }}
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
        />

        <CameraController controlsRef={controlsRef} />
        
        {viewMode === 'galaxy' && <GraphScene controlsRef={controlsRef} />}
        {viewMode === 'terrain' && <TerrainScene controlsRef={controlsRef} />}
        {viewMode === 'cluster' && <ClusterScene controlsRef={controlsRef} />}

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            intensity={1.0}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

    </div>
  );
}

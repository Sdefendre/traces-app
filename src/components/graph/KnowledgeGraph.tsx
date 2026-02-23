// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { GraphScene } from './GraphScene';
import { BackgroundField } from './BackgroundField';
import { useGraphStore } from '@/stores/graph-store';
import * as THREE from 'three';

/** Reads zoomDistance from store and smoothly moves the camera */
function ZoomController() {
  const { zoomDistance } = useGraphStore();
  const { camera } = useThree();

  useFrame(() => {
    const dir = camera.position.clone().normalize();
    const currentDist = camera.position.length();
    const newDist = currentDist + (zoomDistance - currentDist) * 0.08;
    camera.position.copy(dir.multiplyScalar(newDist));
  });

  return null;
}

export function KnowledgeGraph() {
  const { settings } = useGraphStore();

  // Always deep space navy-black regardless of theme
  const bgColor = useMemo(() => new THREE.Color('#050510'), []);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 160], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        scene={{ background: bgColor }}
      >
        {/* Space lighting — dim ambient with blue-tinted point lights */}
        <ambientLight intensity={0.3} />
        <pointLight position={[80, 80, 80]} color="#aabbff" intensity={0.3} />
        <pointLight position={[-60, -40, 60]} color="#8899dd" intensity={0.2} />

        <BackgroundField />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={20}
          maxDistance={500}
          enablePan={true}
          autoRotate={settings.autoRotate}
          autoRotateSpeed={settings.rotateSpeed}
        />

        <ZoomController />
        <GraphScene />

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

// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { GraphScene } from './GraphScene';
import { BackgroundField } from './BackgroundField';
import { useUIStore } from '@/stores/ui-store';
import { useGraphStore } from '@/stores/graph-store';
import * as THREE from 'three';

export function KnowledgeGraph() {
  const { darkMode } = useUIStore();
  const { settings } = useGraphStore();

  const bgColor = useMemo(
    () => new THREE.Color(darkMode ? '#1a1a1a' : '#f7f7f8'),
    [darkMode],
  );

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 160], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        scene={{ background: bgColor }}
      >
        {/* Lighting adjusts for theme */}
        <ambientLight intensity={darkMode ? 0.4 : 1.2} />
        <pointLight position={[80, 80, 80]} color="#ffffff" intensity={darkMode ? 0.3 : 0.8} />
        <pointLight position={[-60, -40, 60]} color="#ffffff" intensity={darkMode ? 0.2 : 0.4} />

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

        <GraphScene />

        <EffectComposer>
          <Bloom
            luminanceThreshold={darkMode ? 0.1 : 0.2}
            luminanceSmoothing={0.9}
            intensity={darkMode ? 1.2 : 0.6}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

    </div>
  );
}

// @ts-nocheck — R3F JSX intrinsics not typed with React 19
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { GraphScene } from './GraphScene';

export function KnowledgeGraph() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 120], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0a0f' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.15} />
        <pointLight position={[50, 50, 50]} color="#00f0ff" intensity={0.8} />
        <pointLight position={[-50, -50, -50]} color="#b84dff" intensity={0.6} />
        <pointLight position={[0, 80, 0]} color="#ffffff" intensity={0.3} />

        {/* Star field background */}
        <Stars
          radius={250}
          depth={60}
          count={3000}
          factor={3}
          saturation={0}
          fade
          speed={0.5}
        />

        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={20}
          maxDistance={300}
        />

        {/* Graph content */}
        <GraphScene />

        {/* Post-processing */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={0.8}
            mipmapBlur
          />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

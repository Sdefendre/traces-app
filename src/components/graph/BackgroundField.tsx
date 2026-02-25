// @ts-nocheck
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGraphStore } from '@/stores/graph-store';

// --- Layer 1: dense dim starfield ---
const STAR_COUNT = 8000;
const STAR_COUNT_LOW = 2000;
const SPREAD = 6000;
const DRIFT_SPEED = 0.0008;

// --- Layer 2: bright accent stars ---
const BRIGHT_COUNT = 800;
const BRIGHT_COUNT_LOW = 200;
const BRIGHT_SPREAD = 6000;
const BRIGHT_DRIFT_SPEED = 0.0004;

// --- Layer 3: shooting stars (disabled in low power) ---
const SHOOTING_COUNT = 10;
const TRAIL_LENGTH = 20;

// Create a circular soft-glow texture for round stars
function createStarTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Each shooting star has a position, velocity, life, and trail history
interface ShootingStar {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;       // 0→1, resets when expired
  maxLife: number;
  trail: THREE.Vector3[];
  delay: number;      // seconds before it starts
}

function spawnShootingStar(): ShootingStar {
  const speed = 1.5 + Math.random() * 2.5;
  // Random direction — slightly downward bias for natural look
  const dir = new THREE.Vector3(
    -0.5 - Math.random() * 0.5,
    -0.3 - Math.random() * 0.4,
    (Math.random() - 0.5) * 0.3,
  ).normalize();

  const pos = new THREE.Vector3(
    (Math.random() - 0.3) * SPREAD * 0.6,
    100 + Math.random() * 150,
    (Math.random() - 0.5) * SPREAD * 0.4,
  );

  const trail: THREE.Vector3[] = [];
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    trail.push(pos.clone());
  }

  return {
    pos,
    vel: dir.multiplyScalar(speed),
    life: 0,
    maxLife: 1.5 + Math.random() * 2,
    trail,
    delay: Math.random() * 8,
  };
}

/** A single shooting star rendered as a line with fading opacity */
function ShootingStarTrail({ star, starTexture }: { star: ShootingStar; starTexture: THREE.Texture }) {
  const lineRef = useRef<THREE.Line>(null);
  const headRef = useRef<THREE.Points>(null);
  const headPosArr = useMemo(() => new Float32Array(3), []);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAIL_LENGTH * 3);
    const colors = new Float32Array(TRAIL_LENGTH * 4);
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    return g;
  }, []);

  const headGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(headPosArr, 3));
    return g;
  }, [headPosArr]);

  useFrame((_, delta) => {
    // Countdown delay
    if (star.delay > 0) {
      star.delay -= delta;
      if (lineRef.current) lineRef.current.visible = false;
      if (headRef.current) headRef.current.visible = false;
      return;
    }

    star.life += delta;

    // Reset when expired
    if (star.life > star.maxLife) {
      const fresh = spawnShootingStar();
      star.pos.copy(fresh.pos);
      star.vel.copy(fresh.vel);
      star.life = 0;
      star.maxLife = fresh.maxLife;
      star.delay = 2 + Math.random() * 6;
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        star.trail[i].copy(star.pos);
      }
      if (lineRef.current) lineRef.current.visible = false;
      if (headRef.current) headRef.current.visible = false;
      return;
    }

    if (lineRef.current) lineRef.current.visible = true;
    if (headRef.current) headRef.current.visible = true;

    // Move head
    star.pos.addScaledVector(star.vel, delta);

    // Shift trail — newest at index 0
    for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
      star.trail[i].copy(star.trail[i - 1]);
    }
    star.trail[0].copy(star.pos);

    // Fade in/out based on life
    const t = star.life / star.maxLife;
    const brightness = t < 0.1 ? t / 0.1 : t > 0.7 ? (1 - t) / 0.3 : 1;

    // Update trail geometry
    const posAttr = geom.getAttribute('position');
    const colAttr = geom.getAttribute('color');
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const p = star.trail[i];
      posAttr.array[i * 3] = p.x;
      posAttr.array[i * 3 + 1] = p.y;
      posAttr.array[i * 3 + 2] = p.z;

      // Fade along trail: head is bright, tail fades to 0
      const trailFade = 1 - i / TRAIL_LENGTH;
      const alpha = trailFade * trailFade * brightness;
      colAttr.array[i * 4] = 0.85 + trailFade * 0.15;   // R
      colAttr.array[i * 4 + 1] = 0.85 + trailFade * 0.15; // G
      colAttr.array[i * 4 + 2] = 1.0;                      // B — slight blue tint
      colAttr.array[i * 4 + 3] = alpha;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // Update head glow position
    headPosArr[0] = star.pos.x;
    headPosArr[1] = star.pos.y;
    headPosArr[2] = star.pos.z;
    headGeom.getAttribute('position').needsUpdate = true;

    if (headRef.current) {
      const mat = headRef.current.material as THREE.PointsMaterial;
      mat.opacity = brightness;
    }
  });

  return (
    <group>
      <line ref={lineRef} geometry={geom} visible={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          linewidth={1}
        />
      </line>
      <points ref={headRef} geometry={headGeom} visible={false}>
        <pointsMaterial
          map={starTexture}
          color="#cce0ff"
          size={2.5}
          transparent
          opacity={1}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          alphaTest={0.01}
        />
      </points>
    </group>
  );
}

export function BackgroundField() {
  const starsRef = useRef<THREE.Points>(null);
  const brightRef = useRef<THREE.Points>(null);
  const lowPowerMode = useGraphStore((s) => s.settings.lowPowerMode);

  const starTexture = useMemo(() => createStarTexture(), []);

  const starCount = lowPowerMode ? STAR_COUNT_LOW : STAR_COUNT;
  const brightCount = lowPowerMode ? BRIGHT_COUNT_LOW : BRIGHT_COUNT;
  const shootingCount = lowPowerMode ? 0 : SHOOTING_COUNT;

  // Dense starfield
  const { positions: starPositions, sizes: starSizes } = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const sz = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * SPREAD;
      pos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD;
      pos[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
      sz[i] = 0.15 + Math.random() * 0.45;
    }
    return { positions: pos, sizes: sz };
  }, [starCount]);

  // Bright accent stars
  const { positions: brightPositions, sizes: brightSizes } = useMemo(() => {
    const pos = new Float32Array(brightCount * 3);
    const sz = new Float32Array(brightCount);
    for (let i = 0; i < brightCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BRIGHT_SPREAD;
      pos[i * 3 + 1] = (Math.random() - 0.5) * BRIGHT_SPREAD;
      pos[i * 3 + 2] = (Math.random() - 0.5) * BRIGHT_SPREAD;
      sz[i] = 0.8 + Math.random() * 0.8;
    }
    return { positions: pos, sizes: sz };
  }, [brightCount]);

  // Shooting stars — disabled in low power mode
  const shootingStars = useMemo(() => {
    return Array.from({ length: shootingCount }, () => spawnShootingStar());
  }, [shootingCount]);

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += DRIFT_SPEED;
    }
    if (brightRef.current) {
      brightRef.current.rotation.y += BRIGHT_DRIFT_SPEED;
      brightRef.current.rotation.x += BRIGHT_DRIFT_SPEED * 0.3;
    }
  });

  return (
    <group>
      {/* Layer 1 — many small stars */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          <bufferAttribute attach="attributes-size" args={[starSizes, 1]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          color="#ffffff"
          size={0.6}
          transparent
          opacity={0.6}
          depthWrite={false}
          sizeAttenuation
          alphaTest={0.01}
        />
      </points>

      {/* Layer 2 — fewer bright / larger stars */}
      <points ref={brightRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[brightPositions, 3]} />
          <bufferAttribute attach="attributes-size" args={[brightSizes, 1]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          color="#ffffff"
          size={1.5}
          transparent
          opacity={0.8}
          depthWrite={false}
          sizeAttenuation
          alphaTest={0.01}
        />
      </points>

      {/* Layer 3 — shooting stars with trails */}
      {shootingStars.map((star, i) => (
        <ShootingStarTrail key={i} star={star} starTexture={starTexture} />
      ))}
    </group>
  );
}

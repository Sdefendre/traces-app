/** Particle surfaces supported by the particle graph renderer. */
export const PARTICLE_SHAPES = [
  'mobius',
  'toroidal',
  'harmonics',
  'lissajous',
  'fractal',
] as const;

export type ParticleShape = (typeof PARTICLE_SHAPES)[number];

export type ParticleShapeGenerator = (count: number, scale?: number) => Float32Array;

const TAU = Math.PI * 2;
const GOLDEN_RATIO_CONJUGATE = (Math.sqrt(5) - 1) / 2;
const MAX_FLOAT32 = 3.4028234663852886e38;
const MAX_PARTICLE_COUNT = Math.floor(0xffffffff / 3);

function validateGeneratorInput(count: number, scale: number): void {
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_PARTICLE_COUNT) {
    throw new RangeError(`Particle count must be an integer from 0 to ${MAX_PARTICLE_COUNT}.`);
  }
  if (!Number.isFinite(scale)) {
    throw new RangeError('Particle scale must be finite.');
  }
}

function createPositions(count: number, scale: number): Float32Array {
  validateGeneratorInput(count, scale);
  return new Float32Array(count * 3);
}

function writePosition(
  positions: Float32Array,
  index: number,
  x: number,
  y: number,
  z: number,
  scale: number,
): void {
  const offset = index * 3;
  const scaledX = x * scale;
  const scaledY = y * scale;
  const scaledZ = z * scale;

  if (
    !Number.isFinite(scaledX) ||
    !Number.isFinite(scaledY) ||
    !Number.isFinite(scaledZ) ||
    Math.abs(scaledX) > MAX_FLOAT32 ||
    Math.abs(scaledY) > MAX_FLOAT32 ||
    Math.abs(scaledZ) > MAX_FLOAT32
  ) {
    throw new RangeError('Particle coordinates must fit in a Float32Array.');
  }

  positions[offset] = scaledX;
  positions[offset + 1] = scaledY;
  positions[offset + 2] = scaledZ;
}

function fractionalPart(value: number): number {
  return value - Math.floor(value);
}

/** Base-2 radical inverse, used for deterministic incremental surface sampling. */
function radicalInverseBase2(value: number): number {
  let bits = value >>> 0;
  let reversed = 0;
  let factor = 0.5;

  while (bits > 0) {
    reversed += (bits & 1) * factor;
    bits >>>= 1;
    factor *= 0.5;
  }

  return reversed;
}

/** Base-3 radical inverse, used to vary a torus tube radius without randomness. */
function radicalInverseBase3(value: number): number {
  let remaining = value;
  let reversed = 0;
  let factor = 1 / 3;

  while (remaining > 0) {
    reversed += (remaining % 3) * factor;
    remaining = Math.floor(remaining / 3);
    factor /= 3;
  }

  return reversed;
}

/**
 * Möbius strip sampled with an incremental low-discrepancy sequence. Existing
 * particle coordinates remain unchanged when particles are appended.
 */
export function mobiusStrip(count: number, scale = 1): Float32Array {
  const positions = createPositions(count, scale);

  for (let index = 0; index < count; index += 1) {
    const u = fractionalPart(index * GOLDEN_RATIO_CONJUGATE) * TAU;
    const v = (radicalInverseBase2(index + 1) - 0.5) * 1.6;
    const halfAngle = u / 2;
    const radius = 1 + (v / 2) * Math.cos(halfAngle);

    writePosition(
      positions,
      index,
      radius * Math.cos(u),
      radius * Math.sin(u),
      (v / 2) * Math.sin(halfAngle),
      scale,
    );
  }

  return positions;
}

/** Toroidal vortex with deterministic tube windings and radial variation. */
export function toroidalVortex(count: number, scale = 1): Float32Array {
  const positions = createPositions(count, scale);
  const majorRadius = 1;
  const minorRadius = 0.38;
  const windings = 13;

  for (let index = 0; index < count; index += 1) {
    const u = fractionalPart(index * GOLDEN_RATIO_CONJUGATE) * TAU;
    const v = u * windings;
    const radialVariation = (radicalInverseBase3(index + 1) - 0.5) * 0.12;
    const localRadius = minorRadius * (1 + radialVariation);

    writePosition(
      positions,
      index,
      (majorRadius + localRadius * Math.cos(v)) * Math.cos(u),
      (majorRadius + localRadius * Math.cos(v)) * Math.sin(u),
      localRadius * Math.sin(v),
      scale,
    );
  }

  return positions;
}

/** Incremental Fibonacci sphere modulated by a deterministic harmonic field. */
export function sphericalHarmonics(count: number, scale = 1): Float32Array {
  const positions = createPositions(count, scale);

  for (let index = 0; index < count; index += 1) {
    const zOnSphere = 1 - 2 * radicalInverseBase2(index + 1);
    const phi = Math.acos(Math.max(-1, Math.min(1, zOnSphere)));
    const theta = index * TAU * GOLDEN_RATIO_CONJUGATE;
    const radius =
      1 +
      0.25 * Math.sin(3 * phi) * Math.cos(2 * theta) +
      0.15 * Math.sin(4 * phi) * Math.cos(3 * theta) +
      0.1 * Math.cos(5 * phi);
    const sinPhi = Math.sin(phi);

    writePosition(
      positions,
      index,
      radius * sinPhi * Math.cos(theta),
      radius * sinPhi * Math.sin(theta),
      radius * Math.cos(phi),
      scale,
    );
  }

  return positions;
}

/** 3D Lissajous curve sampled in a stable low-discrepancy order. */
export function lissajousCurve(count: number, scale = 1): Float32Array {
  const positions = createPositions(count, scale);

  for (let index = 0; index < count; index += 1) {
    const t = fractionalPart(index * GOLDEN_RATIO_CONJUGATE) * TAU;

    writePosition(
      positions,
      index,
      Math.sin(3 * t + Math.PI / 4),
      Math.sin(4 * t),
      Math.sin(5 * t + Math.PI / 6),
      scale,
    );
  }

  return positions;
}

type Vector3Tuple = readonly [number, number, number];

interface BranchSegment {
  start: Vector3Tuple;
  direction: Vector3Tuple;
}

function scaleVector(vector: Vector3Tuple, scale: number): Vector3Tuple {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function rotateAroundX(vector: Vector3Tuple, angle: number): Vector3Tuple {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    vector[0],
    vector[1] * cosine - vector[2] * sine,
    vector[1] * sine + vector[2] * cosine,
  ];
}

function rotateAroundZ(vector: Vector3Tuple, angle: number): Vector3Tuple {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    vector[0] * cosine - vector[1] * sine,
    vector[0] * sine + vector[1] * cosine,
    vector[2],
  ];
}

/**
 * Breadth-first fractal tree. A fixed number of samples per branch makes every
 * generated result a prefix of a larger result and avoids count-based modulo.
 */
export function fractalBranches(count: number, scale = 1): Float32Array {
  const positions = createPositions(count, scale);
  if (count === 0) return positions;

  const samplesPerSegment = 3;
  const branchDecay = 0.68;
  const branchAngle = 0.58;
  const segments: BranchSegment[] = [
    { start: [0, -1.2, 0], direction: [0, 0.42, 0] },
  ];
  let segmentIndex = 0;
  let particleIndex = 0;

  while (particleIndex < count) {
    const segment = segments[segmentIndex];
    segmentIndex += 1;

    for (let sample = 0; sample < samplesPerSegment && particleIndex < count; sample += 1) {
      const t = sample / samplesPerSegment;
      writePosition(
        positions,
        particleIndex,
        segment.start[0] + segment.direction[0] * t,
        segment.start[1] + segment.direction[1] * t,
        segment.start[2] + segment.direction[2] * t,
        scale,
      );
      particleIndex += 1;
    }

    const end: Vector3Tuple = [
      segment.start[0] + segment.direction[0],
      segment.start[1] + segment.direction[1],
      segment.start[2] + segment.direction[2],
    ];
    const shorter = scaleVector(segment.direction, branchDecay);

    segments.push(
      { start: end, direction: rotateAroundZ(shorter, branchAngle) },
      { start: end, direction: rotateAroundX(shorter, -branchAngle) },
      {
        start: end,
        direction: rotateAroundX(rotateAroundZ(shorter, -branchAngle), branchAngle * 0.8),
      },
    );
  }

  return positions;
}

export const PARTICLE_SHAPE_GENERATORS: Readonly<
  Record<ParticleShape, ParticleShapeGenerator>
> = {
  mobius: mobiusStrip,
  toroidal: toroidalVortex,
  harmonics: sphericalHarmonics,
  lissajous: lissajousCurve,
  fractal: fractalBranches,
};

/** Compatibility-friendly alias for consumers that prefer the shorter name. */
export const SHAPE_GENERATORS = PARTICLE_SHAPE_GENERATORS;

export function isParticleShape(value: unknown): value is ParticleShape {
  return (
    typeof value === 'string' &&
    (PARTICLE_SHAPES as readonly string[]).includes(value)
  );
}

export function generateParticlePositions(
  shape: ParticleShape,
  count: number,
  scale = 1,
): Float32Array {
  const generator = PARTICLE_SHAPE_GENERATORS[shape];
  if (!generator) {
    throw new RangeError(`Unsupported particle shape: ${JSON.stringify(shape)}.`);
  }
  return generator(count, scale);
}

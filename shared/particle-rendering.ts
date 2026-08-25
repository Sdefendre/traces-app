export interface ParticleVisualNodeLike {
  id: string;
  fileSize?: number;
  color?: string;
}

export interface ParticleVisualOptions {
  minPointSize?: number;
  maxPointSize?: number;
  fallbackColor?: string;
}

export interface ParticleVisualBuffers {
  /** RGB triples aligned with nodeAtIndex. */
  colors: Float32Array;
  /** Point sizes aligned with nodeAtIndex. */
  sizes: Float32Array;
}

const DEFAULT_MIN_POINT_SIZE = 3;
const DEFAULT_MAX_POINT_SIZE = 9;
const DEFAULT_COLOR = '#94a3b8';

function requireFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be finite and non-negative.`);
  }
}

function normalizeFileSize(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : 0;
}

function parseHexColor(value: string | undefined, fallback: readonly number[]): readonly number[] {
  if (typeof value !== 'string') return fallback;

  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
  if (!match) return fallback;

  const hex = match[1].length === 3
    ? match[1].split('').map((digit) => `${digit}${digit}`).join('')
    : match[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

/**
 * Creates exact-size color and file-size buffers in the renderer's stable node
 * order. Logarithmic sizing keeps large notes useful without letting them
 * overwhelm small notes.
 */
export function createParticleVisualBuffers(
  nodes: readonly ParticleVisualNodeLike[],
  nodeAtIndex: readonly string[],
  options: ParticleVisualOptions = {},
): ParticleVisualBuffers {
  const minPointSize = options.minPointSize ?? DEFAULT_MIN_POINT_SIZE;
  const maxPointSize = options.maxPointSize ?? DEFAULT_MAX_POINT_SIZE;
  requireFiniteNonNegative(minPointSize, 'Minimum particle point size');
  requireFiniteNonNegative(maxPointSize, 'Maximum particle point size');
  if (maxPointSize < minPointSize) {
    throw new RangeError('Maximum particle point size cannot be smaller than the minimum.');
  }

  const fallbackColor = parseHexColor(options.fallbackColor ?? DEFAULT_COLOR, [0.58, 0.64, 0.72]);
  const nodeById = new Map<string, ParticleVisualNodeLike>();
  for (const node of nodes) {
    if (nodeById.has(node.id)) {
      throw new Error(`Duplicate particle visual node ID: ${JSON.stringify(node.id)}.`);
    }
    nodeById.set(node.id, node);
  }

  const count = nodeAtIndex.length;
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const fileSizes = new Float64Array(count);
  let minFileSize = Number.POSITIVE_INFINITY;
  let maxFileSize = 0;

  for (let index = 0; index < count; index += 1) {
    const node = nodeById.get(nodeAtIndex[index]);
    const fileSize = normalizeFileSize(node?.fileSize);
    const color = parseHexColor(node?.color, fallbackColor);
    const colorOffset = index * 3;

    fileSizes[index] = fileSize;
    minFileSize = Math.min(minFileSize, fileSize);
    maxFileSize = Math.max(maxFileSize, fileSize);
    colors[colorOffset] = color[0];
    colors[colorOffset + 1] = color[1];
    colors[colorOffset + 2] = color[2];
  }

  if (count === 0) return { colors, sizes };

  if (maxFileSize === 0) {
    sizes.fill(minPointSize);
    return { colors, sizes };
  }

  if (maxFileSize === minFileSize) {
    sizes.fill(minPointSize + (maxPointSize - minPointSize) / 2);
    return { colors, sizes };
  }

  const logMin = Math.log1p(minFileSize);
  const logRange = Math.log1p(maxFileSize) - logMin;
  for (let index = 0; index < count; index += 1) {
    const normalized = (Math.log1p(fileSizes[index]) - logMin) / logRange;
    sizes[index] = minPointSize + normalized * (maxPointSize - minPointSize);
  }

  return { colors, sizes };
}

export function easeParticleMorph(progress: number): number {
  if (!Number.isFinite(progress)) {
    throw new RangeError('Particle morph progress must be finite.');
  }
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - ((-2 * clamped + 2) ** 3) / 2;
}

function assertCompatiblePositionBuffers(
  destination: Float32Array,
  source: Float32Array,
  target: Float32Array,
): void {
  if (
    destination.length !== source.length ||
    source.length !== target.length ||
    source.length % 3 !== 0
  ) {
    throw new RangeError('Particle morph buffers must contain matching xyz triples.');
  }
}

export function haveDifferentParticlePositions(
  source: Float32Array,
  target: Float32Array,
): boolean {
  if (source.length !== target.length) return true;
  for (let index = 0; index < source.length; index += 1) {
    if (!Object.is(source[index], target[index])) return true;
  }
  return false;
}

/** Advances and writes one allocation-free morph frame. */
export function advanceParticleMorph(
  destination: Float32Array,
  source: Float32Array,
  target: Float32Array,
  currentProgress: number,
  deltaSeconds: number,
  durationSeconds = 0.85,
): number {
  assertCompatiblePositionBuffers(destination, source, target);
  if (!Number.isFinite(currentProgress)) {
    throw new RangeError('Particle morph progress must be finite.');
  }
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new RangeError('Particle morph delta must be finite and non-negative.');
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError('Particle morph duration must be finite and positive.');
  }

  const nextProgress = Math.min(1, Math.max(0, currentProgress) + deltaSeconds / durationSeconds);
  const eased = easeParticleMorph(nextProgress);

  for (let index = 0; index < destination.length; index += 1) {
    const value = source[index] + (target[index] - source[index]) * eased;
    if (!Number.isFinite(value)) {
      throw new RangeError(`Particle morph coordinate ${index} is not finite.`);
    }
    destination[index] = value;
  }

  return nextProgress;
}

import {
  generateParticlePositions,
  type ParticleShape,
} from './particle-shapes';

export interface ParticleNodeLike {
  id: string;
}

export interface ParticleEdgeLike {
  source: string;
  target: string;
  /** Optional relative edge weight in [0, 1]. Invalid values are ignored. */
  strength?: number;
}

export interface ParticleNodeIndex {
  nodeAtIndex: readonly string[];
  indexOfNode: ReadonlyMap<string, number>;
}

export interface ParticleLayoutData extends ParticleNodeIndex {
  /** Mutable render buffer, initialized to sourcePositions. */
  positions: Float32Array;
  /** Starting coordinates for a renderer-owned morph. */
  sourcePositions: Float32Array;
  /** Shape coordinates after optional edge attraction. */
  targetPositions: Float32Array;
}

export interface ParticleLayoutOptions {
  shape: ParticleShape;
  scale?: number;
  /** Skips graph-aware edge attraction while retaining one particle per node. */
  lowPowerMode?: boolean;
  /** Global attraction fraction in [0, 1]. Defaults to 0.15. */
  edgeAttractionStrength?: number;
}

const DEFAULT_SCALE = 55;
const DEFAULT_EDGE_ATTRACTION = 0.15;

function validateAttractionStrength(strength: number): void {
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError('Edge attraction strength must be finite and between 0 and 1.');
  }
}

function assertPositionBuffer(positions: Float32Array, expectedCount?: number): void {
  if (positions.length % 3 !== 0) {
    throw new RangeError('Particle position buffers must contain complete xyz triples.');
  }
  if (expectedCount !== undefined && positions.length !== expectedCount * 3) {
    throw new RangeError(`Expected ${expectedCount * 3} particle coordinates.`);
  }
  for (let index = 0; index < positions.length; index += 1) {
    if (!Number.isFinite(positions[index])) {
      throw new RangeError(`Particle coordinate ${index} is not finite.`);
    }
  }
}

/**
 * Builds a dense, deterministic node index. Surviving node IDs keep their
 * previous relative order; new IDs are appended in their current input order.
 */
export function createStableParticleNodeIndex(
  nodes: readonly ParticleNodeLike[],
  previousNodeAtIndex: readonly string[] = [],
): ParticleNodeIndex {
  const currentIds = new Set<string>();
  for (const node of nodes) {
    if (typeof node.id !== 'string') {
      throw new TypeError('Particle node IDs must be strings.');
    }
    if (currentIds.has(node.id)) {
      throw new Error(`Duplicate particle node ID: ${JSON.stringify(node.id)}.`);
    }
    currentIds.add(node.id);
  }

  const nodeAtIndex: string[] = [];
  const added = new Set<string>();

  for (const id of previousNodeAtIndex) {
    if (currentIds.has(id) && !added.has(id)) {
      nodeAtIndex.push(id);
      added.add(id);
    }
  }

  for (const node of nodes) {
    if (!added.has(node.id)) {
      nodeAtIndex.push(node.id);
      added.add(node.id);
    }
  }

  const indexOfNode = new Map<string, number>();
  nodeAtIndex.forEach((id, index) => indexOfNode.set(id, index));
  return { nodeAtIndex, indexOfNode };
}

/**
 * Returns an attracted copy of a position buffer. Updates are computed from a
 * snapshot so earlier particle updates cannot influence later particles.
 */
export function applyParticleEdgeAttraction(
  positions: Float32Array,
  edges: readonly ParticleEdgeLike[],
  indexOfNode: ReadonlyMap<string, number>,
  strength = DEFAULT_EDGE_ATTRACTION,
): Float32Array {
  validateAttractionStrength(strength);
  assertPositionBuffer(positions);

  const count = positions.length / 3;
  const output = Float32Array.from(positions);
  if (count === 0 || strength === 0 || edges.length === 0) return output;

  const coordinateSums = new Float64Array(positions.length);
  const weightSums = new Float64Array(count);

  const accumulateNeighbor = (index: number, neighbor: number, weight: number): void => {
    const offset = index * 3;
    const neighborOffset = neighbor * 3;
    coordinateSums[offset] += positions[neighborOffset] * weight;
    coordinateSums[offset + 1] += positions[neighborOffset + 1] * weight;
    coordinateSums[offset + 2] += positions[neighborOffset + 2] * weight;
    weightSums[index] += weight;
  };

  for (const edge of edges) {
    const sourceIndex = indexOfNode.get(edge.source);
    const targetIndex = indexOfNode.get(edge.target);
    const weight = edge.strength === undefined ? 1 : edge.strength;

    if (
      sourceIndex === undefined ||
      targetIndex === undefined ||
      !Number.isInteger(sourceIndex) ||
      !Number.isInteger(targetIndex) ||
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= count ||
      targetIndex >= count ||
      !Number.isFinite(weight) ||
      weight <= 0 ||
      weight > 1
    ) {
      continue;
    }

    accumulateNeighbor(sourceIndex, targetIndex, weight);
    accumulateNeighbor(targetIndex, sourceIndex, weight);
  }

  for (let index = 0; index < count; index += 1) {
    const totalWeight = weightSums[index];
    if (totalWeight === 0) continue;

    const offset = index * 3;
    for (let axis = 0; axis < 3; axis += 1) {
      const current = positions[offset + axis];
      const average = coordinateSums[offset + axis] / totalWeight;
      const attracted = current + (average - current) * strength;
      if (!Number.isFinite(attracted)) {
        throw new RangeError('Edge attraction produced a non-finite particle coordinate.');
      }
      output[offset + axis] = attracted;
    }
  }

  assertPositionBuffer(output, count);
  return output;
}

function copyPreviousPosition(
  destination: Float32Array,
  destinationIndex: number,
  previous: ParticleLayoutData,
  previousIndex: number,
): boolean {
  const sourceOffset = previousIndex * 3;
  const destinationOffset = destinationIndex * 3;
  if (sourceOffset < 0 || sourceOffset + 2 >= previous.positions.length) return false;

  const x = previous.positions[sourceOffset];
  const y = previous.positions[sourceOffset + 1];
  const z = previous.positions[sourceOffset + 2];
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;

  destination[destinationOffset] = x;
  destination[destinationOffset + 1] = y;
  destination[destinationOffset + 2] = z;
  return true;
}

/**
 * Reconciles exact-size particle buffers for a new node set and shape. Passing
 * the prior layout preserves current coordinates by node ID for morph sources.
 */
export function createParticleLayout(
  nodes: readonly ParticleNodeLike[],
  edges: readonly ParticleEdgeLike[],
  options: ParticleLayoutOptions,
  previous?: ParticleLayoutData,
): ParticleLayoutData {
  const scale = options.scale ?? DEFAULT_SCALE;
  const attractionStrength = options.edgeAttractionStrength ?? DEFAULT_EDGE_ATTRACTION;
  validateAttractionStrength(attractionStrength);

  const { nodeAtIndex, indexOfNode } = createStableParticleNodeIndex(
    nodes,
    previous?.nodeAtIndex,
  );
  const count = nodeAtIndex.length;
  const generated = generateParticlePositions(options.shape, count, scale);
  const targetPositions = options.lowPowerMode
    ? generated
    : applyParticleEdgeAttraction(generated, edges, indexOfNode, attractionStrength);
  const sourcePositions = new Float32Array(count * 3);

  if (previous) {
    const previousIndexOfNode = new Map<string, number>();
    previous.nodeAtIndex.forEach((id, index) => {
      if (!previousIndexOfNode.has(id)) previousIndexOfNode.set(id, index);
    });

    for (let index = 0; index < count; index += 1) {
      const previousIndex = previousIndexOfNode.get(nodeAtIndex[index]);
      const copied =
        previousIndex !== undefined &&
        copyPreviousPosition(sourcePositions, index, previous, previousIndex);

      if (!copied) {
        const offset = index * 3;
        sourcePositions[offset] = targetPositions[offset];
        sourcePositions[offset + 1] = targetPositions[offset + 1];
        sourcePositions[offset + 2] = targetPositions[offset + 2];
      }
    }
  } else {
    sourcePositions.set(targetPositions);
  }

  assertPositionBuffer(sourcePositions, count);
  assertPositionBuffer(targetPositions, count);

  return {
    positions: Float32Array.from(sourcePositions),
    sourcePositions,
    targetPositions,
    nodeAtIndex,
    indexOfNode,
  };
}

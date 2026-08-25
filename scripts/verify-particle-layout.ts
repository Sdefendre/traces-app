import {
  PARTICLE_SHAPES,
  generateParticlePositions,
  isParticleShape,
  type ParticleShape,
} from '../shared/particle-shapes';
import {
  applyParticleEdgeAttraction,
  createParticleLayout,
  createStableParticleNodeIndex,
  type ParticleLayoutData,
} from '../shared/particle-layout';

function expect(condition: boolean, label: string): void {
  if (!condition) throw new Error(label);
}

function expectThrows(action: () => unknown, label: string): void {
  let threw = false;
  try {
    action();
  } catch {
    threw = true;
  }
  expect(threw, label);
}

function expectFinite(buffer: Float32Array, label: string): void {
  for (let index = 0; index < buffer.length; index += 1) {
    expect(Number.isFinite(buffer[index]), `${label}: coordinate ${index} must be finite`);
  }
}

function expectEqualBuffers(
  actual: Float32Array,
  expected: Float32Array,
  label: string,
): void {
  expect(actual.length === expected.length, `${label}: lengths differ`);
  for (let index = 0; index < actual.length; index += 1) {
    expect(Object.is(actual[index], expected[index]), `${label}: mismatch at ${index}`);
  }
}

function expectPrefix(
  prefix: Float32Array,
  complete: Float32Array,
  label: string,
): void {
  expect(prefix.length <= complete.length, `${label}: invalid prefix lengths`);
  for (let index = 0; index < prefix.length; index += 1) {
    expect(Object.is(prefix[index], complete[index]), `${label}: prefix mismatch at ${index}`);
  }
}

function verifyShape(shape: ParticleShape): void {
  const counts = [0, 1, 7, 257, 20_000];
  for (const count of counts) {
    const first = generateParticlePositions(shape, count, 55);
    const second = generateParticlePositions(shape, count, 55);

    expect(first instanceof Float32Array, `${shape}/${count}: Float32Array output`);
    expect(first.length === count * 3, `${shape}/${count}: exact coordinate length`);
    expectFinite(first, `${shape}/${count}`);
    expectEqualBuffers(first, second, `${shape}/${count}: deterministic output`);
  }

  const small = generateParticlePositions(shape, 31, 12);
  const grown = generateParticlePositions(shape, 96, 12);
  expectPrefix(small, grown, `${shape}: append-stable sampling`);

  const zeroScale = generateParticlePositions(shape, 13, 0);
  expect(zeroScale.every((coordinate) => coordinate === 0), `${shape}: zero scale`);
}

for (const shape of PARTICLE_SHAPES) verifyShape(shape);

expect(isParticleShape('fractal'), 'known particle shape guard');
expect(!isParticleShape('unknown'), 'unknown particle shape guard');
expect(!isParticleShape(null), 'non-string particle shape guard');
expectThrows(
  () => generateParticlePositions('unknown' as ParticleShape, 1, 1),
  'invalid runtime shape values must fail explicitly',
);

expectThrows(
  () => generateParticlePositions('mobius', -1, 1),
  'negative counts must fail explicitly',
);
expectThrows(
  () => generateParticlePositions('mobius', 1.5, 1),
  'fractional counts must fail explicitly',
);
expectThrows(
  () => generateParticlePositions('mobius', 1, Number.NaN),
  'non-finite scale must fail explicitly',
);
expectThrows(
  () => generateParticlePositions('mobius', 1, Number.MAX_VALUE),
  'Float32-overflowing scale must fail explicitly',
);

const stableInitial = createStableParticleNodeIndex([
  { id: 'alpha' },
  { id: 'beta' },
  { id: 'gamma' },
]);
const stableReordered = createStableParticleNodeIndex(
  [{ id: 'gamma' }, { id: 'alpha' }, { id: 'delta' }, { id: 'beta' }],
  stableInitial.nodeAtIndex,
);
expect(
  stableReordered.nodeAtIndex.join(',') === 'alpha,beta,gamma,delta',
  'surviving nodes retain stable relative order and new nodes append',
);
stableReordered.nodeAtIndex.forEach((id, index) => {
  expect(stableReordered.indexOfNode.get(id) === index, `reciprocal node index for ${id}`);
});
expectThrows(
  () => createStableParticleNodeIndex([{ id: 'duplicate' }, { id: 'duplicate' }]),
  'duplicate IDs must fail closed',
);

const simplePositions = new Float32Array([
  0, 0, 0,
  10, 0, 0,
  100, 5, -2,
]);
const simpleIndex = new Map([
  ['alpha', 0],
  ['beta', 1],
  ['gamma', 2],
]);
const attracted = applyParticleEdgeAttraction(
  simplePositions,
  [
    { source: 'alpha', target: 'beta' },
    { source: 'alpha', target: 'missing' },
    { source: 'gamma', target: 'gamma' },
    { source: 'alpha', target: 'gamma', strength: Number.NaN },
  ],
  simpleIndex,
  0.25,
);
expect(attracted[0] === 2.5, 'edge attraction moves the source toward its neighbor');
expect(attracted[3] === 7.5, 'edge attraction moves the target toward its neighbor');
expect(attracted[6] === 100, 'invalid and self edges do not move particles');
expectEqualBuffers(simplePositions, new Float32Array([0, 0, 0, 10, 0, 0, 100, 5, -2]), 'attraction does not mutate input');
expectFinite(attracted, 'edge-attracted coordinates');
expectThrows(
  () => applyParticleEdgeAttraction(new Float32Array([0, 1]), [], new Map()),
  'partial xyz buffers must fail explicitly',
);
expectThrows(
  () => applyParticleEdgeAttraction(new Float32Array([0, Number.NaN, 0]), [], new Map()),
  'non-finite source coordinates must fail explicitly',
);
expectThrows(
  () => applyParticleEdgeAttraction(simplePositions, [], simpleIndex, 1.01),
  'out-of-range attraction strength must fail explicitly',
);
const malformedIndexAttraction = applyParticleEdgeAttraction(
  simplePositions,
  [{ source: 'fractional', target: 'beta' }],
  new Map([...simpleIndex, ['fractional', 0.5]]),
);
expectEqualBuffers(
  malformedIndexAttraction,
  simplePositions,
  'malformed external node indexes are ignored safely',
);

const initialNodes = [{ id: 'alpha' }, { id: 'beta' }, { id: 'gamma' }];
const graphEdges = [
  { source: 'alpha', target: 'beta', strength: 0.8 },
  { source: 'beta', target: 'gamma', strength: 0.4 },
];
const initialLayout = createParticleLayout(initialNodes, graphEdges, {
  shape: 'mobius',
  scale: 20,
});
expect(initialLayout.positions.length === 9, 'initial layout buffer length');
expectEqualBuffers(initialLayout.positions, initialLayout.sourcePositions, 'initial positions equal source');
expectEqualBuffers(initialLayout.positions, initialLayout.targetPositions, 'initial positions equal target');
expectFinite(initialLayout.positions, 'initial layout');

// Simulate renderer-owned current positions before a node update.
initialLayout.positions.set([
  1, 2, 3,
  4, 5, 6,
  7, 8, 9,
]);

const grownNodes = [
  { id: 'gamma' },
  { id: 'alpha' },
  { id: 'delta' },
  { id: 'beta' },
];
const grownLayout = createParticleLayout(
  grownNodes,
  [...graphEdges, { source: 'delta', target: 'alpha', strength: 1 }],
  { shape: 'toroidal', scale: 20 },
  initialLayout,
);
expect(grownLayout.positions.length === 12, 'growth regenerates exact-size render buffer');
expect(grownLayout.sourcePositions.length === 12, 'growth regenerates exact-size source buffer');
expect(grownLayout.targetPositions.length === 12, 'growth regenerates exact-size target buffer');
expect(grownLayout.positions !== initialLayout.positions, 'growth replaces the render buffer');
expect(
  grownLayout.nodeAtIndex.join(',') === 'alpha,beta,gamma,delta',
  'growth keeps stable node ordering',
);
expectEqualBuffers(
  grownLayout.sourcePositions.slice(0, 9),
  new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
  'growth preserves current coordinates by node ID',
);
expectEqualBuffers(
  grownLayout.sourcePositions.slice(9, 12),
  grownLayout.targetPositions.slice(9, 12),
  'new nodes initialize from their finite target coordinates',
);
expectFinite(grownLayout.positions, 'grown positions');
expectFinite(grownLayout.targetPositions, 'grown target');

const shrunkLayout = createParticleLayout(
  [{ id: 'delta' }, { id: 'gamma' }],
  [{ source: 'delta', target: 'gamma' }],
  { shape: 'fractal', scale: 20 },
  grownLayout,
);
expect(shrunkLayout.positions.length === 6, 'shrink regenerates exact-size render buffer');
expect(shrunkLayout.sourcePositions.length === 6, 'shrink regenerates exact-size source buffer');
expect(shrunkLayout.targetPositions.length === 6, 'shrink regenerates exact-size target buffer');
expect(shrunkLayout.nodeAtIndex.join(',') === 'gamma,delta', 'shrink preserves survivor order');
expectEqualBuffers(
  shrunkLayout.sourcePositions.slice(0, 3),
  grownLayout.positions.slice(6, 9),
  'shrink preserves a surviving node position by ID',
);
expectEqualBuffers(
  shrunkLayout.sourcePositions.slice(3, 6),
  grownLayout.positions.slice(9, 12),
  'shrink preserves the other surviving node position by ID',
);
for (const [id, index] of shrunkLayout.indexOfNode) {
  expect(shrunkLayout.nodeAtIndex[index] === id, `shrunk reciprocal node index for ${id}`);
}
expectFinite(shrunkLayout.positions, 'shrunk positions');
expectFinite(shrunkLayout.targetPositions, 'shrunk target');

const emptyLayout = createParticleLayout([], graphEdges, {
  shape: 'fractal',
  lowPowerMode: false,
});
expect(emptyLayout.positions.length === 0, 'empty render buffer');
expect(emptyLayout.sourcePositions.length === 0, 'empty source buffer');
expect(emptyLayout.targetPositions.length === 0, 'empty target buffer');
expect(emptyLayout.nodeAtIndex.length === 0, 'empty node mapping');

const rawLowPowerTarget = generateParticlePositions('harmonics', initialNodes.length, 20);
const lowPowerLayout = createParticleLayout(initialNodes, graphEdges, {
  shape: 'harmonics',
  scale: 20,
  lowPowerMode: true,
});
expectEqualBuffers(
  lowPowerLayout.targetPositions,
  rawLowPowerTarget,
  'low-power mode skips edge attraction',
);
expectFinite(lowPowerLayout.targetPositions, 'low-power target');

const regularLayout = createParticleLayout(initialNodes, graphEdges, {
  shape: 'harmonics',
  scale: 20,
  lowPowerMode: false,
});
expect(
  regularLayout.targetPositions.some(
    (coordinate, index) => coordinate !== lowPowerLayout.targetPositions[index],
  ),
  'regular mode applies edge attraction',
);
expectFinite(regularLayout.targetPositions, 'regular target');

const deterministicLayoutA = createParticleLayout(initialNodes, graphEdges, {
  shape: 'lissajous',
  scale: 17,
});
const deterministicLayoutB = createParticleLayout(initialNodes, graphEdges, {
  shape: 'lissajous',
  scale: 17,
});
expectEqualBuffers(
  deterministicLayoutA.targetPositions,
  deterministicLayoutB.targetPositions,
  'complete layouts are deterministic',
);

const allLayouts: ParticleLayoutData[] = [
  initialLayout,
  grownLayout,
  shrunkLayout,
  emptyLayout,
  lowPowerLayout,
  regularLayout,
  deterministicLayoutA,
  deterministicLayoutB,
];
for (const layout of allLayouts) {
  expect(layout.positions.length === layout.nodeAtIndex.length * 3, 'render buffer/mapping parity');
  expect(layout.sourcePositions.length === layout.positions.length, 'source/render buffer parity');
  expect(layout.targetPositions.length === layout.positions.length, 'target/render buffer parity');
}

console.log(
  `particle verification passed: ${PARTICLE_SHAPES.length} shapes, deterministic finite buffers, layout growth/shrink, stable mapping, low-power mode, and edge attraction`,
);

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
import {
  advanceParticleMorph,
  createParticleVisualBuffers,
  easeParticleMorph,
  haveDifferentParticlePositions,
} from '../shared/particle-rendering';
import { createStore } from 'zustand/vanilla';
import { graphStateCreator } from '../src/stores/graph-store';

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

const zeroSizeVisuals = createParticleVisualBuffers(
  [
    { id: 'zero-a', fileSize: 0, color: '#000000' },
    { id: 'zero-b', fileSize: Number.NaN, color: '#fff' },
  ],
  ['zero-b', 'zero-a'],
  { minPointSize: 2, maxPointSize: 8 },
);
expect(zeroSizeVisuals.colors.length === 6, 'visual colors use exact RGB buffer length');
expect(zeroSizeVisuals.sizes.length === 2, 'visual sizes use exact node buffer length');
expect(
  zeroSizeVisuals.sizes.every((size) => size === 2),
  'zero and invalid file sizes remain finite at the minimum point size',
);
expectEqualBuffers(
  zeroSizeVisuals.colors,
  new Float32Array([1, 1, 1, 0, 0, 0]),
  'visual colors follow the stable node index rather than input order',
);

const equalSizeVisuals = createParticleVisualBuffers(
  [
    { id: 'equal-a', fileSize: 500, color: '#123456' },
    { id: 'equal-b', fileSize: 500, color: 'invalid' },
  ],
  ['equal-a', 'equal-b'],
  { minPointSize: 2, maxPointSize: 8, fallbackColor: '#abcdef' },
);
expect(
  equalSizeVisuals.sizes.every((size) => size === 5),
  'equal positive file sizes use the midpoint instead of dividing by zero',
);
expectFinite(equalSizeVisuals.colors, 'deterministic visual colors');
expectFinite(equalSizeVisuals.sizes, 'equal visual sizes');

const rangedSizeVisuals = createParticleVisualBuffers(
  [
    { id: 'small', fileSize: 0 },
    { id: 'medium', fileSize: 1_000 },
    { id: 'maximum', fileSize: Number.MAX_VALUE },
  ],
  ['small', 'medium', 'maximum'],
  { minPointSize: 3, maxPointSize: 9 },
);
expect(rangedSizeVisuals.sizes[0] === 3, 'zero file size maps to the minimum');
expect(
  rangedSizeVisuals.sizes[1] > 3 && rangedSizeVisuals.sizes[1] < 9,
  'intermediate file size remains within the visual range',
);
expect(rangedSizeVisuals.sizes[2] === 9, 'finite maximum file size maps without overflow');
expectFinite(rangedSizeVisuals.sizes, 'ranged visual sizes');
expectThrows(
  () => createParticleVisualBuffers([], [], { minPointSize: 5, maxPointSize: 4 }),
  'inverted visual size ranges fail explicitly',
);

const morphSource = new Float32Array([0, 0, 0, -10, 10, 20]);
const morphTarget = new Float32Array([10, -10, 5, 10, -10, -20]);
const morphDestination = new Float32Array(6);
const halfwayProgress = advanceParticleMorph(
  morphDestination,
  morphSource,
  morphTarget,
  0,
  0.5,
  1,
);
expect(halfwayProgress === 0.5, 'morph progress advances by elapsed duration');
expect(easeParticleMorph(0.5) === 0.5, 'morph easing is centered and deterministic');
expectEqualBuffers(
  morphDestination,
  new Float32Array([5, -5, 2.5, 0, 0, 0]),
  'halfway morph writes exact interpolated coordinates',
);
expect(haveDifferentParticlePositions(morphSource, morphTarget), 'morph detects changed targets');
expect(
  !haveDifferentParticlePositions(morphSource, Float32Array.from(morphSource)),
  'morph skips identical targets',
);

const extremeMorph = new Float32Array(3);
advanceParticleMorph(
  extremeMorph,
  new Float32Array([3e38, -3e38, 3e38]),
  new Float32Array([-3e38, 3e38, -3e38]),
  0,
  0.5,
  1,
);
expectFinite(extremeMorph, 'extreme finite morph coordinates');
expectThrows(
  () => advanceParticleMorph(new Float32Array(3), new Float32Array(6), new Float32Array(3), 0, 0.1),
  'mismatched morph buffers fail explicitly',
);
expectThrows(
  () => advanceParticleMorph(new Float32Array(3), new Float32Array(3), new Float32Array(3), 0, -0.1),
  'negative morph deltas fail explicitly',
);

const graphStore = createStore(graphStateCreator);
expect(graphStore.getState().viewMode === 'galaxy', 'graph store keeps the existing default view');
expect(graphStore.getState().particleShape === 'mobius', 'graph store defaults to Möbius particles');
graphStore.getState().setViewMode('particle');
expect(graphStore.getState().viewMode === 'particle', 'graph store selects Particle View');
for (const shape of PARTICLE_SHAPES) {
  graphStore.getState().setParticleShape(shape);
  expect(graphStore.getState().particleShape === shape, `graph store selects ${shape}`);
}
const originalNodeSize = graphStore.getState().settings.nodeSize;
graphStore.getState().updateSettings({ lowPowerMode: true });
expect(graphStore.getState().settings.lowPowerMode, 'graph store enables low-power particle behavior');
expect(
  graphStore.getState().settings.nodeSize === originalNodeSize,
  'partial graph settings updates preserve unrelated settings',
);

console.log(
  `particle verification passed: ${PARTICLE_SHAPES.length} shapes, deterministic finite buffers, exact visual sizing, smooth morphing, layout growth/shrink, stable mapping, low-power mode, edge attraction, and graph store controls`,
);

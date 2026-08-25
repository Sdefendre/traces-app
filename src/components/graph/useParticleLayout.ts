'use client';

import { useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  createParticleLayout,
  type ParticleLayoutData,
} from '../../../shared/particle-layout';
import { haveDifferentParticlePositions } from '../../../shared/particle-rendering';
import type { ParticleShape } from '../../../shared/particle-shapes';
import type { GraphEdge, GraphNode } from '@/types';

export interface ParticleLayoutRuntime {
  layout: ParticleLayoutData;
  morphProgress: MutableRefObject<number>;
  /** Changes whenever exact-size R3F attributes must be reconstructed. */
  revision: number;
}

interface ParticleLayoutInputs {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  shape: ParticleShape;
  lowPowerMode: boolean;
}

function createRuntime(
  inputs: ParticleLayoutInputs,
  previous?: ParticleLayoutRuntime,
): ParticleLayoutRuntime {
  const layout = createParticleLayout(
    inputs.nodes,
    inputs.edges,
    {
      shape: inputs.shape,
      lowPowerMode: inputs.lowPowerMode,
    },
    previous?.layout,
  );
  const shouldMorph = previous !== undefined && haveDifferentParticlePositions(
    layout.sourcePositions,
    layout.targetPositions,
  );

  return {
    layout,
    morphProgress: { current: shouldMorph ? 0 : 1 },
    revision: (previous?.revision ?? -1) + 1,
  };
}

function sameInputs(left: ParticleLayoutInputs, right: ParticleLayoutInputs): boolean {
  return (
    left.nodes === right.nodes &&
    left.edges === right.edges &&
    left.shape === right.shape &&
    left.lowPowerMode === right.lowPowerMode
  );
}

/**
 * Reconciles shared particle layouts after React commits. The previous mutable
 * render buffer is supplied to the foundation so surviving node IDs begin each
 * new morph at their current on-screen coordinates.
 */
export function useParticleLayout(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  shape: ParticleShape,
  lowPowerMode: boolean,
): ParticleLayoutRuntime {
  const inputs: ParticleLayoutInputs = { nodes, edges, shape, lowPowerMode };
  const committedInputsRef = useRef(inputs);
  const [runtime, setRuntime] = useState<ParticleLayoutRuntime>(() => createRuntime(inputs));

  useLayoutEffect(() => {
    const nextInputs: ParticleLayoutInputs = { nodes, edges, shape, lowPowerMode };
    if (sameInputs(committedInputsRef.current, nextInputs)) return;

    committedInputsRef.current = nextInputs;
    setRuntime((previous) => createRuntime(nextInputs, previous));
  }, [edges, lowPowerMode, nodes, shape]);

  return runtime;
}

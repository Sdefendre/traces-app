'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '@/types';

// d3-force-3d types
interface SimNode {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  index?: number;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  strength: number;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  z: number;
}

export function useForceGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const positionsRef = useRef<Map<string, NodePosition>>(new Map());
  const simRef = useRef<ReturnType<typeof import('d3-force-3d').forceSimulation> | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function initSim() {
      const d3 = await import('d3-force-3d');

      if (cancelled) return;

      const simNodes: SimNode[] = nodes.map((n, i) => ({
        id: n.id,
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        z: (Math.random() - 0.5) * 100,
        vx: 0,
        vy: 0,
        vz: 0,
      }));

      const simLinks: SimLink[] = edges.map((e) => ({
        source: e.source,
        target: e.target,
        strength: e.strength,
      }));

      const sim = d3
        .forceSimulation(simNodes, 3)
        .force(
          'charge',
          d3.forceManyBody().strength(-80).distanceMax(200)
        )
        .force(
          'link',
          d3
            .forceLink(simLinks)
            .id((d: SimNode) => d.id)
            .distance(40)
            .strength((l: SimLink) => l.strength * 0.5)
        )
        .force('center', d3.forceCenter())
        .force(
          'collision',
          d3.forceCollide().radius(8)
        )
        .alphaDecay(0.02)
        .velocityDecay(0.3);

      sim.on('tick', () => {
        tickRef.current++;
        const newPositions = new Map<string, NodePosition>();
        for (const node of simNodes) {
          newPositions.set(node.id, {
            id: node.id,
            x: node.x || 0,
            y: node.y || 0,
            z: node.z || 0,
          });
        }
        positionsRef.current = newPositions;
      });

      simRef.current = sim;
    }

    initSim();

    return () => {
      cancelled = true;
      if (simRef.current) {
        simRef.current.stop();
        simRef.current = null;
      }
    };
  }, [nodes, edges]);

  const getPositions = useCallback(() => {
    return positionsRef.current;
  }, []);

  return { getPositions, tickRef };
}

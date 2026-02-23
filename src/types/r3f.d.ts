// Re-export R3F global JSX types
import type { ThreeElements } from '@react-three/fiber';

declare module 'd3-force-3d' {
  export function forceSimulation(nodes?: any[], dimensions?: number): any;
  export function forceManyBody(): any;
  export function forceLink(links?: any[]): any;
  export function forceCenter(x?: number, y?: number, z?: number): any;
  export function forceCollide(radius?: number): any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

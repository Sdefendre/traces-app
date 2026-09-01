// Re-export R3F global JSX types (d3-force-3d shim lives in d3-force-3d.d.ts)
import type { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    // Augmenting IntrinsicElements with an empty extension is the documented R3F pattern.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}

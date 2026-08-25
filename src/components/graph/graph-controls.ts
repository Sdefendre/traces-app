import type { ComponentRef, RefObject } from 'react';

type OrbitControlsComponent = typeof import('@react-three/drei')['OrbitControls'];

export type GraphControls = ComponentRef<OrbitControlsComponent>;
export type GraphControlsRef = RefObject<GraphControls | null>;

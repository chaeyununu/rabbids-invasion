import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import ParallaxModel from './ParallaxModel';
import { initPointerTracking, subscribePointerUpdates } from '../utils/pointer';

function PointerInvalidator() {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    initPointerTracking();
    return subscribePointerUpdates(invalidate);
  }, [invalidate]);

  return null;
}

// Background and Rabbid each get their own <Suspense> boundary.
// This is what guarantees "changing the background must not change
// the rabbid" at the loading level too - swapping one GLB's Suspense
// never touches the other's.
export default function Scene({ background, rabbid }) {
  return (
    <Canvas
      className="app-canvas"
      camera={{ position: [0, 0, 6], fov: 40 }}
      dpr={[0.85, 1]}
      frameloop="demand"
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#000000']} />
      <PointerInvalidator />

      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} />

      <Suspense fallback={null}>
        <ParallaxModel key={`${background.id}:${background.path}`} config={background} />
      </Suspense>

      <Suspense fallback={null}>
        <ParallaxModel key={rabbid.path} config={rabbid} />
      </Suspense>
    </Canvas>
  );
}

import { Clone, useGLTF } from '@react-three/drei';

interface GLBModelProps {
  url: string;
  scale?: number;
  rotationY?: number;
  position?: [number, number, number];
}

/** Reusable GLB model loader — uses Clone for efficient instancing */
export function GLBModel({ url, scale = 1, rotationY = 0, position }: GLBModelProps) {
  const { scene } = useGLTF(url);
  return (
    <group rotation={[0, rotationY, 0]} scale={scale} position={position}>
      <Clone object={scene} />
    </group>
  );
}

/** Deterministic variant picker based on grid position */
export function pickVariant(x: number, z: number, variants: string[], seed: number = 0): string {
  const hash = ((x * 374761393 + z * 668265263 + seed * 1274126177) >>> 0) % variants.length;
  return variants[hash];
}

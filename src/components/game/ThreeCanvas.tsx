import { Canvas } from '@react-three/fiber';
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, TileType, TILE_SIZE } from '@/types/game';
import CityScene from './CityScene';

interface Props {
  gameState: GameState;
  onTileClick: (x: number, y: number) => void;
  onTileDrag: (tiles: { x: number; y: number }[]) => void;
  onRotate: () => void;
}

export default function ThreeCanvas({ gameState, onTileClick, onTileDrag, onRotate }: Props) {
  const [cameraAngle, setCameraAngle] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(18);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') setCameraAngle(a => (a + 1) % 4);
      if (e.key === 'e' || e.key === 'E') setCameraAngle(a => (a + 3) % 4);
      if (e.key === 'r' || e.key === 'R') onRotate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRotate]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCameraZoom(z => Math.max(6, Math.min(80, z + (e.deltaY > 0 ? -1.5 : 1.5))));
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      onWheel={handleWheel}
      onContextMenu={e => e.preventDefault()}
    >
      <Canvas
        orthographic
        camera={{ zoom: 18, near: 0.1, far: 1000, position: [80, 80, 80] }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a14');
        }}
      >
        <CityScene
          gameState={gameState}
          cameraAngle={cameraAngle}
          cameraZoom={cameraZoom}
          onTileClick={onTileClick}
          onTileDrag={onTileDrag}
        />
      </Canvas>
    </div>
  );
}

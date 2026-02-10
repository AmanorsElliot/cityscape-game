import { Canvas } from '@react-three/fiber';
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, TileType, TILE_SIZE } from '@/types/game';
import CityScene from './CityScene';
import MobileControls from './MobileControls';

interface Props {
  gameState: GameState;
  onTileClick: (x: number, y: number) => void;
  onTileDrag: (tiles: { x: number; y: number }[]) => void;
  onRotate: () => void;
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export default function ThreeCanvas({ gameState, onTileClick, onTileDrag, onRotate }: Props) {
  const [cameraAngle, setCameraAngle] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(18);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || isTouchDevice());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  // Touch gesture handling: pinch-to-zoom
  const touchState = useRef<{ dist: number; zoom: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchState.current = { dist: Math.hypot(dx, dy), zoom: cameraZoom };
    }
  }, [cameraZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchState.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const scale = newDist / touchState.current.dist;
      setCameraZoom(Math.max(6, Math.min(80, touchState.current.zoom * scale)));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchState.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      onWheel={handleWheel}
      onContextMenu={e => e.preventDefault()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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

      {/* Mobile on-screen controls */}
      {isMobile && (
        <MobileControls
          onRotateCamera={(dir) => setCameraAngle(a => (a + dir + 4) % 4)}
          onZoom={(delta) => setCameraZoom(z => Math.max(6, Math.min(80, z + delta)))}
          onRotateBuilding={onRotate}
        />
      )}
    </div>
  );
}

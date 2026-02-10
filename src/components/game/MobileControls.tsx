import { RotateCcw, RotateCw, ZoomIn, ZoomOut, RotateCw as Rotate } from 'lucide-react';

interface Props {
  onRotateCamera: (dir: number) => void;
  onZoom: (delta: number) => void;
  onRotateBuilding: () => void;
}

export default function MobileControls({ onRotateCamera, onZoom, onRotateBuilding }: Props) {
  const btn = "glass-panel rounded-xl w-10 h-10 flex items-center justify-center text-muted-foreground active:bg-primary/20 active:text-primary transition-all touch-manipulation";

  return (
    <div className="absolute right-2 bottom-20 z-20 flex flex-col gap-1.5 pointer-events-auto">
      <button className={btn} onClick={() => onZoom(4)} aria-label="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button className={btn} onClick={() => onZoom(-4)} aria-label="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <div className="h-1" />
      <button className={btn} onClick={() => onRotateCamera(1)} aria-label="Rotate camera left">
        <RotateCcw className="w-4 h-4" />
      </button>
      <button className={btn} onClick={() => onRotateCamera(-1)} aria-label="Rotate camera right">
        <RotateCw className="w-4 h-4" />
      </button>
      <div className="h-1" />
      <button className={btn} onClick={onRotateBuilding} aria-label="Rotate building">
        <Rotate className="w-4 h-4" />
      </button>
    </div>
  );
}

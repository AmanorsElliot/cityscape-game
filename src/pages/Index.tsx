import { useGameState } from '@/hooks/useGameState';
import IsometricCanvas from '@/components/game/IsometricCanvas';
import Toolbar from '@/components/game/Toolbar';
import ResourceBar from '@/components/game/ResourceBar';
import SpeedControls from '@/components/game/SpeedControls';
import Minimap from '@/components/game/Minimap';
import DemandMeter from '@/components/game/DemandMeter';
import { RefreshCw } from 'lucide-react';

const Index = () => {
  const { gameState, placeTile, selectTool, setSpeed, regenerateMap } = useGameState();

  return (
    <div className="fixed inset-0 bg-background overflow-hidden flex flex-col">
      {/* Top HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
        <div className="glass-panel rounded-2xl px-5 py-2">
          <h1 className="font-display text-sm font-bold tracking-wider glow-text text-primary">
            CITYSCAPE
          </h1>
        </div>
        <ResourceBar resources={gameState.resources} />
        <SpeedControls speed={gameState.speed} onSetSpeed={setSpeed} />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <IsometricCanvas gameState={gameState} onTileClick={placeTile} />
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <Toolbar
          selected={gameState.selectedTool}
          onSelect={selectTool}
          money={gameState.resources.money}
        />
      </div>

      {/* Right panel: minimap + demand */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-3">
        <Minimap gameState={gameState} />
        <DemandMeter demand={gameState.resources.demand} />
        <button
          onClick={regenerateMap}
          className="glass-panel rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Generate new map"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="font-display text-[10px] tracking-wider">NEW MAP</span>
        </button>
      </div>

      {/* Help hint */}
      <div className="absolute bottom-6 right-6 z-10 glass-panel rounded-xl px-3 py-2 text-xs text-muted-foreground">
        Click to place • Drag to pan • Scroll to zoom
      </div>
    </div>
  );
};

export default Index;

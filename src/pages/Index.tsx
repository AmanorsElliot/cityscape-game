import { useState } from 'react';
import { useGameState } from '@/hooks/useGameState';
import IsometricCanvas from '@/components/game/IsometricCanvas';
import Toolbar from '@/components/game/Toolbar';
import ResourceBar from '@/components/game/ResourceBar';
import SpeedControls from '@/components/game/SpeedControls';
import Minimap from '@/components/game/Minimap';
import DemandMeter from '@/components/game/DemandMeter';
import OverlaySelector from '@/components/game/OverlaySelector';
import BudgetPanel from '@/components/game/BudgetPanel';
import { RefreshCw, BarChart3 } from 'lucide-react';

const Index = () => {
  const { gameState, placeTile, placeTileLine, selectTool, setSpeed, regenerateMap, setOverlay } = useGameState();
  const [showBudget, setShowBudget] = useState(false);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden flex flex-col">
      {/* Top HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
        <div className="glass-panel rounded-2xl px-5 py-2">
          <h1 className="font-display text-sm font-bold tracking-wider glow-text text-primary">CITYSCAPE</h1>
        </div>
        <ResourceBar resources={gameState.resources} />
        <SpeedControls speed={gameState.speed} onSetSpeed={setSpeed} />
        <button
          onClick={() => setShowBudget(!showBudget)}
          className={`glass-panel rounded-xl p-2.5 transition-all ${showBudget ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          title="Budget"
        >
          <BarChart3 className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <IsometricCanvas gameState={gameState} onTileClick={placeTile} onTileDrag={placeTileLine} />
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <Toolbar selected={gameState.selectedTool} onSelect={selectTool} money={gameState.resources.money} />
      </div>

      {/* Right panel */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-2 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide">
        <Minimap gameState={gameState} />
        <DemandMeter demand={gameState.resources.demand} />
        <OverlaySelector current={gameState.overlay} onSelect={setOverlay} />
        <button
          onClick={regenerateMap}
          className="glass-panel rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Generate new map"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="font-display text-[10px] tracking-wider">NEW MAP</span>
        </button>
      </div>

      {/* Budget panel */}
      {showBudget && (
        <div className="absolute top-20 left-4 z-10">
          <BudgetPanel resources={gameState.resources} budgetHistory={gameState.budgetHistory} onClose={() => setShowBudget(false)} />
        </div>
      )}

      {/* Help hint */}
      <div className="absolute bottom-6 right-6 z-10 glass-panel rounded-xl px-3 py-2 text-xs text-muted-foreground">
        Click to place • Drag zones/roads • Zones need roads • Scroll to zoom
      </div>
    </div>
  );
};

export default Index;

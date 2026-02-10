import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameState } from '@/hooks/useGameState';
import { useSaveSystem } from '@/hooks/useSaveSystem';
import ThreeCanvas from '@/components/game/ThreeCanvas';
import Toolbar from '@/components/game/Toolbar';
import ResourceBar from '@/components/game/ResourceBar';
import SpeedControls from '@/components/game/SpeedControls';
import Minimap from '@/components/game/Minimap';
import DemandMeter from '@/components/game/DemandMeter';
import OverlaySelector from '@/components/game/OverlaySelector';
import BudgetPanel from '@/components/game/BudgetPanel';
import MultiplayerPanel from '@/components/game/MultiplayerPanel';
import AuthPage from '@/pages/AuthPage';
import { RefreshCw, BarChart3, Save, Users, LogOut, Layers, HelpCircle } from 'lucide-react';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { gameState, placeTile, placeTileLine, selectTool, setSpeed, regenerateMap, setOverlay, loadSave, setRotation } = useGameState();
  const [showBudget, setShowBudget] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleLoadSave = useCallback((data: { grid_data: any; resources: any; tick: number; time_of_day: number }) => {
    loadSave(data);
  }, [loadSave]);

  const { save, cityId } = useSaveSystem(guestMode ? undefined : user?.id, gameState, handleLoadSave);

  if (loading && !guestMode) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="font-display text-primary glow-text text-xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!user && !guestMode) return <AuthPage onPlayGuest={() => setGuestMode(true)} />;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden flex flex-col safe-area-inset">
      {/* Canvas - full screen */}
      <div className="flex-1 relative">
        <ThreeCanvas gameState={gameState} onTileClick={placeTile} onTileDrag={placeTileLine} onRotate={() => setRotation((gameState.rotation + 1) % 2)} />
      </div>

      {/* Compact top-left: logo + key stats */}
      <div className="absolute top-safe left-2 sm:left-3 z-10 flex items-center gap-1 sm:gap-2 max-w-[65vw] sm:max-w-[70vw]">
        <div className="glass-panel rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 shrink-0">
          <h1 className="font-display text-[10px] sm:text-xs font-bold tracking-wider glow-text text-primary">CITYSCAPE</h1>
        </div>
        <ResourceBar resources={gameState.resources} />
      </div>

      {/* Top-right: compact action buttons - stacked on mobile */}
      <div className="absolute top-safe right-2 sm:right-3 z-10 flex items-center gap-1 sm:gap-1.5">
        <SpeedControls speed={gameState.speed} onSetSpeed={setSpeed} />
        <button
          onClick={() => setShowBudget(!showBudget)}
          className={`glass-panel rounded-lg p-1.5 sm:p-2 transition-all touch-manipulation ${showBudget ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          title="Budget"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className={`glass-panel rounded-lg p-1.5 sm:p-2 transition-all touch-manipulation ${showRightPanel ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          title="Data overlays & demand"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        {!guestMode && (
          <>
            <button onClick={save} className="glass-panel rounded-lg p-2 text-muted-foreground hover:text-foreground transition-all touch-manipulation hidden sm:block" title="Save">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowMultiplayer(!showMultiplayer)}
              className={`glass-panel rounded-lg p-2 transition-all touch-manipulation hidden sm:block ${showMultiplayer ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="Multiplayer"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
            <button onClick={signOut} className="glass-panel rounded-lg p-2 text-muted-foreground hover:text-foreground transition-all touch-manipulation hidden sm:block" title="Sign out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {guestMode && (
          <button onClick={() => setGuestMode(false)} className="glass-panel rounded-lg p-1.5 sm:p-2 text-muted-foreground hover:text-foreground transition-all touch-manipulation" title="Sign in">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Minimap - hidden on very small screens */}
      <div className="absolute top-14 right-2 sm:right-3 z-10 hidden sm:block">
        <Minimap gameState={gameState} />
      </div>

      {/* Collapsible right panel: RCI + Overlays */}
      {showRightPanel && (
        <div className="absolute top-14 right-2 sm:right-[180px] z-10 flex flex-col gap-2 animate-fade-in max-h-[60vh] overflow-y-auto">
          <DemandMeter demand={gameState.resources.demand} />
          <OverlaySelector current={gameState.overlay} onSelect={setOverlay} />
          <button
            onClick={regenerateMap}
            className="glass-panel rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            title="Generate new map"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="font-display text-[10px] tracking-wider">NEW MAP</span>
          </button>
        </div>
      )}

      {/* Bottom toolbar - scrollable on mobile */}
      <div
        className="absolute bottom-safe-bottom left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-10 px-2 sm:px-0"
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      >
        <div className="overflow-x-auto scrollbar-hide">
          <Toolbar selected={gameState.selectedTool} onSelect={selectTool} money={gameState.resources.money} />
        </div>
      </div>

      {/* Budget panel */}
      {showBudget && (
        <div className="absolute top-14 left-2 sm:left-3 z-10 max-w-[90vw]">
          <BudgetPanel resources={gameState.resources} budgetHistory={gameState.budgetHistory} onClose={() => setShowBudget(false)} />
        </div>
      )}

      {/* Multiplayer panel */}
      {showMultiplayer && (
        <div className="absolute top-14 left-2 sm:left-3 z-10 max-w-[90vw]">
          <MultiplayerPanel cityId={cityId} onClose={() => setShowMultiplayer(false)} />
        </div>
      )}

      {/* Help toggle - bottom right, above mobile controls area */}
      <div className="absolute bottom-24 sm:bottom-4 right-14 sm:right-3 z-10">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="glass-panel rounded-lg p-2 text-muted-foreground hover:text-foreground transition-all touch-manipulation"
          title="Controls"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        {showHelp && (
          <div className="absolute bottom-10 right-0 glass-panel rounded-xl px-3 py-2 text-[10px] text-muted-foreground whitespace-nowrap animate-fade-in">
            <span className="hidden sm:inline">Click to place • Drag zones/roads • R rotate • Q/E camera • Right-drag pan • Scroll zoom</span>
            <span className="sm:hidden">Tap to place • Pinch to zoom • Use buttons to rotate</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;

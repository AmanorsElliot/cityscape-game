import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, Tile } from '@/types/game';

interface SaveData {
  grid_data: { type: string; level: number; x: number; y: number; elevation: number }[][];
  resources: GameState['resources'];
  tick: number;
  time_of_day: number;
}

function serializeGrid(grid: Tile[][]): SaveData['grid_data'] {
  return grid.map(row => row.map(t => ({
    type: t.type, level: t.level, x: t.x, y: t.y, elevation: t.elevation,
  })));
}

export function useSaveSystem(userId: string | undefined, gameState: GameState, loadSave: (data: SaveData) => void) {
  const lastSaveRef = useRef(0);
  const cityIdRef = useRef<string | null>(null);

  // Load save on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('cities')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        cityIdRef.current = data.id;
        const gridData = data.grid_data as SaveData['grid_data'];
        const resources = data.resources as unknown as GameState['resources'];
        if (gridData && Array.isArray(gridData) && gridData.length > 0) {
          loadSave({ grid_data: gridData, resources, tick: data.tick, time_of_day: data.time_of_day });
        }
      } else {
        // Create city record
        const { data: newCity } = await supabase
          .from('cities')
          .insert({ user_id: userId })
          .select()
          .single();
        if (newCity) cityIdRef.current = newCity.id;
      }
    })();
  }, [userId, loadSave]);

  // Auto-save every 30 seconds
  const save = useCallback(async () => {
    if (!userId || !cityIdRef.current) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 5000) return; // debounce
    lastSaveRef.current = now;

    await supabase
      .from('cities')
      .update({
        grid_data: JSON.parse(JSON.stringify(serializeGrid(gameState.grid))),
        resources: JSON.parse(JSON.stringify(gameState.resources)),
        tick: gameState.tick,
        time_of_day: gameState.timeOfDay,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cityIdRef.current);
  }, [userId, gameState]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(save, 30000);
    return () => clearInterval(interval);
  }, [save, userId]);

  return { save, cityId: cityIdRef.current };
}

import { useMemo } from 'react';
import * as THREE from 'three';
import { GameState, Tile } from '@/types/game';

/** Seeded pseudo-random for deterministic placement */
function seededRandom(x: number, y: number, seed: number = 42): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967296;
}

// --- Pine Tree (conifer) ---
function PineTree({ scale = 1, color = '#2d5a27' }: { scale?: number; color?: string }) {
  return (
    <group scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.12, 6]} />
        <meshLambertMaterial color="#5d4037" />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 0.16, 0]}>
        <coneGeometry args={[0.08, 0.14, 6]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <coneGeometry args={[0.06, 0.12, 6]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.30, 0]}>
        <coneGeometry args={[0.04, 0.08, 6]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

// --- Deciduous Tree (round canopy) ---
function DeciduousTree({ scale = 1, color = '#4caf50' }: { scale?: number; color?: string }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.012, 0.018, 0.16, 6]} />
        <meshLambertMaterial color="#6d4c41" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.09, 7, 5]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

// --- Bush ---
function Bush({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.05, 6, 4]} />
        <meshLambertMaterial color="#558b2f" />
      </mesh>
    </group>
  );
}

// --- Rock ---
function Rock({ scale = 1, color = '#9e9e9e' }: { scale?: number; color?: string }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.02, 0]} rotation={[0.2, 0.5, 0.1]}>
        <dodecahedronGeometry args={[0.04, 0]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

// --- Flower patch ---
function FlowerPatch({ color = '#e91e63' }: { color?: string }) {
  return (
    <group>
      {[[-0.02, 0, 0.01], [0.02, 0, -0.01], [0, 0, 0.03]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.03, 4]} />
            <meshLambertMaterial color="#4caf50" />
          </mesh>
          <mesh position={[0, 0.035, 0]}>
            <sphereGeometry args={[0.01, 5, 4]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- Grass Tuft ---
function GrassTuft() {
  return (
    <group>
      {[-0.01, 0, 0.01].map((xOff, i) => (
        <mesh key={i} position={[xOff, 0.015, i * 0.005]} rotation={[(i - 1) * 0.15, 0, (i - 1) * 0.1]}>
          <boxGeometry args={[0.005, 0.03, 0.003]} />
          <meshLambertMaterial color="#7cb342" />
        </mesh>
      ))}
    </group>
  );
}

// --- Cattail (for near water/sand) ---
function Cattail() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.06, 4]} />
        <meshLambertMaterial color="#8bc34a" />
      </mesh>
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.015, 4]} />
        <meshLambertMaterial color="#5d4037" />
      </mesh>
    </group>
  );
}

// --- Tent (homeless camp) ---
function Tent({ color = '#8d6e63' }: { color?: string }) {
  return (
    <group>
      {/* Tent body - triangular prism approximated with a cone */}
      <mesh position={[0, 0.04, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.06, 0.08, 4]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Ground tarp */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, 0.08]} />
        <meshLambertMaterial color="#5d4037" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// --- Bedroll ---
function Bedroll() {
  return (
    <group>
      <mesh position={[0, 0.008, 0]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.04, 0.015, 0.09]} />
        <meshLambertMaterial color="#795548" />
      </mesh>
      {/* Pillow */}
      <mesh position={[0, 0.018, -0.035]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.035, 0.012, 0.02]} />
        <meshLambertMaterial color="#a1887f" />
      </mesh>
    </group>
  );
}

// --- Campfire (for homeless camp) ---
function Campfire() {
  return (
    <group>
      {/* Stone ring */}
      {[0, 1, 2, 3, 4, 5].map(i => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.025, 0.008, Math.sin(a) * 0.025]}>
            <sphereGeometry args={[0.008, 4, 3]} />
            <meshLambertMaterial color="#757575" />
          </mesh>
        );
      })}
      {/* Fire */}
      <mesh position={[0, 0.02, 0]}>
        <coneGeometry args={[0.012, 0.03, 5]} />
        <meshBasicMaterial color="#ff6d00" />
      </mesh>
    </group>
  );
}

interface NatureItem {
  x: number;
  z: number;
  ox: number;
  oz: number;
  type: 'pine' | 'deciduous' | 'bush' | 'rock' | 'flower' | 'grass_tuft' | 'cattail';
  scale: number;
  rotY: number;
  variant: number;
}

/** Scatter nature objects on terrain tiles */
export function NatureLayer({ grid, gridSize }: { grid: GameState['grid']; gridSize: number }) {
  const items = useMemo(() => {
    const result: NatureItem[] = [];

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const tile = grid[z][x];
        if (tile.anchorX !== undefined) continue;

        const r1 = seededRandom(x, z, 1);
        const r2 = seededRandom(x, z, 2);
        const r3 = seededRandom(x, z, 3);
        const r4 = seededRandom(x, z, 4);
        const r5 = seededRandom(x, z, 5);

        if (tile.type === 'forest') {
          // Dense trees
          const treeCount = 2 + Math.floor(r1 * 3);
          for (let i = 0; i < treeCount; i++) {
            const ri = seededRandom(x, z, 10 + i);
            const ri2 = seededRandom(x, z, 20 + i);
            const ri3 = seededRandom(x, z, 30 + i);
            result.push({
              x, z,
              ox: 0.15 + ri * 0.7,
              oz: 0.15 + ri2 * 0.7,
              type: ri3 < 0.6 ? 'pine' : 'deciduous',
              scale: 0.7 + ri * 0.6,
              rotY: ri2 * Math.PI * 2,
              variant: Math.floor(ri3 * 3),
            });
          }
          // Occasional bush
          if (r2 < 0.4) {
            result.push({
              x, z, ox: 0.2 + r3 * 0.6, oz: 0.3 + r4 * 0.5,
              type: 'bush', scale: 0.6 + r5 * 0.5, rotY: r3 * Math.PI, variant: 0,
            });
          }
        } else if (tile.type === 'grass') {
          // Sparse nature on grass
          if (r1 < 0.08) {
            result.push({
              x, z, ox: 0.2 + r2 * 0.6, oz: 0.2 + r3 * 0.6,
              type: r4 < 0.5 ? 'deciduous' : 'pine',
              scale: 0.5 + r5 * 0.5, rotY: r2 * Math.PI * 2, variant: 0,
            });
          }
          if (r2 < 0.06) {
            result.push({
              x, z, ox: 0.3 + r3 * 0.4, oz: 0.4 + r4 * 0.4,
              type: 'bush', scale: 0.5 + r5 * 0.4, rotY: 0, variant: 0,
            });
          }
          if (r3 < 0.05) {
            result.push({
              x, z, ox: 0.5 + r4 * 0.3, oz: 0.5 + r5 * 0.3,
              type: 'rock', scale: 0.5 + r1 * 0.8, rotY: r2 * Math.PI, variant: 0,
            });
          }
          if (r4 < 0.04) {
            result.push({
              x, z, ox: 0.3 + r5 * 0.4, oz: 0.2 + r1 * 0.5,
              type: 'flower', scale: 1, rotY: 0, variant: Math.floor(r2 * 4),
            });
          }
          if (r5 < 0.1) {
            result.push({
              x, z, ox: 0.4 + r1 * 0.3, oz: 0.3 + r2 * 0.4,
              type: 'grass_tuft', scale: 0.8 + r3 * 0.4, rotY: r4 * Math.PI, variant: 0,
            });
          }
        } else if (tile.type === 'sand') {
          // Rocks and cattails near water
          if (r1 < 0.1) {
            result.push({
              x, z, ox: 0.3 + r2 * 0.4, oz: 0.3 + r3 * 0.4,
              type: 'rock', scale: 0.4 + r4 * 0.6, rotY: r5 * Math.PI, variant: 0,
            });
          }
          if (r2 < 0.08) {
            result.push({
              x, z, ox: 0.5 + r3 * 0.3, oz: 0.5 + r4 * 0.3,
              type: 'cattail', scale: 0.8 + r5 * 0.4, rotY: r1 * Math.PI, variant: 0,
            });
          }
        } else if (tile.type === 'park') {
          // Parks get nice trees and flowers
          const treeCount = 1 + Math.floor(r1 * 2);
          for (let i = 0; i < treeCount; i++) {
            const ri = seededRandom(x, z, 10 + i);
            const ri2 = seededRandom(x, z, 20 + i);
            result.push({
              x, z,
              ox: 0.2 + ri * 0.6,
              oz: 0.2 + ri2 * 0.6,
              type: 'deciduous',
              scale: 0.8 + ri * 0.4,
              rotY: ri2 * Math.PI * 2,
              variant: 0,
            });
          }
          if (r3 < 0.6) {
            result.push({
              x, z, ox: 0.4 + r4 * 0.3, oz: 0.3 + r5 * 0.4,
              type: 'flower', scale: 1, rotY: 0, variant: Math.floor(r2 * 4),
            });
          }
        }
      }
    }
    return result;
  }, [grid, gridSize]);

  const flowerColors = ['#e91e63', '#ff9800', '#ffeb3b', '#9c27b0'];
  const pineColors = ['#2d5a27', '#1b5e20', '#33691e'];
  const deciduousColors = ['#4caf50', '#66bb6a', '#43a047', '#388e3c'];

  if (items.length === 0) return null;

  return (
    <group>
      {items.map((item, i) => (
        <group key={i} position={[item.x + item.ox, 0, item.z + item.oz]} rotation={[0, item.rotY, 0]}>
          {item.type === 'pine' && <PineTree scale={item.scale} color={pineColors[item.variant % pineColors.length]} />}
          {item.type === 'deciduous' && <DeciduousTree scale={item.scale} color={deciduousColors[item.variant % deciduousColors.length]} />}
          {item.type === 'bush' && <Bush scale={item.scale} />}
          {item.type === 'rock' && <Rock scale={item.scale} />}
          {item.type === 'flower' && <FlowerPatch color={flowerColors[item.variant % flowerColors.length]} />}
          {item.type === 'grass_tuft' && <GrassTuft />}
          {item.type === 'cattail' && <Cattail />}
        </group>
      ))}
    </group>
  );
}

/** Homeless camps appear when residential demand > threshold and no space */
export function HomelessCamps({ grid, gridSize, demand, population }: {
  grid: GameState['grid']; gridSize: number; demand: number; population: number;
}) {
  const camps = useMemo(() => {
    // Only show camps when residential demand is very high (>0.5) and population > 100
    if (demand < 0.5 || population < 100) return [];

    // Check if there's available residential space (grass adjacent to roads)
    let availableSpaces = 0;
    const roadAdjacentGrass: { x: number; z: number }[] = [];

    for (let z = 1; z < gridSize - 1; z++) {
      for (let x = 1; x < gridSize - 1; x++) {
        const tile = grid[z][x];
        if (tile.type === 'grass' && tile.anchorX === undefined) {
          const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
          let nearRoad = false;
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = z + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
              if (grid[ny][nx].type === 'road') { nearRoad = true; break; }
            }
          }
          if (nearRoad) {
            availableSpaces++;
            roadAdjacentGrass.push({ x, z });
          }
        }
      }
    }

    // If there's plenty of space, no homeless camps
    if (availableSpaces > 10) return [];

    // Place camps based on demand intensity
    const campCount = Math.min(12, Math.floor((demand - 0.4) * 15));
    const result: { x: number; z: number; items: ('tent' | 'bedroll' | 'campfire')[]; rotY: number }[] = [];

    // Find any grass near roads for camp placement
    const candidates = roadAdjacentGrass.length > 0
      ? roadAdjacentGrass
      : (() => {
        // Fallback: find grass tiles near anything built
        const fallback: { x: number; z: number }[] = [];
        for (let z = 1; z < gridSize - 1; z++) {
          for (let x = 1; x < gridSize - 1; x++) {
            if (grid[z][x].type === 'grass' && grid[z][x].anchorX === undefined) {
              const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
              for (const [dx, dy] of dirs) {
                const t = grid[z+dy]?.[x+dx];
                if (t && t.type !== 'grass' && t.type !== 'water' && t.type !== 'sand' && t.type !== 'forest') {
                  fallback.push({ x, z });
                  break;
                }
              }
            }
          }
        }
        return fallback;
      })();

    for (let i = 0; i < Math.min(campCount, candidates.length); i++) {
      const idx = Math.floor(seededRandom(i, campCount, 99) * candidates.length);
      const spot = candidates[idx];
      const r = seededRandom(spot.x, spot.z, 77);
      const items: ('tent' | 'bedroll' | 'campfire')[] = [];
      if (r < 0.5) items.push('tent');
      else items.push('bedroll');
      if (seededRandom(spot.x, spot.z, 88) < 0.4) items.push('campfire');
      if (seededRandom(spot.x, spot.z, 66) < 0.3) items.push('bedroll');

      result.push({ x: spot.x, z: spot.z, items, rotY: r * Math.PI * 2 });
    }

    return result;
  }, [grid, gridSize, demand, population]);

  if (camps.length === 0) return null;

  const tentColors = ['#8d6e63', '#a1887f', '#6d4c41', '#4e342e', '#3e7cb1'];

  return (
    <group>
      {camps.map((camp, ci) => (
        <group key={ci} position={[camp.x + 0.5, 0, camp.z + 0.5]} rotation={[0, camp.rotY, 0]}>
          {camp.items.map((item, ii) => {
            const offset = ii * 0.12 - (camp.items.length - 1) * 0.06;
            if (item === 'tent') return (
              <group key={ii} position={[offset, 0, 0]}>
                <Tent color={tentColors[ci % tentColors.length]} />
              </group>
            );
            if (item === 'bedroll') return (
              <group key={ii} position={[offset + 0.05, 0, 0.04]}>
                <Bedroll />
              </group>
            );
            if (item === 'campfire') return (
              <group key={ii} position={[0, 0, -0.06]}>
                <Campfire />
              </group>
            );
            return null;
          })}
        </group>
      ))}
    </group>
  );
}

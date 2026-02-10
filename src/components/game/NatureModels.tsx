import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { GameState, Tile } from '@/types/game';
import { GLBModel, pickVariant } from './GLBModel';

/** Seeded pseudo-random for deterministic placement */
function seededRandom(x: number, y: number, seed: number = 42): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967296;
}

// --- Nature GLB model paths ---

const PINE_TREES = [
  '/models/nature/tree_pineDefaultA.glb',
  '/models/nature/tree_pineDefaultB.glb',
  '/models/nature/tree_pineRoundA.glb',
  '/models/nature/tree_pineRoundB.glb',
];

const DECIDUOUS_TREES = [
  '/models/nature/tree_oak.glb',
  '/models/nature/tree_default.glb',
  '/models/nature/tree_detailed.glb',
  '/models/nature/tree_fat.glb',
  '/models/nature/tree_tall.glb',
];

const BUSH_MODELS = [
  '/models/nature/plant_bush.glb',
  '/models/nature/plant_bushSmall.glb',
  '/models/nature/plant_bushLarge.glb',
];

const ROCK_MODELS = [
  '/models/nature/rock_smallA.glb',
  '/models/nature/rock_smallB.glb',
  '/models/nature/rock_smallC.glb',
  '/models/nature/rock_smallD.glb',
  '/models/nature/rock_smallE.glb',
  '/models/nature/rock_smallF.glb',
];

const FLOWER_MODELS = [
  '/models/nature/flower_redA.glb',
  '/models/nature/flower_yellowA.glb',
  '/models/nature/flower_purpleA.glb',
  '/models/nature/flower_redB.glb',
  '/models/nature/flower_yellowB.glb',
  '/models/nature/flower_purpleB.glb',
];

const GRASS_MODELS = [
  '/models/nature/grass.glb',
  '/models/nature/grass_large.glb',
  '/models/nature/grass_leafs.glb',
];

const CATTAIL_MODELS = [
  '/models/nature/plant_flatTall.glb',
  '/models/nature/plant_flatShort.glb',
];

// --- Nature item rendering ---

function NatureGLB({ type, variant, scale, rotY }: {
  type: string; variant: number; scale: number; rotY: number;
}) {
  let url: string;
  let modelScale = scale;

  switch (type) {
    case 'pine':
      url = PINE_TREES[variant % PINE_TREES.length];
      modelScale *= 0.22;
      break;
    case 'deciduous':
      url = DECIDUOUS_TREES[variant % DECIDUOUS_TREES.length];
      modelScale *= 0.2;
      break;
    case 'bush':
      url = BUSH_MODELS[variant % BUSH_MODELS.length];
      modelScale *= 0.18;
      break;
    case 'rock':
      url = ROCK_MODELS[variant % ROCK_MODELS.length];
      modelScale *= 0.15;
      break;
    case 'flower':
      url = FLOWER_MODELS[variant % FLOWER_MODELS.length];
      modelScale *= 0.2;
      break;
    case 'grass_tuft':
      url = GRASS_MODELS[variant % GRASS_MODELS.length];
      modelScale *= 0.15;
      break;
    case 'cattail':
      url = CATTAIL_MODELS[variant % CATTAIL_MODELS.length];
      modelScale *= 0.18;
      break;
    default:
      url = PINE_TREES[0];
      modelScale *= 0.2;
  }

  return <GLBModel url={url} scale={modelScale} rotationY={rotY} />;
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
              variant: Math.floor(ri3 * 4),
            });
          }
          if (r2 < 0.4) {
            result.push({
              x, z, ox: 0.2 + r3 * 0.6, oz: 0.3 + r4 * 0.5,
              type: 'bush', scale: 0.6 + r5 * 0.5, rotY: r3 * Math.PI, variant: Math.floor(r4 * 3),
            });
          }
        } else if (tile.type === 'grass') {
          if (r1 < 0.08) {
            result.push({
              x, z, ox: 0.2 + r2 * 0.6, oz: 0.2 + r3 * 0.6,
              type: r4 < 0.5 ? 'deciduous' : 'pine',
              scale: 0.5 + r5 * 0.5, rotY: r2 * Math.PI * 2, variant: Math.floor(r3 * 4),
            });
          }
          if (r2 < 0.06) {
            result.push({
              x, z, ox: 0.3 + r3 * 0.4, oz: 0.4 + r4 * 0.4,
              type: 'bush', scale: 0.5 + r5 * 0.4, rotY: 0, variant: Math.floor(r5 * 3),
            });
          }
          if (r3 < 0.05) {
            result.push({
              x, z, ox: 0.5 + r4 * 0.3, oz: 0.5 + r5 * 0.3,
              type: 'rock', scale: 0.5 + r1 * 0.8, rotY: r2 * Math.PI, variant: Math.floor(r1 * 6),
            });
          }
          if (r4 < 0.04) {
            result.push({
              x, z, ox: 0.3 + r5 * 0.4, oz: 0.2 + r1 * 0.5,
              type: 'flower', scale: 1, rotY: 0, variant: Math.floor(r2 * 6),
            });
          }
          if (r5 < 0.1) {
            result.push({
              x, z, ox: 0.4 + r1 * 0.3, oz: 0.3 + r2 * 0.4,
              type: 'grass_tuft', scale: 0.8 + r3 * 0.4, rotY: r4 * Math.PI, variant: Math.floor(r5 * 3),
            });
          }
        } else if (tile.type === 'sand') {
          if (r1 < 0.1) {
            result.push({
              x, z, ox: 0.3 + r2 * 0.4, oz: 0.3 + r3 * 0.4,
              type: 'rock', scale: 0.4 + r4 * 0.6, rotY: r5 * Math.PI, variant: Math.floor(r2 * 6),
            });
          }
          if (r2 < 0.08) {
            result.push({
              x, z, ox: 0.5 + r3 * 0.3, oz: 0.5 + r4 * 0.3,
              type: 'cattail', scale: 0.8 + r5 * 0.4, rotY: r1 * Math.PI, variant: Math.floor(r3 * 2),
            });
          }
        } else if (tile.type === 'park') {
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
              variant: Math.floor(ri * 5),
            });
          }
          if (r3 < 0.6) {
            result.push({
              x, z, ox: 0.4 + r4 * 0.3, oz: 0.3 + r5 * 0.4,
              type: 'flower', scale: 1, rotY: 0, variant: Math.floor(r2 * 6),
            });
          }
        }
      }
    }
    return result;
  }, [grid, gridSize]);

  if (items.length === 0) return null;

  return (
    <group>
      {items.map((item, i) => (
        <group key={i} position={[item.x + item.ox, 0, item.z + item.oz]}>
          <NatureGLB type={item.type} variant={item.variant} scale={item.scale} rotY={item.rotY} />
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
    if (demand < 0.5 || population < 100) return [];

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

    if (availableSpaces > 10) return [];

    const campCount = Math.min(12, Math.floor((demand - 0.4) * 15));
    const result: { x: number; z: number; items: ('tent' | 'bedroll' | 'campfire')[]; rotY: number }[] = [];

    const candidates = roadAdjacentGrass.length > 0
      ? roadAdjacentGrass
      : (() => {
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

  const tentModels = ['/models/nature/tent_detailedOpen.glb', '/models/nature/tent_smallClosed.glb', '/models/nature/tent_detailedClosed.glb'];

  return (
    <group>
      {camps.map((camp, ci) => (
        <group key={ci} position={[camp.x + 0.5, 0, camp.z + 0.5]} rotation={[0, camp.rotY, 0]}>
          {camp.items.map((item, ii) => {
            const offset = ii * 0.12 - (camp.items.length - 1) * 0.06;
            if (item === 'tent') return (
              <group key={ii} position={[offset, 0, 0]}>
                <GLBModel url={tentModels[ci % tentModels.length]} scale={0.18} />
              </group>
            );
            if (item === 'bedroll') return (
              <group key={ii} position={[offset + 0.05, 0, 0.04]}>
                <GLBModel url="/models/nature/bed.glb" scale={0.15} />
              </group>
            );
            if (item === 'campfire') return (
              <group key={ii} position={[0, 0, -0.06]}>
                <GLBModel url="/models/nature/campfire_stones.glb" scale={0.15} />
              </group>
            );
            return null;
          })}
        </group>
      ))}
    </group>
  );
}

// Preload common nature models
[
  PINE_TREES[0], PINE_TREES[1],
  DECIDUOUS_TREES[0], DECIDUOUS_TREES[1],
  BUSH_MODELS[0],
  ROCK_MODELS[0],
  FLOWER_MODELS[0],
  GRASS_MODELS[0],
].forEach(url => useGLTF.preload(url));

import { useRef, useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GameState, TileType, TILE_COLORS, DRAGGABLE_TYPES, ZONE_TYPES, WATER_ADJACENT_TYPES,
  SmogParticle, OverlayType, isRCIType, TILE_SIZE,
} from '@/types/game';
import { BuildingModel, TERRAIN_SET } from './BuildingModels';
import { getFootprint } from '@/hooks/useGameState';
import { getRoadVariant, RoadVariant, TrafficLight } from '@/lib/trafficLights';
import { VehicleModelComponent } from './VehicleModels';
import { NatureLayer, HomelessCamps } from './NatureModels';

const AZIMUTH_ANGLES = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
const DAY_LENGTH = 240;

interface Props {
  gameState: GameState;
  cameraAngle: number;
  cameraZoom: number;
  onTileClick: (x: number, y: number) => void;
  onTileDrag: (tiles: { x: number; y: number }[]) => void;
}

// --- Camera Rig ---
function CameraRig({ angle, zoom, panOffset, gridSize }: {
  angle: number; zoom: number; panOffset: { x: number; z: number }; gridSize: number;
}) {
  const { camera } = useThree();
  const currentAzimuth = useRef(AZIMUTH_ANGLES[0]);
  const currentZoom = useRef(zoom);

  useFrame(() => {
    const targetAz = AZIMUTH_ANGLES[angle];
    let diff = targetAz - currentAzimuth.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentAzimuth.current += diff * 0.07;

    currentZoom.current += (zoom - currentZoom.current) * 0.1;

    const cx = gridSize / 2 + panOffset.x;
    const cz = gridSize / 2 + panOffset.z;
    const dist = 120;
    const polarAngle = Math.PI * 0.22;

    camera.position.set(
      cx + dist * Math.cos(polarAngle) * Math.sin(currentAzimuth.current),
      dist * Math.sin(polarAngle) + 15,
      cz + dist * Math.cos(polarAngle) * Math.cos(currentAzimuth.current),
    );

    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = currentZoom.current;
    camera.lookAt(cx, 0, cz);
    camera.updateProjectionMatrix();
  });
  return null;
}

// --- Terrain Mesh ---
function Terrain({ grid, gridSize }: { grid: GameState['grid']; gridSize: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const tile = grid[z][x];
        const baseIdx = (z * gridSize + x) * 4;
        const h = tile.type === 'water' ? -0.12 : 0;

        positions.push(x, h, z, x + 1, h, z, x + 1, h, z + 1, x, h, z + 1);

        const color = new THREE.Color(TILE_COLORS[tile.type][0]);
        for (let i = 0; i < 4; i++) colors.push(color.r, color.g, color.b);

        indices.push(baseIdx, baseIdx + 2, baseIdx + 1, baseIdx, baseIdx + 3, baseIdx + 2);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [grid, gridSize]);

  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

// --- Water surface animation ---
function WaterSurface({ grid, gridSize }: { grid: GameState['grid']; gridSize: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    let idx = 0;

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[z][x].type !== 'water') continue;
        const baseIdx = idx * 4;
        positions.push(x, -0.08, z, x + 1, -0.08, z, x + 1, -0.08, z + 1, x, -0.08, z + 1);
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
        idx++;
      }
    }
    if (idx === 0) return null;

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [grid, gridSize]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(clock.getElapsedTime() * 1.5) * 0.08;
    }
  });

  if (!geometry) return null;
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color="#4fc3f7" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}

// --- Overlay Layer ---
function OverlayLayer({ gameState }: { gameState: GameState }) {
  const { overlay, grid, gridSize, coverage, pollutionMap } = gameState;
  const isActive = overlay !== 'none' && overlay !== 'wind';

  const geometry = useMemo(() => {
    if (!isActive) return null;
    let dataMap: number[][] | null = null;
    switch (overlay) {
      case 'fire': dataMap = coverage.fire; break;
      case 'police': dataMap = coverage.police; break;
      case 'health': dataMap = coverage.health; break;
      case 'waterSupply': dataMap = coverage.waterSupply; break;
      case 'sewage': dataMap = coverage.sewage; break;
      case 'education': dataMap = coverage.education; break;
      case 'transport': dataMap = coverage.transport; break;
      case 'pollution': dataMap = pollutionMap; break;
      default: dataMap = null;
    }
    if (!dataMap) return null;

    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let idx = 0;

    const overlayColors: Record<string, THREE.Color> = {
      fire: new THREE.Color('#ff4444'),
      police: new THREE.Color('#4488ff'),
      health: new THREE.Color('#ff8844'),
      waterSupply: new THREE.Color('#44aaff'),
      sewage: new THREE.Color('#aa44ff'),
      education: new THREE.Color('#88cc44'),
      transport: new THREE.Color('#ccaa44'),
      pollution: new THREE.Color('#887755'),
    };
    const baseColor = overlayColors[overlay] || new THREE.Color('#ffffff');

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const val = dataMap[z]?.[x] || 0;
        if (val < 0.05) continue;
        const baseIdx = idx * 4;
        const h = 0.04;
        positions.push(x, h, z, x + 1, h, z, x + 1, h, z + 1, x, h, z + 1);

        const intensity = Math.min(1, val);
        for (let i = 0; i < 4; i++) {
          colors.push(baseColor.r * intensity, baseColor.g * intensity, baseColor.b * intensity);
        }

        indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
        idx++;
      }
    }
    if (idx === 0) return null;

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    return geo;
  }, [overlay, coverage, pollutionMap, gridSize]);

  if (!geometry) return null;
  return <mesh geometry={geometry}><meshBasicMaterial vertexColors transparent opacity={0.4} depthWrite={false} /></mesh>;
}

// --- Smog Particles ---
function SmogCloud({ particles }: { particles: SmogParticle[] }) {
  const geometry = useMemo(() => {
    if (particles.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    particles.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = 1.2 + p.size * 0.4;
      positions[i * 3 + 2] = p.y;
      sizes[i] = p.size * 4;
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [particles]);

  if (!geometry || particles.length === 0) return null;
  return (
    <points geometry={geometry}>
      <pointsMaterial size={2.5} sizeAttenuation transparent opacity={0.2} color="#8B7355" depthWrite={false} />
    </points>
  );
}

// --- Traffic Lights ---
function TrafficLightsLayer({ lights }: { lights: TrafficLight[] }) {
  if (lights.length === 0) return null;
  return (
    <group>
      {lights.map((light, i) => {
        // Phase 0 = green for greenAxis, 1 = yellow, 2 = red for greenAxis, 3 = yellow
        const nsColor = light.phase === 0 && light.greenAxis === 'ns' ? '#22c55e'
          : light.phase === 2 && light.greenAxis === 'ns' ? '#ef4444'
          : light.phase === 0 && light.greenAxis === 'ew' ? '#ef4444'
          : light.phase === 2 && light.greenAxis === 'ew' ? '#22c55e'
          : '#f59e0b'; // yellow

        const ewColor = light.phase === 0 && light.greenAxis === 'ew' ? '#22c55e'
          : light.phase === 2 && light.greenAxis === 'ew' ? '#ef4444'
          : light.phase === 0 && light.greenAxis === 'ns' ? '#ef4444'
          : light.phase === 2 && light.greenAxis === 'ns' ? '#22c55e'
          : '#f59e0b';

        return (
          <group key={i} position={[light.x + 0.5, 0, light.y + 0.5]}>
            {/* Pole */}
            <mesh position={[0.35, 0.2, 0.35]}>
              <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
              <meshLambertMaterial color="#424242" />
            </mesh>
            {/* NS light */}
            <mesh position={[0.35, 0.42, 0.35]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshBasicMaterial color={nsColor} />
            </mesh>
            {/* EW light on opposite corner */}
            <mesh position={[-0.35, 0.2, -0.35]}>
              <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
              <meshLambertMaterial color="#424242" />
            </mesh>
            <mesh position={[-0.35, 0.42, -0.35]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshBasicMaterial color={ewColor} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// --- Agents with interpolation and proper vehicle models ---
function AgentsLayer({ agents }: { agents: GameState['agents'] }) {
  if (agents.length === 0) return null;
  return (
    <group>
      {agents.slice(0, 100).map(agent => {
        // Interpolate position between current and target
        const ix = agent.x + (agent.targetX - agent.x) * agent.progress;
        const iy = agent.y + (agent.targetY - agent.y) * agent.progress;

        // Calculate rotation based on direction
        const dx = agent.targetX - agent.path[agent.pathIndex].x;
        const dy = agent.targetY - agent.path[agent.pathIndex].y;
        const rotation = Math.atan2(dx, dy);

        // Offset to the right side of the road based on direction
        const laneOffset = agent.type === 'pedestrian' ? 0.3 : 0.15;
        const ox = dy * laneOffset;
        const oz = -dx * laneOffset;

        return (
          <group key={agent.id} position={[ix + 0.5 + ox, 0, iy + 0.5 + oz]} rotation={[0, rotation, 0]}>
            <VehicleModelComponent vehicleModel={agent.vehicleModel} color={agent.color} type={agent.type} />
          </group>
        );
      })}
    </group>
  );
}

// --- Animated Tractors on Industrial Plots ---
function IndustrialTractors({ grid, gridSize, tick }: { grid: GameState['grid']; gridSize: number; tick: number }) {
  const tractors = useMemo(() => {
    const result: { x: number; z: number; key: string }[] = [];
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const tile = grid[z][x];
        if ((tile.type === 'industrial' || tile.type === 'industrial_md' || tile.type === 'industrial_hi') && tile.anchorX === undefined) {
          if (Math.random() < 0.3) { // Only some plots get tractors
            result.push({ x, z, key: `tractor-${x}-${z}` });
          }
        }
      }
    }
    return result;
  }, [grid, gridSize]);

  if (tractors.length === 0) return null;

  return (
    <group>
      {tractors.map(t => {
        // Animate tractor moving in a small circle on the plot
        const phase = (tick * 0.05 + t.x * 1.7 + t.z * 2.3) % (Math.PI * 2);
        const radius = 0.2;
        const tx = t.x + 0.5 + Math.cos(phase) * radius;
        const tz = t.z + 0.5 + Math.sin(phase) * radius;
        const rotation = phase + Math.PI / 2;
        return (
          <group key={t.key} position={[tx, 0, tz]} rotation={[0, rotation, 0]}>
            <VehicleModelComponent vehicleModel="tractor" color="#388e3c" type="car" />
          </group>
        );
      })}
    </group>
  );
}

// --- Main Scene ---
export default function CityScene({ gameState, cameraAngle, cameraZoom, onTileClick, onTileDrag }: Props) {
  const { camera, gl } = useThree();
  const [panOffset, setPanOffset] = useState({ x: 0, z: 0 });
  const [hoveredTile, setHoveredTile] = useState<{ x: number; z: number } | null>(null);
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const dragTiles = useRef<{ x: number; y: number }[]>([]);
  const lastPan = useRef({ x: 0, y: 0 });
  const currentAzimuthRef = useRef(AZIMUTH_ANGLES[0]);

  const gridSize = gameState.gridSize;

  // Track current azimuth for pan direction
  useFrame(() => {
    const targetAz = AZIMUTH_ANGLES[cameraAngle];
    let diff = targetAz - currentAzimuthRef.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentAzimuthRef.current += diff * 0.07;
  });

  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    if (!target) return null;
    const gx = Math.floor(target.x);
    const gz = Math.floor(target.z);
    if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) return { x: gx, z: gz };
    return null;
  }, [camera, gl, gridSize]);

  useEffect(() => {
    const dom = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (e.button === 2) {
        isPanning.current = true;
        lastPan.current = { x: e.clientX, y: e.clientY };
        return;
      }
      if (e.button !== 0) return;

      const tile = screenToGrid(e.clientX, e.clientY);
      if (!tile) return;

      if (DRAGGABLE_TYPES.includes(gameState.selectedTool)) {
        isDragging.current = true;
        dragTiles.current = [{ x: tile.x, y: tile.z }];
      } else {
        onTileClick(tile.x, tile.z);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - lastPan.current.x;
        const dy = e.clientY - lastPan.current.y;
        lastPan.current = { x: e.clientX, y: e.clientY };

        // Transform screen delta to world XZ based on current camera azimuth
        const az = currentAzimuthRef.current;
        const rightX = Math.cos(az);
        const rightZ = -Math.sin(az);
        const fwdX = Math.sin(az);
        const fwdZ = Math.cos(az);
        const speed = 0.06 / Math.max(6, cameraZoom) * 18;
        setPanOffset(p => ({
          x: p.x + (-dx * rightX + dy * fwdX) * speed,
          z: p.z + (-dx * rightZ + dy * fwdZ) * speed,
        }));
        return;
      }

      const tile = screenToGrid(e.clientX, e.clientY);
      if (tile) setHoveredTile(tile);

      if (isDragging.current && tile) {
        const last = dragTiles.current[dragTiles.current.length - 1];
        if (last && (last.x !== tile.x || last.y !== tile.z)) {
          dragTiles.current.push({ x: tile.x, y: tile.z });
        }
      }
    };

    const onUp = () => {
      if (isDragging.current && dragTiles.current.length > 0) {
        onTileDrag(dragTiles.current);
      }
      isDragging.current = false;
      isPanning.current = false;
      dragTiles.current = [];
    };

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
    };
  }, [gl, screenToGrid, gameState.selectedTool, onTileClick, onTileDrag, cameraZoom]);

  // Day/night lighting
  const daylight = gameState.timeOfDay / DAY_LENGTH;
  const sunAngle = daylight * Math.PI;
  const sunIntensity = Math.max(0.15, Math.sin(sunAngle));
  const ambientIntensity = 0.25 + sunIntensity * 0.35;

  // Collect buildings (only anchor tiles, not secondary tiles)
  const buildings = useMemo(() => {
    const result: { x: number; z: number; type: TileType; level: number; key: string; fw: number; fh: number; roadVariant?: RoadVariant }[] = [];
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const tile = gameState.grid[z][x];
        if (!TERRAIN_SET.has(tile.type) && tile.anchorX === undefined) {
          // For roads, compute connectivity variant
          let rv: RoadVariant | undefined;
          if (tile.type === 'road') {
            rv = getRoadVariant(gameState.grid, x, z, gridSize);
          }

          const size = TILE_SIZE[tile.type] || [1, 1];
          let fw = size[0], fh = size[1];
          if (fw !== fh) {
            let maxDx = 0, maxDy = 0;
            for (let dy = 0; dy < Math.max(fw, fh); dy++) {
              for (let dx = 0; dx < Math.max(fw, fh); dx++) {
                const nx = x + dx, ny = z + dy;
                if (nx < gridSize && ny < gridSize) {
                  const t = gameState.grid[ny][nx];
                  if ((t.anchorX === x && t.anchorY === z) || (dx === 0 && dy === 0)) {
                    maxDx = Math.max(maxDx, dx);
                    maxDy = Math.max(maxDy, dy);
                  }
                }
              }
            }
            fw = maxDx + 1;
            fh = maxDy + 1;
          }
          result.push({ x, z, type: tile.type, level: tile.level, key: `${x}-${z}`, fw, fh, roadVariant: rv });
        }
      }
    }
    return result;
  }, [gameState.grid, gridSize]);

  return (
    <>
      <CameraRig angle={cameraAngle} zoom={cameraZoom} panOffset={panOffset} gridSize={gridSize} />
      <Suspense fallback={null}>

      {/* Lighting */}
      <ambientLight intensity={ambientIntensity} color="#b0c4de" />
      <directionalLight
        position={[
          Math.cos(sunAngle) * 40 + gridSize / 2,
          35,
          Math.sin(sunAngle) * 20 + gridSize / 2,
        ]}
        intensity={sunIntensity * 0.8}
        color="#ffe4b5"
      />
      <hemisphereLight color="#87ceeb" groundColor="#3a5a40" intensity={0.15} />

      {/* Terrain */}
      <Terrain grid={gameState.grid} gridSize={gridSize} />
      <WaterSurface grid={gameState.grid} gridSize={gridSize} />

      {/* Nature decorations */}
      <NatureLayer grid={gameState.grid} gridSize={gridSize} />

      {/* Homeless camps when residential demand overflows */}
      <HomelessCamps
        grid={gameState.grid}
        gridSize={gridSize}
        demand={gameState.resources.demand.residential}
        population={gameState.resources.population}
      />

      {/* Buildings - position at center of footprint */}
      {buildings.map(b => (
        <group key={b.key} position={[b.x + b.fw / 2, 0, b.z + b.fh / 2]}>
          <BuildingModel type={b.type} level={b.level} x={b.x} z={b.z} footprintW={b.fw} footprintH={b.fh} roadVariant={b.roadVariant} />
        </group>
      ))}

      {/* Animated tractors on industrial plots */}
      <IndustrialTractors grid={gameState.grid} gridSize={gridSize} tick={gameState.tick} />

      {/* Hover highlight - show full footprint */}
      {hoveredTile && (() => {
        const tool = gameState.selectedTool;
        if (tool === 'bulldoze') {
          return (
            <mesh position={[hoveredTile.x + 0.5, 0.03, hoveredTile.z + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.96, 0.96]} />
              <meshBasicMaterial color="#ff4444" transparent opacity={0.25} depthWrite={false} />
            </mesh>
          );
        }
        const [fw, fh] = getFootprint(tool as TileType, gameState.rotation);
        // Check if placement is valid
        let valid = true;
        for (let dy = 0; dy < fh && valid; dy++) {
          for (let dx = 0; dx < fw && valid; dx++) {
            const nx = hoveredTile.x + dx, nz = hoveredTile.z + dy;
            if (nx < 0 || nx >= gridSize || nz < 0 || nz >= gridSize) { valid = false; break; }
            const tile = gameState.grid[nz][nx];
            if (tile.type === 'water' || (!['grass', 'sand', 'forest'].includes(tile.type))) valid = false;
          }
        }
        return (
          <mesh position={[hoveredTile.x + fw / 2, 0.03, hoveredTile.z + fh / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[fw * 0.96, fh * 0.96]} />
            <meshBasicMaterial color={valid ? '#44ff44' : '#ff4444'} transparent opacity={0.22} depthWrite={false} />
          </mesh>
        );
      })()}

      {/* Effects */}
      <SmogCloud particles={gameState.smogParticles} />
      <OverlayLayer gameState={gameState} />
      <AgentsLayer agents={gameState.agents} />
      <TrafficLightsLayer lights={gameState.trafficLights} />

      {/* Ground fog for atmosphere - pushed far to avoid hiding terrain */}
      <fog attach="fog" args={['#0a0a14', 200, 400]} />
      </Suspense>
    </>
  );
}

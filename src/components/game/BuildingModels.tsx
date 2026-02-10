import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { TileType } from '@/types/game';
import { RoadVariant, RailVariant } from '@/lib/trafficLights';
import { GLBModel, pickVariant } from './GLBModel';

export const TERRAIN_SET = new Set<TileType>(['grass', 'water', 'sand', 'forest']);

// --- Model path mappings ---

const RESIDENTIAL_LOW = [
  '/models/residential/building-type-a.glb',
  '/models/residential/building-type-b.glb',
  '/models/residential/building-type-c.glb',
  '/models/residential/building-type-d.glb',
  '/models/residential/building-type-e.glb',
  '/models/residential/building-type-f.glb',
];

const RESIDENTIAL_MD = [
  '/models/residential/building-type-g.glb',
  '/models/residential/building-type-h.glb',
  '/models/residential/building-type-i.glb',
  '/models/residential/building-type-j.glb',
  '/models/residential/building-type-k.glb',
  '/models/residential/building-type-l.glb',
];

const RESIDENTIAL_HI = [
  '/models/residential/building-type-m.glb',
  '/models/residential/building-type-n.glb',
  '/models/residential/building-type-o.glb',
  '/models/residential/building-type-p.glb',
  '/models/residential/building-type-q.glb',
  '/models/residential/building-type-r.glb',
];

const COMMERCIAL_LOW = [
  '/models/commercial/building-a.glb',
  '/models/commercial/building-b.glb',
  '/models/commercial/building-c.glb',
  '/models/commercial/building-d.glb',
];

const COMMERCIAL_MD = [
  '/models/commercial/building-e.glb',
  '/models/commercial/building-f.glb',
  '/models/commercial/building-g.glb',
  '/models/commercial/building-h.glb',
];

const COMMERCIAL_HI = [
  '/models/commercial/building-skyscraper-a.glb',
  '/models/commercial/building-skyscraper-b.glb',
  '/models/commercial/building-skyscraper-c.glb',
  '/models/commercial/building-skyscraper-d.glb',
  '/models/commercial/building-skyscraper-e.glb',
];

const INDUSTRIAL_LOW = [
  '/models/industrial/building-a.glb',
  '/models/industrial/building-b.glb',
  '/models/industrial/building-c.glb',
  '/models/industrial/building-d.glb',
];

const INDUSTRIAL_MD = [
  '/models/industrial/building-e.glb',
  '/models/industrial/building-f.glb',
  '/models/industrial/building-g.glb',
  '/models/industrial/building-h.glb',
];

const INDUSTRIAL_HI = [
  '/models/industrial/building-i.glb',
  '/models/industrial/building-j.glb',
  '/models/industrial/building-k.glb',
  '/models/industrial/building-l.glb',
];

// --- Road variant → model + rotation ---

function roadModelAndRotation(variant: RoadVariant): { url: string; rotation: number } {
  // Kenney road models: straight goes along X by default, bend connects +X to -Z
  // Kenney road models orientation corrections
  const R = Math.PI / 2;
  switch (variant) {
    case 'straight_ns': return { url: '/models/roads/road-straight.glb', rotation: R };
    case 'straight_ew': return { url: '/models/roads/road-straight.glb', rotation: 0 };
    case 'corner_ne': return { url: '/models/roads/road-bend.glb', rotation: Math.PI };
    case 'corner_nw': return { url: '/models/roads/road-bend.glb', rotation: -R };
    case 'corner_se': return { url: '/models/roads/road-bend.glb', rotation: R };
    case 'corner_sw': return { url: '/models/roads/road-bend.glb', rotation: 0 };
    case 'cross': return { url: '/models/roads/road-crossroad.glb', rotation: 0 };
    case 't_n': return { url: '/models/roads/road-intersection.glb', rotation: Math.PI };
    case 't_s': return { url: '/models/roads/road-intersection.glb', rotation: 0 };
    case 't_e': return { url: '/models/roads/road-intersection.glb', rotation: R };
    case 't_w': return { url: '/models/roads/road-intersection.glb', rotation: -R };
    case 'dead_n': return { url: '/models/roads/road-end.glb', rotation: R };
    case 'dead_s': return { url: '/models/roads/road-end.glb', rotation: -R };
    case 'dead_e': return { url: '/models/roads/road-end.glb', rotation: 0 };
    case 'dead_w': return { url: '/models/roads/road-end.glb', rotation: Math.PI };
    default: return { url: '/models/roads/road-straight.glb', rotation: 0 };
  }
}

// --- Rail variant → model + rotation ---

function railModelAndRotation(variant: RailVariant): { url: string; rotation: number } {
  const R = Math.PI / 2;
  switch (variant) {
    case 'straight_ns': return { url: '/models/trains/railroad-rail-straight.glb', rotation: R };
    case 'straight_ew': return { url: '/models/trains/railroad-rail-straight.glb', rotation: 0 };
    case 'curve_ne': return { url: '/models/trains/railroad-rail-curve.glb', rotation: Math.PI };
    case 'curve_nw': return { url: '/models/trains/railroad-rail-curve.glb', rotation: -R };
    case 'curve_se': return { url: '/models/trains/railroad-rail-curve.glb', rotation: R };
    case 'curve_sw': return { url: '/models/trains/railroad-rail-curve.glb', rotation: 0 };
    case 'dead_n': return { url: '/models/trains/railroad-rail-straight.glb', rotation: R };
    case 'dead_s': return { url: '/models/trains/railroad-rail-straight.glb', rotation: R };
    case 'dead_e': return { url: '/models/trains/railroad-rail-straight.glb', rotation: 0 };
    case 'dead_w': return { url: '/models/trains/railroad-rail-straight.glb', rotation: 0 };
    case 'single': return { url: '/models/trains/railroad-rail-straight.glb', rotation: 0 };
    default: return { url: '/models/trains/railroad-rail-straight.glb', rotation: 0 };
  }
}

// --- Procedural fallbacks for service buildings (no GLB available) ---

function ServiceBuilding({ color, height, width = 0.55 }: { color: string; height: number; width?: number }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, width]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, height + 0.015, 0]}>
        <boxGeometry args={[width + 0.04, 0.03, width + 0.04]} />
        <meshLambertMaterial color="#90a4ae" />
      </mesh>
    </group>
  );
}

function WindTurbine() {
  const bladeRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (bladeRef.current) bladeRef.current.rotation.z += delta * 3;
  });
  return (
    <group>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 1.4, 8]} />
        <meshLambertMaterial color="#e0e0e0" />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshLambertMaterial color="#bdbdbd" />
      </mesh>
      <group ref={bladeRef} position={[0, 1.4, 0.07]}>
        {[0, 120, 240].map(deg => (
          <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
            <boxGeometry args={[0.03, 0.5, 0.008]} />
            <meshLambertMaterial color="#fafafa" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SolarPanel() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 5, 0, 0]}>
        <boxGeometry args={[0.65, 0.02, 0.45]} />
        <meshLambertMaterial color="#1a237e" />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 5, 0, 0]}>
        <boxGeometry args={[0.6, 0.005, 0.4]} />
        <meshBasicMaterial color="#283593" />
      </mesh>
      <mesh position={[-0.2, 0.06, 0.1]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 4]} />
        <meshLambertMaterial color="#9e9e9e" />
      </mesh>
      <mesh position={[0.2, 0.06, 0.1]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 4]} />
        <meshLambertMaterial color="#9e9e9e" />
      </mesh>
    </group>
  );
}

function CoolingTower() {
  return (
    <group>
      <mesh position={[0.15, 0.45, 0.15]}>
        <cylinderGeometry args={[0.18, 0.28, 0.9, 12]} />
        <meshLambertMaterial color="#cccccc" />
      </mesh>
      <mesh position={[-0.2, 0.2, -0.2]}>
        <boxGeometry args={[0.3, 0.4, 0.3]} />
        <meshLambertMaterial color="#9e9e9e" />
      </mesh>
      <mesh position={[-0.2, 0.5, -0.2]}>
        <cylinderGeometry args={[0.03, 0.05, 0.2, 8]} />
        <meshLambertMaterial color="#757575" />
      </mesh>
    </group>
  );
}

function AirportModel() {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshLambertMaterial color="#78909c" />
      </mesh>
      <mesh position={[0.25, 0.15, 0]}>
        <boxGeometry args={[0.25, 0.3, 0.4]} />
        <meshLambertMaterial color="#b0bec5" />
      </mesh>
      <mesh position={[0.25, 0.35, 0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.15, 8]} />
        <meshLambertMaterial color="#eceff1" />
      </mesh>
      <mesh position={[0.25, 0.45, 0.1]}>
        <boxGeometry args={[0.1, 0.04, 0.1]} />
        <meshBasicMaterial color="#4fc3f7" />
      </mesh>
    </group>
  );
}

function Helipad() {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 16]} />
        <meshLambertMaterial color="#607d8b" />
      </mesh>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.3, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function TrainStation() {
  return (
    <group>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.7, 0.36, 0.4]} />
        <meshLambertMaterial color="#546e7a" />
      </mesh>
      <mesh position={[0, 0.38, 0.15]}>
        <boxGeometry args={[0.75, 0.02, 0.3]} />
        <meshLambertMaterial color="#37474f" />
      </mesh>
      <mesh position={[0, 0.01, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.08]} />
        <meshLambertMaterial color="#8d6e63" />
      </mesh>
    </group>
  );
}

// --- Main Building Model ---

export function BuildingModel({ type, level, x = 0, z = 0, footprintW = 1, footprintH = 1, roadVariant, railVariant }: {
  type: TileType; level: number; x?: number; z?: number;
  footprintW?: number; footprintH?: number; roadVariant?: RoadVariant; railVariant?: RailVariant;
}) {
  const scaleX = footprintW;
  const scaleZ = footprintH;
  const scale = Math.min(scaleX, scaleZ);

  const inner = (() => {
    switch (type) {
      // --- GLB Roads ---
      case 'road': {
        const { url, rotation } = roadModelAndRotation(roadVariant || 'straight_ns');
        return <GLBModel url={url} scale={1} rotationY={rotation} />;
      }

      // --- GLB Rails ---
      case 'rail': {
        const { url, rotation } = railModelAndRotation(railVariant || 'straight_ns');
        return <GLBModel url={url} scale={1} rotationY={rotation} />;
      }

      // --- GLB Buildings ---
      case 'residential': return <GLBModel url={pickVariant(x, z, RESIDENTIAL_LOW)} scale={0.45} />;
      case 'residential_md': return <GLBModel url={pickVariant(x, z, RESIDENTIAL_MD)} scale={0.45} />;
      case 'residential_hi': return <GLBModel url={pickVariant(x, z, RESIDENTIAL_HI)} scale={0.45} />;

      case 'commercial': return <GLBModel url={pickVariant(x, z, COMMERCIAL_LOW)} scale={0.45} />;
      case 'commercial_md': return <GLBModel url={pickVariant(x, z, COMMERCIAL_MD)} scale={0.45} />;
      case 'commercial_hi': return <GLBModel url={pickVariant(x, z, COMMERCIAL_HI)} scale={0.45} />;

      case 'industrial': return <GLBModel url={pickVariant(x, z, INDUSTRIAL_LOW)} scale={0.45} />;
      case 'industrial_md': return <GLBModel url={pickVariant(x, z, INDUSTRIAL_MD)} scale={0.45} />;
      case 'industrial_hi': return <GLBModel url={pickVariant(x, z, INDUSTRIAL_HI)} scale={0.45} />;

      // --- GLB Park with nature trees ---
      case 'park': {
        const treeUrl = pickVariant(x, z, [
          '/models/nature/tree_oak.glb',
          '/models/nature/tree_default.glb',
          '/models/nature/tree_detailed.glb',
        ]);
        return (
          <group>
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.92, 0.92]} />
              <meshLambertMaterial color="#43a047" />
            </mesh>
            <GLBModel url={treeUrl} scale={0.2} position={[0.15, 0, 0.15]} />
            <GLBModel url={'/models/nature/tree_small.glb'} scale={0.18} position={[-0.2, 0, -0.1]} />
            {level > 1 && <GLBModel url={'/models/nature/tree_fat.glb'} scale={0.15} position={[0.1, 0, -0.25]} />}
          </group>
        );
      }

      // --- Procedural fallbacks for unique buildings ---
      case 'power_coal': return <GLBModel url={pickVariant(x, z, ['/models/industrial/building-m.glb', '/models/industrial/building-n.glb'])} scale={0.4} />;
      case 'power_oil': return <GLBModel url={pickVariant(x, z, ['/models/industrial/building-o.glb', '/models/industrial/building-p.glb'])} scale={0.4} />;
      case 'power_wind': return <WindTurbine />;
      case 'power_solar': return <SolarPanel />;
      case 'power_nuclear': return <CoolingTower />;

      case 'water_pump': return <ServiceBuilding color="#0288d1" height={0.35} />;
      case 'sewage': return <ServiceBuilding color="#7b1fa2" height={0.3} />;
      case 'garbage_dump': return <ServiceBuilding color="#795548" height={0.2} width={0.7} />;
      case 'recycling_plant': return <ServiceBuilding color="#2e7d32" height={0.35} />;

      case 'fire_station_small': return <ServiceBuilding color="#f44336" height={0.3} />;
      case 'fire_station_large': return <ServiceBuilding color="#d32f2f" height={0.45} />;
      case 'police_station': return <ServiceBuilding color="#1976d2" height={0.35} />;
      case 'police_hq': return <ServiceBuilding color="#0d47a1" height={0.5} />;
      case 'prison': return <ServiceBuilding color="#757575" height={0.35} width={0.7} />;
      case 'clinic': return <ServiceBuilding color="#ef6c00" height={0.3} />;
      case 'hospital': return <ServiceBuilding color="#e65100" height={0.5} />;

      case 'elementary_school': return <ServiceBuilding color="#7cb342" height={0.3} />;
      case 'high_school': return <ServiceBuilding color="#558b2f" height={0.38} />;
      case 'university': return <ServiceBuilding color="#7b1fa2" height={0.55} />;
      case 'library': return <ServiceBuilding color="#f9a825" height={0.3} />;

      case 'bus_depot': return <ServiceBuilding color="#fdd835" height={0.28} />;
      case 'airport': return <AirportModel />;
      case 'helipad': return <Helipad />;
      case 'train_station': return <TrainStation />;

      default: return null;
    }
  })();

  if (!inner) return null;

  if (scaleX > 1 || scaleZ > 1) {
    return <group scale={[scaleX * 0.9, scale, scaleZ * 0.9]}>{inner}</group>;
  }
  return inner;
}

// Preload most common models
[
  '/models/roads/road-straight.glb',
  '/models/roads/road-bend.glb',
  '/models/roads/road-crossroad.glb',
  '/models/roads/road-intersection.glb',
  '/models/roads/road-end.glb',
  '/models/trains/railroad-rail-straight.glb',
  '/models/trains/railroad-rail-curve.glb',
  ...RESIDENTIAL_LOW.slice(0, 3),
  ...COMMERCIAL_LOW.slice(0, 2),
  ...INDUSTRIAL_LOW.slice(0, 2),
].forEach(url => useGLTF.preload(url));

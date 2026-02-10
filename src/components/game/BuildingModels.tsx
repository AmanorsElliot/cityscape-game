import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TileType } from '@/types/game';

export const TERRAIN_SET = new Set<TileType>(['grass', 'water', 'sand', 'forest']);

// --- Primitive building components ---

function House({ height, width, color, roofColor }: { height: number; width: number; color: string; roofColor: string }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, width]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, height + width * 0.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[width * 0.55, width * 0.4, 4]} />
        <meshLambertMaterial color={roofColor} />
      </mesh>
    </group>
  );
}

function Tower({ height, width, color }: { height: number; width: number; color: string }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, width]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Window band */}
      <mesh position={[0, height / 2, width / 2 + 0.005]}>
        <planeGeometry args={[width * 0.7, height * 0.8]} />
        <meshBasicMaterial color="#fdd835" opacity={0.5} transparent />
      </mesh>
      {/* Flat roof accent */}
      <mesh position={[0, height + 0.02, 0]}>
        <boxGeometry args={[width * 0.3, 0.04, width * 0.3]} />
        <meshLambertMaterial color="#90a4ae" />
      </mesh>
    </group>
  );
}

function Factory({ color, height }: { color: string; height: number }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.6, height, 0.6]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0.18, height + 0.25, 0.18]}>
        <cylinderGeometry args={[0.04, 0.06, 0.5, 8]} />
        <meshLambertMaterial color="#616161" />
      </mesh>
      <mesh position={[-0.15, height + 0.15, -0.15]}>
        <cylinderGeometry args={[0.03, 0.05, 0.3, 8]} />
        <meshLambertMaterial color="#757575" />
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
          <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]} position={[0, 0, 0]}>
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
      {/* Support legs */}
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

function Tree({ x = 0, z = 0 }: { x?: number; z?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.24, 5]} />
        <meshLambertMaterial color="#5d4037" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.12, 0.35, 6]} />
        <meshLambertMaterial color="#2e7d32" />
      </mesh>
    </group>
  );
}

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

function Road() {
  return (
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.92, 0.92]} />
      <meshLambertMaterial color="#455a64" />
    </mesh>
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
      {/* Control tower */}
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
      {/* Platform roof */}
      <mesh position={[0, 0.38, 0.15]}>
        <boxGeometry args={[0.75, 0.02, 0.3]} />
        <meshLambertMaterial color="#37474f" />
      </mesh>
      {/* Tracks */}
      <mesh position={[0, 0.01, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.08]} />
        <meshLambertMaterial color="#8d6e63" />
      </mesh>
    </group>
  );
}

export function BuildingModel({ type, level, footprintW = 1, footprintH = 1 }: { type: TileType; level: number; footprintW?: number; footprintH?: number }) {
  const h = Math.max(0.3, level * 0.25);
  // Scale factor so multi-tile buildings fill their footprint
  const scaleX = footprintW;
  const scaleZ = footprintH;
  const scale = Math.min(scaleX, scaleZ); // uniform scale for the model, positioned in center

  const inner = (() => {
    switch (type) {
      case 'road': return <Road />;
      case 'park':
        return (
          <group>
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.92, 0.92]} />
              <meshLambertMaterial color="#43a047" />
            </mesh>
            <Tree x={0.15} z={0.15} />
            <Tree x={-0.2} z={-0.1} />
            {level > 1 && <Tree x={0.1} z={-0.25} />}
          </group>
        );

      case 'residential': return <House height={h} width={0.45} color="#66bb6a" roofColor="#a5d6a7" />;
      case 'residential_md': return <Tower height={h * 1.8} width={0.5} color="#26a69a" />;
      case 'residential_hi': return <Tower height={h * 3} width={0.55} color="#00897b" />;

      case 'commercial': return <Tower height={h * 1.2} width={0.45} color="#42a5f5" />;
      case 'commercial_md': return <Tower height={h * 2.2} width={0.5} color="#5c6bc0" />;
      case 'commercial_hi': return <Tower height={h * 3.5} width={0.5} color="#7e57c2" />;

      case 'industrial': return <Factory color="#ffb300" height={h * 0.8} />;
      case 'industrial_md': return <Factory color="#fb8c00" height={h * 1.4} />;
      case 'industrial_hi': return <Factory color="#e65100" height={h * 2} />;

      case 'power_coal': return <Factory color="#616161" height={0.55} />;
      case 'power_oil': return <Factory color="#5d4037" height={0.5} />;
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

  // Scale model to fill footprint
  if (scaleX > 1 || scaleZ > 1) {
    return <group scale={[scaleX * 0.9, scale, scaleZ * 0.9]}>{inner}</group>;
  }
  return inner;
}

import { useGLTF } from '@react-three/drei';
import { VehicleModel } from '@/types/game';
import { GLBModel } from './GLBModel';

// --- Vehicle GLB paths ---

const VEHICLE_PATHS: Record<string, string> = {
  sedan: '/models/vehicles/sedan.glb',
  suv: '/models/vehicles/suv.glb',
  truck: '/models/vehicles/truck.glb',
  van: '/models/vehicles/van.glb',
  taxi: '/models/vehicles/taxi.glb',
  bus: '/models/vehicles/delivery.glb', // No bus model, use delivery as substitute
  fire_truck: '/models/vehicles/firetruck.glb',
  police_car: '/models/vehicles/police.glb',
  ambulance: '/models/vehicles/ambulance.glb',
  tractor: '/models/vehicles/tractor.glb',
  race_car: '/models/vehicles/race.glb',
};

// Pedestrian stays procedural (no GLB people model that's small enough)
function PedestrianModel({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.03, 0.045, 0.02]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.075, 0]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshLambertMaterial color="#ffcc80" />
      </mesh>
    </group>
  );
}

export function VehicleModelComponent({ vehicleModel, color, type }: {
  vehicleModel: VehicleModel; color: string; type: 'car' | 'bus' | 'pedestrian';
}) {
  if (type === 'pedestrian') return <PedestrianModel color={color} />;

  const url = VEHICLE_PATHS[vehicleModel] || VEHICLE_PATHS.sedan;
  return <GLBModel url={url} scale={0.08} />;
}

// Preload common vehicles
[
  VEHICLE_PATHS.sedan,
  VEHICLE_PATHS.suv,
  VEHICLE_PATHS.truck,
  VEHICLE_PATHS.taxi,
].forEach(url => useGLTF.preload(url));

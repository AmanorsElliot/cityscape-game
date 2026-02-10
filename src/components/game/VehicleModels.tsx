import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VehicleModel } from '@/types/game';

/** Procedural 3D vehicle models inspired by Kenney car kit */

function Sedan({ color }: { color: string }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.1, 0.04, 0.2]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.065, -0.01]}>
        <boxGeometry args={[0.08, 0.035, 0.1]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Windows */}
      <mesh position={[0.041, 0.065, -0.01]}>
        <planeGeometry args={[0.001, 0.025]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
      <mesh position={[-0.041, 0.065, -0.01]}>
        <planeGeometry args={[0.001, 0.025]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 0.065, 0.04]}>
        <planeGeometry args={[0.07, 0.03]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
      {/* Wheels */}
      {[[-0.05, 0.015, 0.06], [0.05, 0.015, 0.06], [-0.05, 0.015, -0.06], [0.05, 0.015, -0.06]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.015, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function SUV({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.12, 0.05, 0.22]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.08, -0.01]}>
        <boxGeometry args={[0.1, 0.04, 0.14]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.08, 0.06]}>
        <planeGeometry args={[0.08, 0.03]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
      {[[-0.06, 0.015, 0.07], [0.06, 0.015, 0.07], [-0.06, 0.015, -0.07], [0.06, 0.015, -0.07]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.018, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Truck({ color }: { color: string }) {
  return (
    <group>
      {/* Cab */}
      <mesh position={[0, 0.05, 0.06]}>
        <boxGeometry args={[0.1, 0.06, 0.08]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Cargo bed */}
      <mesh position={[0, 0.035, -0.04]}>
        <boxGeometry args={[0.1, 0.04, 0.14]} />
        <meshLambertMaterial color="#78909c" />
      </mesh>
      {/* Cargo walls */}
      <mesh position={[0, 0.06, -0.04]}>
        <boxGeometry args={[0.1, 0.01, 0.14]} />
        <meshLambertMaterial color="#607d8b" />
      </mesh>
      {[[-0.05, 0.015, 0.07], [0.05, 0.015, 0.07], [-0.05, 0.015, -0.08], [0.05, 0.015, -0.08]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.017, 0.017, 0.016, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Van({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.065, 0.22]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.05, 0.1]}>
        <planeGeometry args={[0.08, 0.04]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
      {[[-0.05, 0.015, 0.07], [0.05, 0.015, 0.07], [-0.05, 0.015, -0.07], [0.05, 0.015, -0.07]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.015, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Taxi() {
  return (
    <group>
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.1, 0.04, 0.2]} />
        <meshLambertMaterial color="#fdd835" />
      </mesh>
      <mesh position={[0, 0.065, -0.01]}>
        <boxGeometry args={[0.08, 0.035, 0.1]} />
        <meshLambertMaterial color="#fdd835" />
      </mesh>
      {/* Taxi sign */}
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.03, 0.015, 0.02]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.065, 0.04]}>
        <planeGeometry args={[0.07, 0.03]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
      {[[-0.05, 0.015, 0.06], [0.05, 0.015, 0.06], [-0.05, 0.015, -0.06], [0.05, 0.015, -0.06]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.015, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Bus({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.055, 0]}>
        <boxGeometry args={[0.11, 0.07, 0.32]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Windows */}
      {[-0.08, -0.02, 0.04, 0.1].map((z, i) => (
        <mesh key={`wl${i}`} position={[0.056, 0.06, z]}>
          <planeGeometry args={[0.001, 0.025]} />
          <meshBasicMaterial color="#87ceeb" />
        </mesh>
      ))}
      {[-0.08, -0.02, 0.04, 0.1].map((z, i) => (
        <mesh key={`wr${i}`} position={[-0.056, 0.06, z]}>
          <planeGeometry args={[0.001, 0.025]} />
          <meshBasicMaterial color="#87ceeb" />
        </mesh>
      ))}
      {/* Wheels */}
      {[[-0.055, 0.015, 0.1], [0.055, 0.015, 0.1], [-0.055, 0.015, -0.1], [0.055, 0.015, -0.1]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.018, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function FireTruck() {
  return (
    <group>
      {/* Cab */}
      <mesh position={[0, 0.05, 0.08]}>
        <boxGeometry args={[0.11, 0.06, 0.08]} />
        <meshLambertMaterial color="#cc0000" />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.04, -0.04]}>
        <boxGeometry args={[0.11, 0.05, 0.18]} />
        <meshLambertMaterial color="#cc0000" />
      </mesh>
      {/* Ladder rack */}
      <mesh position={[0, 0.075, -0.04]}>
        <boxGeometry args={[0.04, 0.01, 0.16]} />
        <meshLambertMaterial color="#bdbdbd" />
      </mesh>
      {/* Light bar */}
      <mesh position={[0, 0.085, 0.08]}>
        <boxGeometry args={[0.06, 0.012, 0.02]} />
        <meshBasicMaterial color="#ff1744" />
      </mesh>
      {/* Bumper */}
      <mesh position={[0, 0.025, 0.125]}>
        <boxGeometry args={[0.12, 0.02, 0.01]} />
        <meshLambertMaterial color="#bdbdbd" />
      </mesh>
      {[[-0.055, 0.015, 0.08], [0.055, 0.015, 0.08], [-0.055, 0.015, -0.09], [0.055, 0.015, -0.09]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.018, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function PoliceCar() {
  return (
    <group>
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.1, 0.04, 0.2]} />
        <meshLambertMaterial color="#1a237e" />
      </mesh>
      <mesh position={[0, 0.065, -0.01]}>
        <boxGeometry args={[0.08, 0.035, 0.1]} />
        <meshLambertMaterial color="#e8eaf6" />
      </mesh>
      {/* Light bar */}
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.06, 0.012, 0.025]} />
        <meshBasicMaterial color="#2196f3" />
      </mesh>
      {/* Side stripe */}
      <mesh position={[0.051, 0.035, 0]}>
        <planeGeometry args={[0.001, 0.15]} />
        <meshBasicMaterial color="#e8eaf6" />
      </mesh>
      <mesh position={[-0.051, 0.035, 0]}>
        <planeGeometry args={[0.001, 0.15]} />
        <meshBasicMaterial color="#e8eaf6" />
      </mesh>
      {[[-0.05, 0.015, 0.06], [0.05, 0.015, 0.06], [-0.05, 0.015, -0.06], [0.05, 0.015, -0.06]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.015, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Ambulance() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.065, 0.24]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {/* Red cross */}
      <mesh position={[0.051, 0.055, -0.03]}>
        <planeGeometry args={[0.001, 0.03]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.051, 0.055, -0.03]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.001, 0.03]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      {/* Red stripe */}
      <mesh position={[0, 0.035, 0.051]}>
        <planeGeometry args={[0.08, 0.015]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      {/* Light bar */}
      <mesh position={[0, 0.088, 0.04]}>
        <boxGeometry args={[0.05, 0.012, 0.02]} />
        <meshBasicMaterial color="#ff1744" />
      </mesh>
      {[[-0.05, 0.015, 0.08], [0.05, 0.015, 0.08], [-0.05, 0.015, -0.08], [0.05, 0.015, -0.08]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.017, 0.017, 0.015, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Tractor() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.08, 0.05, 0.12]} />
        <meshLambertMaterial color="#388e3c" />
      </mesh>
      {/* Engine hood */}
      <mesh position={[0, 0.03, 0.07]}>
        <boxGeometry args={[0.07, 0.035, 0.04]} />
        <meshLambertMaterial color="#388e3c" />
      </mesh>
      {/* Exhaust pipe */}
      <mesh position={[0.03, 0.08, 0.05]}>
        <cylinderGeometry args={[0.005, 0.005, 0.04, 6]} />
        <meshLambertMaterial color="#424242" />
      </mesh>
      {/* Cab roof */}
      <mesh position={[0, 0.08, -0.01]}>
        <boxGeometry args={[0.07, 0.01, 0.06]} />
        <meshLambertMaterial color="#388e3c" />
      </mesh>
      {/* Big rear wheels */}
      {[[-0.045, 0.025, -0.03], [0.045, 0.025, -0.03]].map((pos, i) => (
        <mesh key={`r${i}`} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.02, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Small front wheels */}
      {[[-0.04, 0.015, 0.06], [0.04, 0.015, 0.06]].map((pos, i) => (
        <mesh key={`f${i}`} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, 0.015, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function RaceCar({ color }: { color: string }) {
  return (
    <group>
      {/* Low sleek body */}
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[0.09, 0.025, 0.22]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.045, -0.02]}>
        <boxGeometry args={[0.06, 0.02, 0.06]} />
        <meshLambertMaterial color="#1a1a1a" />
      </mesh>
      {/* Front spoiler */}
      <mesh position={[0, 0.015, 0.12]}>
        <boxGeometry args={[0.1, 0.008, 0.02]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Rear spoiler */}
      <mesh position={[0, 0.055, -0.1]}>
        <boxGeometry args={[0.08, 0.003, 0.02]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Spoiler supports */}
      {[[-0.03, 0.04, -0.1], [0.03, 0.04, -0.1]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.004, 0.02, 0.004]} />
          <meshLambertMaterial color="#424242" />
        </mesh>
      ))}
      {/* Racing stripe */}
      <mesh position={[0, 0.039, 0]}>
        <planeGeometry args={[0.02, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {[[-0.045, 0.012, 0.07], [0.045, 0.012, 0.07], [-0.045, 0.012, -0.07], [0.045, 0.012, -0.07]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.013, 0.013, 0.012, 8]} />
          <meshLambertMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function PedestrianModel({ color }: { color: string }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.03, 0.045, 0.02]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.075, 0]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshLambertMaterial color="#ffcc80" />
      </mesh>
    </group>
  );
}

export function VehicleModelComponent({ vehicleModel, color, type }: { vehicleModel: VehicleModel; color: string; type: 'car' | 'bus' | 'pedestrian' }) {
  if (type === 'pedestrian') return <PedestrianModel color={color} />;
  
  switch (vehicleModel) {
    case 'sedan': return <Sedan color={color} />;
    case 'suv': return <SUV color={color} />;
    case 'truck': return <Truck color={color} />;
    case 'van': return <Van color={color} />;
    case 'taxi': return <Taxi />;
    case 'bus': return <Bus color={color} />;
    case 'fire_truck': return <FireTruck />;
    case 'police_car': return <PoliceCar />;
    case 'ambulance': return <Ambulance />;
    case 'tractor': return <Tractor />;
    case 'race_car': return <RaceCar color={color} />;
    default: return <Sedan color={color} />;
  }
}

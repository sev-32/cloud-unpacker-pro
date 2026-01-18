/**
 * 3D Jet Scene using React Three Fiber
 * Renders the jet model with proper orientation based on flight state
 */

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { FlightState } from '@/lib/flightPhysics';

interface JetModelProps {
  flightState: FlightState;
  cameraFollow: boolean;
}

function JetModel({ flightState, cameraFollow }: JetModelProps) {
  const jetRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/jet.glb');
  const { camera } = useThree();
  
  // Clone the scene to avoid issues with reusing
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  useFrame(() => {
    if (!jetRef.current) return;
    
    // Update jet position and rotation from flight state
    jetRef.current.position.set(
      flightState.position[0],
      flightState.position[1],
      flightState.position[2]
    );
    
    // Apply rotation - order matters: yaw, pitch, roll (YXZ order)
    jetRef.current.rotation.order = 'YXZ';
    jetRef.current.rotation.y = flightState.yaw;
    jetRef.current.rotation.x = flightState.pitch;
    jetRef.current.rotation.z = -flightState.roll;
    
    if (cameraFollow && camera) {
      // Third-person camera follow
      const cameraOffset = new THREE.Vector3(0, 8, 25);
      cameraOffset.applyEuler(new THREE.Euler(
        flightState.pitch * 0.3,
        flightState.yaw,
        0,
        'YXZ'
      ));
      
      camera.position.set(
        flightState.position[0] + cameraOffset.x,
        flightState.position[1] + cameraOffset.y,
        flightState.position[2] + cameraOffset.z
      );
      
      camera.lookAt(
        flightState.position[0],
        flightState.position[1],
        flightState.position[2]
      );
    }
  });
  
  return (
    <group ref={jetRef}>
      <primitive 
        object={clonedScene} 
        scale={[2, 2, 2]} 
        rotation={[0, Math.PI, 0]} // Face forward
      />
      {/* Engine glow effect */}
      <pointLight 
        position={[0, 0, 3]} 
        color="#ff6600" 
        intensity={flightState.throttle * 5} 
        distance={10}
      />
    </group>
  );
}

interface JetSceneProps {
  flightState: FlightState;
  visible: boolean;
  cameraFollow?: boolean;
}

export function JetScene({ flightState, visible, cameraFollow = true }: JetSceneProps) {
  if (!visible) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      <Canvas
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault fov={60} near={0.1} far={50000} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[100, 100, 50]} 
          intensity={1.5} 
          castShadow
        />
        <hemisphereLight 
          args={['#87CEEB', '#8B4513', 0.3]} 
        />
        
        <JetModel flightState={flightState} cameraFollow={cameraFollow} />
      </Canvas>
    </div>
  );
}

// Preload the model
useGLTF.preload('/models/jet.glb');

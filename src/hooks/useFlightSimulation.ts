/**
 * Flight Simulation Hook
 * Integrates flight physics, controls, and camera for the cloud renderer
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { 
  FlightState, 
  ControlInputs, 
  AircraftConfig,
  DEFAULT_JET_CONFIG,
  createInitialState,
  updateFlightPhysics 
} from '@/lib/flightPhysics';

export interface FlightSimulationOptions {
  enabled: boolean;
  initialPosition?: [number, number, number];
  initialHeading?: number;
  aircraftConfig?: Partial<AircraftConfig>;
  getTerrainHeight?: (x: number, z: number) => number;
}

export function useFlightSimulation(options: FlightSimulationOptions) {
  const {
    enabled,
    initialPosition = [-400, 700, 400],
    initialHeading = 0,
    aircraftConfig = {},
    getTerrainHeight,
  } = options;
  
  const config: AircraftConfig = { ...DEFAULT_JET_CONFIG, ...aircraftConfig };
  
  const [flightState, setFlightState] = useState<FlightState>(() => 
    createInitialState(initialPosition, initialHeading)
  );
  
  const stateRef = useRef<FlightState>(flightState);
  const controlsRef = useRef<ControlInputs>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: 0.5,
    flaps: 0,
    brake: false,
  });
  
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ dx: 0, dy: 0, locked: false });
  const throttleRef = useRef(0.5);
  const flapsRef = useRef(0);
  
  // Update controls from input
  const updateControlInputs = useCallback(() => {
    const keys = keysRef.current;
    const mouse = mouseRef.current;
    
    // Pitch - W/S or mouse Y (inverted for flight sim feel)
    let pitch = 0;
    if (keys.has('w') || keys.has('arrowup')) pitch += 1; // Pull up
    if (keys.has('s') || keys.has('arrowdown')) pitch -= 1; // Push down
    if (mouse.locked) {
      pitch += mouse.dy * 0.002; // Mouse up = pitch up
    }
    pitch = Math.max(-1, Math.min(1, pitch));
    
    // Roll - A/D or mouse X
    let roll = 0;
    if (keys.has('a') || keys.has('arrowleft')) roll -= 1;
    if (keys.has('d') || keys.has('arrowright')) roll += 1;
    if (mouse.locked) {
      roll += mouse.dx * 0.002;
    }
    roll = Math.max(-1, Math.min(1, roll));
    
    // Yaw - Q/E
    let yaw = 0;
    if (keys.has('q')) yaw -= 1;
    if (keys.has('e')) yaw += 1;
    
    // Brake
    const brake = keys.has('b') || keys.has(' ');
    
    controlsRef.current = {
      pitch,
      roll,
      yaw,
      throttle: throttleRef.current,
      flaps: flapsRef.current,
      brake,
    };
    
    // Reset mouse delta after reading
    mouse.dx = 0;
    mouse.dy = 0;
    
    return controlsRef.current;
  }, []);
  
  // Physics update
  const update = useCallback((dt: number) => {
    if (!enabled) return stateRef.current;
    
    const inputs = updateControlInputs();
    const newState = updateFlightPhysics(
      stateRef.current,
      inputs,
      config,
      dt,
      getTerrainHeight
    );
    
    stateRef.current = newState;
    setFlightState(newState);
    
    return newState;
  }, [enabled, config, getTerrainHeight, updateControlInputs]);
  
  // Get camera data for shader
  const getCameraData = useCallback(() => {
    const state = stateRef.current;
    
    // Calculate forward direction from orientation
    const cp = Math.cos(state.pitch);
    const sp = Math.sin(state.pitch);
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const cr = Math.cos(state.roll);
    const sr = Math.sin(state.roll);
    
    // Forward vector (nose direction)
    const forward: [number, number, number] = [
      cy * cp,
      sp,
      -sy * cp,
    ];
    
    // Up vector with roll applied
    const up: [number, number, number] = [
      cy * sp * sr - sy * cr,
      cp * sr,
      -sy * sp * sr - cy * cr,
    ];
    
    // Correct up vector to be perpendicular to forward
    const dot = forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2];
    const correctedUp: [number, number, number] = [
      up[0] - dot * forward[0],
      up[1] - dot * forward[1],
      up[2] - dot * forward[2],
    ];
    
    // Normalize
    const upLen = Math.sqrt(
      correctedUp[0] ** 2 + correctedUp[1] ** 2 + correctedUp[2] ** 2
    );
    if (upLen > 0.0001) {
      correctedUp[0] /= upLen;
      correctedUp[1] /= upLen;
      correctedUp[2] /= upLen;
    }
    
    return {
      position: state.position,
      forward,
      up: correctedUp,
    };
  }, []);
  
  // Reset flight state
  const reset = useCallback(() => {
    const newState = createInitialState(initialPosition, initialHeading);
    stateRef.current = newState;
    setFlightState(newState);
    throttleRef.current = 0.5;
    flapsRef.current = 0;
  }, [initialPosition, initialHeading]);
  
  // Input event handlers
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      
      // Throttle controls
      if (key === 'shift' || key === '=') {
        throttleRef.current = Math.min(1, throttleRef.current + 0.02);
      }
      if (key === 'control' || key === '-') {
        throttleRef.current = Math.max(0, throttleRef.current - 0.02);
      }
      
      // Quick throttle presets
      if (key === '1') throttleRef.current = 0;
      if (key === '2') throttleRef.current = 0.25;
      if (key === '3') throttleRef.current = 0.5;
      if (key === '4') throttleRef.current = 0.75;
      if (key === '5') throttleRef.current = 1;
      
      // Flaps toggle
      if (key === 'f') {
        flapsRef.current = flapsRef.current >= 1 ? 0 : flapsRef.current + 0.5;
      }
      
      // Reset with R
      if (key === 'r') {
        reset();
      }
      
      // Prevent scrolling with arrow keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        mouseRef.current.dx += e.movementX;
        mouseRef.current.dy += e.movementY;
        mouseRef.current.locked = true;
      } else {
        mouseRef.current.locked = false;
      }
    };
    
    const handlePointerLockChange = () => {
      mouseRef.current.locked = !!document.pointerLockElement;
      if (!document.pointerLockElement) {
        mouseRef.current.dx = 0;
        mouseRef.current.dy = 0;
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      if (document.pointerLockElement) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        throttleRef.current = Math.max(0, Math.min(1, throttleRef.current + delta));
      }
    };
    
    const handleBlur = () => {
      keysRef.current.clear();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, reset]);
  
  return {
    flightState,
    update,
    reset,
    getCameraData,
    controls: controlsRef.current,
    setThrottle: (t: number) => { throttleRef.current = t; },
    setFlaps: (f: number) => { flapsRef.current = f; },
  };
}

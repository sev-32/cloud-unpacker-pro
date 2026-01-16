/**
 * Flight Controls Hook
 * Handles keyboard/mouse input for flight simulation
 */

import { useRef, useEffect, useCallback, useState } from 'react';

export interface FlightControlState {
  pitch: number;     // -1 to 1
  roll: number;      // -1 to 1
  yaw: number;       // -1 to 1
  throttle: number;  // 0 to 1
  flaps: number;     // 0 to 1
  brake: boolean;
}

export interface FlightControlsOptions {
  pitchSensitivity?: number;
  rollSensitivity?: number;
  yawSensitivity?: number;
  throttleStep?: number;
  mouseEnabled?: boolean;
}

const DEFAULT_OPTIONS: FlightControlsOptions = {
  pitchSensitivity: 1.0,
  rollSensitivity: 1.0,
  yawSensitivity: 0.5,
  throttleStep: 0.02,
  mouseEnabled: true,
};

export function useFlightControls(options: FlightControlsOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [isActive, setIsActive] = useState(false);
  const [throttle, setThrottle] = useState(0.5);
  const [flaps, setFlaps] = useState(0);
  
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, locked: false });
  const controlsRef = useRef<FlightControlState>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: 0.5,
    flaps: 0,
    brake: false,
  });
  
  // Lock/unlock pointer
  const lockPointer = useCallback((element: HTMLElement) => {
    element.requestPointerLock();
  }, []);
  
  const unlockPointer = useCallback(() => {
    document.exitPointerLock();
  }, []);
  
  // Update controls based on inputs
  const updateControls = useCallback(() => {
    const keys = keysRef.current;
    const mouse = mouseRef.current;
    
    // Pitch - W/S or Arrow Up/Down or mouse Y
    let pitch = 0;
    if (keys.has('w') || keys.has('arrowup')) pitch -= 1;
    if (keys.has('s') || keys.has('arrowdown')) pitch += 1;
    if (mouse.locked) {
      pitch -= mouse.y * opts.pitchSensitivity! * 0.003;
    }
    pitch = Math.max(-1, Math.min(1, pitch));
    
    // Roll - A/D or Arrow Left/Right
    let roll = 0;
    if (keys.has('a') || keys.has('arrowleft')) roll -= 1;
    if (keys.has('d') || keys.has('arrowright')) roll += 1;
    if (mouse.locked) {
      roll += mouse.x * opts.rollSensitivity! * 0.003;
    }
    roll = Math.max(-1, Math.min(1, roll));
    
    // Yaw - Q/E
    let yaw = 0;
    if (keys.has('q')) yaw -= 1;
    if (keys.has('e')) yaw += 1;
    yaw *= opts.yawSensitivity!;
    
    // Brake
    const brake = keys.has('b') || keys.has(' ');
    
    controlsRef.current = {
      pitch,
      roll,
      yaw,
      throttle,
      flaps,
      brake,
    };
    
    // Reset mouse delta after reading
    mouse.x = 0;
    mouse.y = 0;
    
    return controlsRef.current;
  }, [throttle, flaps, opts]);
  
  // Get current controls
  const getControls = useCallback((): FlightControlState => {
    return updateControls();
  }, [updateControls]);
  
  // Setup event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      
      // Throttle controls
      if (key === 'shift' || key === '=') {
        setThrottle(t => Math.min(1, t + (options.throttleStep ?? 0.02)));
      }
      if (key === 'control' || key === '-') {
        setThrottle(t => Math.max(0, t - (options.throttleStep ?? 0.02)));
      }
      
      // Flaps
      if (key === 'f') {
        setFlaps(f => (f >= 1 ? 0 : f + 0.5));
      }
      
      // Full throttle / cut throttle
      if (key === '1') setThrottle(0);
      if (key === '2') setThrottle(0.25);
      if (key === '3') setThrottle(0.5);
      if (key === '4') setThrottle(0.75);
      if (key === '5') setThrottle(1);
      
      // Prevent defaults for flight controls
      if (['w', 'a', 's', 'd', 'q', 'e', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        mouseRef.current.x += e.movementX;
        mouseRef.current.y += e.movementY;
        mouseRef.current.locked = true;
      } else {
        mouseRef.current.locked = false;
      }
    };
    
    const handlePointerLockChange = () => {
      mouseRef.current.locked = !!document.pointerLockElement;
      setIsActive(!!document.pointerLockElement);
    };
    
    const handleWheel = (e: WheelEvent) => {
      if (document.pointerLockElement) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setThrottle(t => Math.max(0, Math.min(1, t + delta)));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [options.throttleStep]);
  
  return {
    getControls,
    lockPointer,
    unlockPointer,
    isActive,
    throttle,
    setThrottle,
    flaps,
    setFlaps,
    controls: controlsRef.current,
  };
}

/**
 * Flight Simulation HUD (Heads-Up Display)
 * Shows airspeed, altitude, heading, and other flight data
 */

import { FlightState } from '@/lib/flightPhysics';

interface FlightHUDProps {
  state: FlightState;
  visible?: boolean;
}

export function FlightHUD({ state, visible = true }: FlightHUDProps) {
  if (!visible) return null;
  
  const airspeedKnots = (state.airspeed * 1.94384).toFixed(0);
  const altitudeFeet = (state.altitude * 3.28084).toFixed(0);
  const verticalSpeedFpm = (state.verticalSpeed * 196.85).toFixed(0);
  const headingDeg = ((state.heading * 180 / Math.PI) % 360).toFixed(0);
  const aoaDeg = (state.angleOfAttack * 180 / Math.PI).toFixed(1);
  const throttlePercent = (state.throttle * 100).toFixed(0);
  const gForce = state.gForce.toFixed(1);
  const mach = state.machNumber.toFixed(2);
  
  const pitchDeg = (state.pitch * 180 / Math.PI).toFixed(1);
  const rollDeg = (state.roll * 180 / Math.PI).toFixed(1);
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Artificial Horizon Center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-48 h-48">
          {/* Pitch ladder background */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ 
              transform: `rotate(${-state.roll * 180 / Math.PI}deg)`,
            }}
          >
            {/* Horizon line */}
            <div className="absolute w-32 h-0.5 bg-lime-400" style={{ 
              transform: `translateY(${state.pitch * 100}px)` 
            }} />
            
            {/* Pitch marks */}
            {[-20, -10, 10, 20].map(deg => (
              <div 
                key={deg} 
                className="absolute w-16 h-0.5 bg-lime-400/50"
                style={{ 
                  transform: `translateY(${(state.pitch - deg * Math.PI / 180) * 100}px)` 
                }}
              />
            ))}
          </div>
          
          {/* Aircraft symbol (fixed) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-6 h-0.5 bg-white" />
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5 h-3 bg-white" />
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 w-2 h-0.5 bg-white" />
          </div>
          
          {/* Roll indicator */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <div 
              className="text-xs text-lime-400"
              style={{ transform: `rotate(${-state.roll * 180 / Math.PI}deg)` }}
            >
              ▼
            </div>
          </div>
        </div>
      </div>
      
      {/* Left panel - Airspeed */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm rounded p-3 border border-lime-500/30">
        <div className="text-xs text-lime-400 opacity-70">AIRSPEED</div>
        <div className="text-2xl font-mono text-lime-400">{airspeedKnots}</div>
        <div className="text-xs text-lime-400/60">KTS</div>
        <div className="mt-2 text-xs text-lime-400 opacity-70">MACH</div>
        <div className="text-lg font-mono text-lime-400">{mach}</div>
      </div>
      
      {/* Right panel - Altitude */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm rounded p-3 border border-lime-500/30">
        <div className="text-xs text-lime-400 opacity-70">ALTITUDE</div>
        <div className="text-2xl font-mono text-lime-400">{altitudeFeet}</div>
        <div className="text-xs text-lime-400/60">FT</div>
        <div className="mt-2 text-xs text-lime-400 opacity-70">V/S</div>
        <div className="text-lg font-mono text-lime-400">
          {parseInt(verticalSpeedFpm) >= 0 ? '+' : ''}{verticalSpeedFpm}
        </div>
        <div className="text-xs text-lime-400/60">FPM</div>
      </div>
      
      {/* Top panel - Heading */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm rounded-lg px-6 py-2 border border-lime-500/30">
        <div className="flex items-center gap-4">
          <div className="text-xs text-lime-400 opacity-70">HDG</div>
          <div className="text-xl font-mono text-lime-400">{headingDeg.padStart(3, '0')}°</div>
        </div>
      </div>
      
      {/* Bottom panel - Engine & Warnings */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 border border-lime-500/30">
        <div className="flex items-center gap-6">
          {/* Throttle */}
          <div className="flex flex-col items-center">
            <div className="text-xs text-lime-400 opacity-70">THR</div>
            <div className="w-2 h-16 bg-gray-700 rounded relative">
              <div 
                className="absolute bottom-0 w-full bg-lime-500 rounded transition-all"
                style={{ height: `${state.throttle * 100}%` }}
              />
            </div>
            <div className="text-xs font-mono text-lime-400">{throttlePercent}%</div>
          </div>
          
          {/* AOA */}
          <div className="flex flex-col items-center">
            <div className="text-xs text-lime-400 opacity-70">AOA</div>
            <div className={`text-lg font-mono ${state.stalling ? 'text-red-500 animate-pulse' : 'text-lime-400'}`}>
              {aoaDeg}°
            </div>
          </div>
          
          {/* G-Force */}
          <div className="flex flex-col items-center">
            <div className="text-xs text-lime-400 opacity-70">G</div>
            <div className={`text-lg font-mono ${Math.abs(state.gForce) > 6 ? 'text-red-500' : 'text-lime-400'}`}>
              {gForce}
            </div>
          </div>
          
          {/* Stall Warning */}
          {state.stalling && (
            <div className="flex flex-col items-center animate-pulse">
              <div className="text-sm font-bold text-red-500">STALL</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom left - Controls hint */}
      <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm rounded p-2 text-xs text-white/60">
        <div>WASD/Arrows: Pitch/Roll</div>
        <div>Q/E: Yaw</div>
        <div>Shift/Ctrl: Throttle</div>
        <div>F: Flaps | B: Brake</div>
      </div>
      
      {/* Debug info */}
      <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded p-2 text-xs font-mono text-lime-400/60">
        <div>Pitch: {pitchDeg}°</div>
        <div>Roll: {rollDeg}°</div>
        <div>Fuel: {state.fuel.toFixed(0)}kg</div>
        <div>Ground: {state.onGround ? 'YES' : 'NO'}</div>
      </div>
    </div>
  );
}

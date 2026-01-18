import { useRef, useState } from 'react';
import { useCloudRenderer } from '@/hooks/useCloudRenderer';
import { ControlPanel } from './ControlPanel';
import { FlightHUD } from './FlightHUD';
import { createInitialState, FlightState } from '@/lib/flightPhysics';

export function CloudRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isReady, fps, settings, updateSettings } = useCloudRenderer(canvasRef);
  const [showHUD, setShowHUD] = useState(true);
  
  // Placeholder flight state for HUD display in jet mode
  const [flightState] = useState<FlightState>(() => createInitialState([-400, 700, 400], 0));

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        tabIndex={0}
      />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/70 text-lg font-light">Loading shaders...</div>
        </div>
      )}
      
      {/* Flight HUD for jet mode */}
      {isReady && settings.cameraMode === 'jet' && showHUD && (
        <FlightHUD state={flightState} visible={showHUD} />
      )}
      
      {isReady && (
        <ControlPanel 
          settings={settings} 
          onUpdate={updateSettings} 
          fps={fps}
          onToggleHUD={() => setShowHUD(!showHUD)}
          showHUD={showHUD}
        />
      )}
      
      {/* Mode indicator for jet mode */}
      {isReady && settings.cameraMode === 'jet' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
            <div className="text-white/70 text-xs">Click to fly • WASD: Pitch/Roll • Q/E: Yaw • Shift/Ctrl: Throttle</div>
          </div>
        </div>
      )}
    </div>
  );
}

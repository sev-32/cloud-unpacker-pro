import { useRef, useState, useCallback } from 'react';
import { useCloudRenderer } from '@/hooks/useCloudRenderer';
import { ControlPanel } from './ControlPanel';
import { FlightHUD } from './FlightHUD';
import { WeatherMapEditor } from './WeatherMapEditor';
import { FlightState } from '@/lib/flightPhysics';
import { WeatherTextureManager } from '@/lib/weatherTextureManager';
import { Map } from 'lucide-react';
import { Button } from './ui/button';

export function CloudRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isReady, fps, settings, updateSettings, flightData, cameraPos, atmosphereData, setWeatherManager } = useCloudRenderer(canvasRef);
  const [showHUD, setShowHUD] = useState(true);
  const [showWeatherMap, setShowWeatherMap] = useState(false);
  const [isWeatherMapMaximized, setIsWeatherMapMaximized] = useState(false);

  const handleWeatherManagerReady = useCallback((manager: WeatherTextureManager) => {
    setWeatherManager(manager);
    updateSettings({ weatherMapEnabled: true });
  }, [setWeatherManager, updateSettings]);

  const handleCloseWeatherMap = useCallback(() => {
    setShowWeatherMap(false);
    setIsWeatherMapMaximized(false);
    updateSettings({ weatherMapEnabled: false });
  }, [updateSettings]);
  
  // Create a flight state object from the renderer's flight data for the HUD
  const flightState: FlightState = {
    position: cameraPos as [number, number, number] || [-400, 700, 400],
    velocity: [flightData?.airspeed || 0, 0, 0],
    pitch: flightData?.pitch || 0,
    roll: flightData?.roll || 0,
    yaw: flightData?.heading || 0,
    pitchRate: 0,
    rollRate: 0,
    yawRate: 0,
    throttle: flightData?.throttle || 0.5,
    currentThrust: 0,
    angleOfAttack: 0,
    sideslipAngle: 0,
    elevatorInput: 0,
    aileronInput: 0,
    rudderInput: 0,
    stalling: false,
    onGround: false,
    gForce: flightData?.gForce || 1.0,
    airspeed: flightData?.airspeed || 0,
    altitude: flightData?.altitude || 700,
    verticalSpeed: 0,
    heading: flightData?.heading || 0,
    machNumber: (flightData?.airspeed || 0) / 340,
    fuel: 2000,
  };

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
      
      {/* Flight HUD for fly/jet modes */}
      {isReady && (settings.cameraMode === 'jet' || settings.cameraMode === 'fly') && showHUD && (
        <FlightHUD state={flightState} visible={showHUD} />
      )}
      
      {isReady && (
        <ControlPanel
          settings={settings}
          onUpdate={updateSettings}
          fps={fps}
          onToggleHUD={() => setShowHUD(!showHUD)}
          showHUD={showHUD}
          atmosphereData={atmosphereData}
        />
      )}
      
      {/* Mode indicator */}
      {isReady && (settings.cameraMode === 'fly' || settings.cameraMode === 'jet') && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
            <div className="text-white/70 text-xs">
              {settings.cameraMode === 'jet'
                ? 'Click to fly • WASD: Pitch/Roll • Q/E: Yaw • Shift: Boost'
                : 'Click to fly • WASD: Move • Mouse: Look'}
            </div>
          </div>
        </div>
      )}

      {/* Weather Map Button */}
      {isReady && !showWeatherMap && (
        <Button
          onClick={() => setShowWeatherMap(true)}
          className="absolute bottom-4 left-4 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600"
          size="sm"
        >
          <Map className="h-4 w-4 mr-2" />
          Weather Map
        </Button>
      )}

      {/* Weather Map Editor */}
      {showWeatherMap && (
        <WeatherMapEditor
          onClose={handleCloseWeatherMap}
          onWeatherManagerReady={handleWeatherManagerReady}
          cameraPosition={cameraPos ? { x: cameraPos[0], z: cameraPos[2] } : undefined}
          worldExtent={settings.weatherMapExtent}
          isMaximized={isWeatherMapMaximized}
          onToggleMaximize={() => setIsWeatherMapMaximized(!isWeatherMapMaximized)}
        />
      )}
    </div>
  );
}

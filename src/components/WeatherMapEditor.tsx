import { useState, useCallback, useRef, useEffect } from 'react';
import { WeatherMapCanvas } from './WeatherMapCanvas';
import { WeatherMapToolbar } from './WeatherMapToolbar';
import { WeatherMapLegend } from './WeatherMapLegend';
import { useWeatherMapInteraction } from '../hooks/useWeatherMapInteraction';
import { createWeatherTextureManager, WeatherTextureManager } from '../lib/weatherTextureManager';
import { WeatherFront, PressureSystem, HeatmapMode, DEFAULT_WEATHER_MAP_SETTINGS } from '../lib/weatherTypes';
import { applyWeatherMapPreset } from '../lib/weatherMapPresets';
import { Button } from './ui/button';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface WeatherMapEditorProps {
  onClose: () => void;
  onWeatherManagerReady: (manager: WeatherTextureManager) => void;
  cameraPosition?: { x: number; z: number };
  worldExtent?: number;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export function WeatherMapEditor({
  onClose,
  onWeatherManagerReady,
  cameraPosition,
  worldExtent = DEFAULT_WEATHER_MAP_SETTINGS.worldExtent,
  isMaximized = false,
  onToggleMaximize,
}: WeatherMapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [weatherManager, setWeatherManager] = useState<WeatherTextureManager | null>(null);

  const [activeTool, setActiveTool] = useState('brush');
  const [brushSize, setBrushSize] = useState(1000);
  const [brushStrength, setBrushStrength] = useState(0.7);
  const [brushFalloff, setBrushFalloff] = useState(1.5);
  const [selectedCloudType, setSelectedCloudType] = useState(1);
  const [selectedFrontType, setSelectedFrontType] = useState<WeatherFront['type']>('cold');
  const [frontStrength, setFrontStrength] = useState(0.8);
  const [frontWidth, setFrontWidth] = useState(3000);
  const [selectedPressureType, setSelectedPressureType] = useState<PressureSystem['type']>('low');
  const [pressureRadius, setPressureRadius] = useState(15000);
  const [pressureIntensity, setPressureIntensity] = useState(0.7);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('coverage');
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const [showGrid, setShowGrid] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showWindVectors, setShowWindVectors] = useState(true);
  const [showFronts, setShowFronts] = useState(true);

  useEffect(() => {
    const manager = createWeatherTextureManager(256, worldExtent);
    setWeatherManager(manager);
    onWeatherManagerReady(manager);

    return () => {
    };
  }, [worldExtent, onWeatherManagerReady]);

  const handleFrontComplete = useCallback((front: WeatherFront) => {
    if (weatherManager) {
      weatherManager.applyFront(front);
    }
  }, [weatherManager]);

  const handlePressureSystemAdd = useCallback((system: PressureSystem) => {
    if (weatherManager) {
      weatherManager.applyPressureSystem(system);
    }
  }, [weatherManager]);

  const handleWindDraw = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (!weatherManager) return;

    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 100) {
      const dirX = dx / len;
      const dirY = dy / len;
      const speed = Math.min(40, len / 500);

      weatherManager.setWind(startX, startY, dirX, dirY, speed, brushSize);
    }
  }, [weatherManager, brushSize]);

  const interaction = useWeatherMapInteraction({
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
    weatherManager,
    activeTool,
    brushSettings: {
      size: brushSize,
      strength: brushStrength,
      falloff: brushFalloff,
      mode: 'set',
    },
    selectedCloudType,
    selectedFrontType,
    selectedPressureType,
    frontStrength,
    frontWidth,
    pressureRadius,
    pressureIntensity,
    worldExtent,
    onFrontComplete: handleFrontComplete,
    onPressureSystemAdd: handlePressureSystemAdd,
    onWindDraw: handleWindDraw,
  });

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const handleClear = useCallback(() => {
    if (weatherManager) {
      weatherManager.clear();
    }
  }, [weatherManager]);

  const handleApplyPreset = useCallback((presetId: string) => {
    if (weatherManager) {
      applyWeatherMapPreset(weatherManager, presetId, worldExtent);
    }
  }, [weatherManager, worldExtent]);

  const handleCompleteFront = useCallback(() => {
    if (interaction.currentFrontPoints.length >= 2) {
      const newFront: WeatherFront = {
        id: `front-${Date.now()}`,
        type: selectedFrontType,
        points: [...interaction.currentFrontPoints],
        strength: frontStrength,
        width: frontWidth,
        movementVector: { x: 0, y: 0 },
      };
      handleFrontComplete(newFront);
    }
  }, [interaction.currentFrontPoints, selectedFrontType, frontStrength, frontWidth, handleFrontComplete]);

  return (
    <div className={`
      ${isMaximized ? 'fixed inset-0 z-50' : 'absolute bottom-4 right-4 w-[800px] h-[600px] rounded-lg overflow-hidden'}
      bg-slate-900 border border-slate-700 shadow-2xl flex flex-col
    `}>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">Weather Map Editor</h2>
        <div className="flex items-center gap-2">
          {onToggleMaximize && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleMaximize}>
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex relative">
        <WeatherMapToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushStrength={brushStrength}
          setBrushStrength={setBrushStrength}
          brushFalloff={brushFalloff}
          setBrushFalloff={setBrushFalloff}
          selectedCloudType={selectedCloudType}
          setSelectedCloudType={setSelectedCloudType}
          selectedFrontType={selectedFrontType}
          setSelectedFrontType={setSelectedFrontType}
          frontStrength={frontStrength}
          setFrontStrength={setFrontStrength}
          frontWidth={frontWidth}
          setFrontWidth={setFrontWidth}
          selectedPressureType={selectedPressureType}
          setSelectedPressureType={setSelectedPressureType}
          pressureRadius={pressureRadius}
          setPressureRadius={setPressureRadius}
          pressureIntensity={pressureIntensity}
          setPressureIntensity={setPressureIntensity}
          heatmapMode={heatmapMode}
          setHeatmapMode={setHeatmapMode}
          heatmapOpacity={heatmapOpacity}
          setHeatmapOpacity={setHeatmapOpacity}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          showCoordinates={showCoordinates}
          setShowCoordinates={setShowCoordinates}
          showWindVectors={showWindVectors}
          setShowWindVectors={setShowWindVectors}
          showFronts={showFronts}
          setShowFronts={setShowFronts}
          onClear={handleClear}
          onResetView={interaction.resetView}
          onCompleteFront={handleCompleteFront}
          currentFrontPoints={interaction.currentFrontPoints.length}
          onApplyPreset={handleApplyPreset}
        />

        <div
          className="flex-1 ml-64 relative"
          onMouseDown={interaction.handleMouseDown}
          onMouseMove={interaction.handleMouseMove}
          onMouseUp={interaction.handleMouseUp}
          onMouseLeave={interaction.handleMouseUp}
          onWheel={interaction.handleWheel}
        >
          <WeatherMapCanvas
            weatherManager={weatherManager}
            viewTransform={interaction.viewTransform}
            worldExtent={worldExtent}
            heatmapMode={heatmapMode}
            heatmapOpacity={heatmapOpacity}
            showGrid={showGrid}
            showCoordinates={showCoordinates}
            showWindVectors={showWindVectors}
            showFronts={showFronts}
            currentFrontPoints={interaction.currentFrontPoints}
            selectedFrontType={selectedFrontType}
            hoveredPosition={interaction.hoveredPosition}
            brushSize={brushSize}
            activeTool={activeTool}
            cameraPosition={cameraPosition}
            onCanvasReady={handleCanvasReady}
          />

          <WeatherMapLegend heatmapMode={heatmapMode} />
        </div>
      </div>
    </div>
  );
}

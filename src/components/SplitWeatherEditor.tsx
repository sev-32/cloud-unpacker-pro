import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeatherMapCanvas } from './WeatherMapCanvas';
import { CloudLayerToolbar } from './CloudLayerToolbar';
import { WeatherMapLegend } from './WeatherMapLegend';
import { CloudPreview3D } from './CloudPreview3D';
import { useWeatherMapInteraction } from '@/hooks/useWeatherMapInteraction';
import { createWeatherTextureManager, WeatherTextureManager } from '@/lib/weatherTextureManager';
import { WeatherFront, PressureSystem, HeatmapMode, DEFAULT_WEATHER_MAP_SETTINGS } from '@/lib/weatherTypes';
import { applyWeatherMapPreset } from '@/lib/weatherMapPresets';
import { CloudLayerId, BrushType, CLOUD_LAYERS, CLOUD_BRUSHES } from '@/lib/cloudLayerTypes';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Home, Save, Eye, EyeOff, Maximize2, Minimize2, RefreshCw, Layers } from 'lucide-react';

export default function SplitWeatherEditor() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [weatherManager, setWeatherManager] = useState<WeatherTextureManager | null>(null);
  const worldExtent = DEFAULT_WEATHER_MAP_SETTINGS.worldExtent;

  // Layer state
  const [activeLayer, setActiveLayer] = useState<CloudLayerId>('low');
  const [layerVisibility, setLayerVisibility] = useState<Record<CloudLayerId, boolean>>({
    low: true,
    mid: true,
    high: true,
    cb: true,
  });

  // Brush state
  const [activeBrush, setActiveBrush] = useState<BrushType>('coverage');
  const [brushSize, setBrushSize] = useState(2000);
  const [brushStrength, setBrushStrength] = useState(0.8);
  const [brushFalloff, setBrushFalloff] = useState(1.5);

  // Display state
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('coverage');
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const [showGrid, setShowGrid] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showWindVectors, setShowWindVectors] = useState(true);
  const [showFronts, setShowFronts] = useState(true);
  const [show3DPreview, setShow3DPreview] = useState(true);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);

  // Cloud type for current layer
  const [selectedCloudType, setSelectedCloudType] = useState(1);

  // Front/Pressure system state
  const [selectedFrontType, setSelectedFrontType] = useState<WeatherFront['type']>('cold');
  const [frontStrength, setFrontStrength] = useState(0.8);
  const [frontWidth, setFrontWidth] = useState(3000);
  const [selectedPressureType, setSelectedPressureType] = useState<PressureSystem['type']>('low');
  const [pressureRadius, setPressureRadius] = useState(15000);
  const [pressureIntensity, setPressureIntensity] = useState(0.7);

  // Camera position for preview sync
  const [cameraPosition, setCameraPosition] = useState({ x: 0, z: 0 });

  useEffect(() => {
    const manager = createWeatherTextureManager(256, worldExtent);
    setWeatherManager(manager);
  }, [worldExtent]);

  // Map active brush to tool type for interaction hook
  const getToolType = useCallback(() => {
    switch (activeBrush) {
      case 'coverage':
      case 'density':
      case 'texture':
        return 'brush';
      case 'eraser':
        return 'eraser';
      case 'altitude':
        return 'altitude';
      case 'moisture':
        return 'moisture';
      case 'wind':
        return 'wind';
      default:
        return 'brush';
    }
  }, [activeBrush]);

  // Get cloud type based on active layer
  const getLayerCloudType = useCallback(() => {
    const layer = CLOUD_LAYERS[activeLayer];
    return selectedCloudType || layer.defaultCloudTypes[0];
  }, [activeLayer, selectedCloudType]);

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
    activeTool: getToolType(),
    brushSettings: {
      size: brushSize,
      strength: brushStrength,
      falloff: brushFalloff,
      mode: 'set',
    },
    selectedCloudType: getLayerCloudType(),
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
    onBrushStroke: () => {
      // Real-time sync with 3D preview
    },
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

  const toggleLayerVisibility = useCallback((layerId: CloudLayerId) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  }, []);

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
          onClick={() => navigate('/')}
        >
          <Home className="w-4 h-4 mr-2" />
          Home
        </Button>

        <div className="h-6 w-px bg-slate-700" />

        <h1 className="text-sm font-semibold text-white">Cloud Layer Editor</h1>

        <div className="flex-1" />

        <Button
          variant={show3DPreview ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setShow3DPreview(!show3DPreview)}
        >
          {show3DPreview ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
          3D Preview
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300"
          onClick={() => navigate('/viewer')}
        >
          <Eye className="w-4 h-4 mr-2" />
          Full View
        </Button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Layer & Brush controls */}
        <CloudLayerToolbar
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          layerVisibility={layerVisibility}
          toggleLayerVisibility={toggleLayerVisibility}
          activeBrush={activeBrush}
          setActiveBrush={setActiveBrush}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushStrength={brushStrength}
          setBrushStrength={setBrushStrength}
          brushFalloff={brushFalloff}
          setBrushFalloff={setBrushFalloff}
          selectedCloudType={selectedCloudType}
          setSelectedCloudType={setSelectedCloudType}
          heatmapMode={heatmapMode}
          setHeatmapMode={setHeatmapMode}
          heatmapOpacity={heatmapOpacity}
          setHeatmapOpacity={setHeatmapOpacity}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          showWindVectors={showWindVectors}
          setShowWindVectors={setShowWindVectors}
          onClear={handleClear}
          onApplyPreset={handleApplyPreset}
          onResetView={interaction.resetView}
        />

        {/* Center - 2D Map Canvas */}
        <div className={`flex-1 relative ${show3DPreview && !isPreviewMaximized ? 'w-1/2' : 'w-full'}`}>
          <div
            className="absolute inset-0"
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
              activeTool={getToolType()}
              cameraPosition={cameraPosition}
              onCanvasReady={handleCanvasReady}
            />

            <WeatherMapLegend heatmapMode={heatmapMode} />

            {/* Layer indicator */}
            <div className="absolute top-4 left-4 bg-slate-800/90 rounded-lg px-3 py-2 border border-slate-700">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">Active Layer:</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{ backgroundColor: CLOUD_LAYERS[activeLayer].color + '30', color: CLOUD_LAYERS[activeLayer].color }}
                >
                  {CLOUD_LAYERS[activeLayer].name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - 3D Preview */}
        {show3DPreview && (
          <div className={`
            ${isPreviewMaximized ? 'fixed inset-0 z-50' : 'w-1/2'}
            bg-black border-l border-slate-700 relative
          `}>
            <CloudPreview3D
              weatherManager={weatherManager}
              worldExtent={worldExtent}
              onCameraMove={setCameraPosition}
            />

            {/* Preview controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-slate-800/80 border-slate-600"
                onClick={() => setIsPreviewMaximized(!isPreviewMaximized)}
              >
                {isPreviewMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>

            {isPreviewMaximized && (
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 left-4 bg-slate-800/80 border-slate-600"
                onClick={() => setIsPreviewMaximized(false)}
              >
                Back to Editor
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

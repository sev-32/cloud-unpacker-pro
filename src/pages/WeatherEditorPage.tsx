import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WeatherMapCanvas } from '@/components/WeatherMapCanvas';
import { WeatherMapToolbar } from '@/components/WeatherMapToolbar';
import { WeatherMapLegend } from '@/components/WeatherMapLegend';
import { WeatherMapBrowser } from '@/components/WeatherMapBrowser';
import { useWeatherMapInteraction } from '@/hooks/useWeatherMapInteraction';
import { createWeatherTextureManager, WeatherTextureManager } from '@/lib/weatherTextureManager';
import { WeatherFront, PressureSystem, HeatmapMode, DEFAULT_WEATHER_MAP_SETTINGS } from '@/lib/weatherTypes';
import { applyWeatherMapPreset } from '@/lib/weatherMapPresets';
import { useWeather } from '@/contexts/WeatherContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Save,
  FolderOpen,
  Eye,
  MoreVertical,
  Download,
  Upload,
  FileJson,
  Loader2,
  Check,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { exportWeatherMapToJSON, importWeatherMapFromJSON } from '@/lib/weatherDataSerializer';
import { toast } from 'sonner';

export default function WeatherEditorPage() {
  const { mapId } = useParams<{ mapId?: string }>();
  const navigate = useNavigate();
  const {
    currentMapId,
    currentMapMetadata,
    loadMap,
    saveMap,
    updateCurrentMap,
    createNewMap,
    isDirty,
    isSaving,
    lastSaved,
    markDirty,
  } = useWeather();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [weatherManager, setWeatherManager] = useState<WeatherTextureManager | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveCategory, setSaveCategory] = useState('user');
  const [isLoading, setIsLoading] = useState(false);

  const worldExtent = DEFAULT_WEATHER_MAP_SETTINGS.worldExtent;

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
    async function initialize() {
      if (mapId) {
        setIsLoading(true);
        const success = await loadMap(mapId);
        setIsLoading(false);
        if (!success) {
          toast.error('Failed to load weather map');
          navigate('/editor');
        }
      } else if (!currentMapId) {
        createNewMap(256, worldExtent);
      }
    }
    initialize();
  }, [mapId, currentMapId, loadMap, createNewMap, navigate, worldExtent]);

  useEffect(() => {
    if (!weatherManager) {
      const manager = createWeatherTextureManager(256, worldExtent);
      setWeatherManager(manager);
    }
  }, [weatherManager, worldExtent]);

  const handleFrontComplete = useCallback((front: WeatherFront) => {
    if (weatherManager) {
      weatherManager.applyFront(front);
      markDirty();
    }
  }, [weatherManager, markDirty]);

  const handlePressureSystemAdd = useCallback((system: PressureSystem) => {
    if (weatherManager) {
      weatherManager.applyPressureSystem(system);
      markDirty();
    }
  }, [weatherManager, markDirty]);

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
      markDirty();
    }
  }, [weatherManager, brushSize, markDirty]);

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
    onBrushStroke: markDirty,
  });

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const handleClear = useCallback(() => {
    if (weatherManager) {
      weatherManager.clear();
      markDirty();
    }
  }, [weatherManager, markDirty]);

  const handleApplyPreset = useCallback((presetId: string) => {
    if (weatherManager) {
      applyWeatherMapPreset(weatherManager, presetId, worldExtent);
      markDirty();
    }
  }, [weatherManager, worldExtent, markDirty]);

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

  const handleSave = useCallback(async () => {
    if (currentMapId) {
      const success = await updateCurrentMap();
      if (success) {
        toast.success('Weather map saved');
      } else {
        toast.error('Failed to save weather map');
      }
    } else {
      setSaveName('');
      setSaveDescription('');
      setShowSaveDialog(true);
    }
  }, [currentMapId, updateCurrentMap]);

  const handleSaveNew = useCallback(async () => {
    if (!saveName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    if (!weatherManager) return;

    const newMapId = await saveMap(saveName, saveDescription, saveCategory);
    if (newMapId) {
      toast.success('Weather map saved');
      setShowSaveDialog(false);
      navigate(`/editor/${newMapId}`, { replace: true });
    } else {
      toast.error('Failed to save weather map');
    }
  }, [saveName, saveDescription, saveCategory, weatherManager, saveMap, navigate]);

  const handleExport = useCallback(() => {
    if (!weatherManager) return;

    const json = exportWeatherMapToJSON(
      currentMapMetadata?.name || 'Untitled',
      currentMapMetadata?.description || '',
      256,
      worldExtent,
      currentMapMetadata?.category || 'user',
      currentMapMetadata?.region || '',
      weatherManager.data
    );

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentMapMetadata?.name || 'weather-map'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Weather map exported');
  }, [weatherManager, currentMapMetadata, worldExtent]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const imported = importWeatherMapFromJSON(json);

        if (weatherManager) {
          const data = imported.data;
          weatherManager.data.coverage.set(data.coverage);
          weatherManager.data.cloudType.set(data.cloudType);
          weatherManager.data.moisture.set(data.moisture);
          weatherManager.data.verticalDevelopment.set(data.verticalDevelopment);
          weatherManager.data.baseAltitude.set(data.baseAltitude);
          weatherManager.data.topAltitude.set(data.topAltitude);
          weatherManager.data.windX.set(data.windX);
          weatherManager.data.windY.set(data.windY);
          weatherManager.data.windSpeed.set(data.windSpeed);
          weatherManager.data.turbulence.set(data.turbulence);
          weatherManager.data.fronts = data.fronts;
          weatherManager.data.pressureSystems = data.pressureSystems;
          weatherManager.data.moistureRegions = data.moistureRegions;

          markDirty();
          toast.success(`Imported "${imported.name}"`);
        }
      } catch (err) {
        toast.error('Failed to import weather map');
        console.error(err);
      }
    };
    reader.readAsText(file);

    e.target.value = '';
  }, [weatherManager, markDirty]);

  const handleLoadFromBrowser = useCallback(async (id: string) => {
    setIsLoading(true);
    const success = await loadMap(id);
    setIsLoading(false);

    if (success) {
      toast.success('Weather map loaded');
      setShowBrowser(false);
      navigate(`/editor/${id}`, { replace: true });
    } else {
      toast.error('Failed to load weather map');
    }
  }, [loadMap, navigate]);

  const handleViewInSimulation = useCallback(() => {
    if (currentMapId) {
      navigate(`/viewer?map=${currentMapId}`);
    } else {
      navigate('/viewer');
    }
  }, [currentMapId, navigate]);

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Saved just now';
    if (mins < 60) return `Saved ${mins}m ago`;
    return `Saved at ${lastSaved.toLocaleTimeString()}`;
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelected}
      />

      <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>

        <div className="h-6 w-px bg-slate-700" />

        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white truncate max-w-[300px]">
            {currentMapMetadata?.name || 'Untitled Weather Map'}
          </h1>
          {isDirty && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              Unsaved changes
            </span>
          )}
          {!isDirty && lastSaved && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {formatLastSaved()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:text-white"
            onClick={() => setShowBrowser(true)}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Open
          </Button>

          <Button
            size="sm"
            className="bg-sky-600 hover:bg-sky-500 text-white"
            onClick={handleViewInSimulation}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem
                className="text-slate-300 focus:text-white focus:bg-slate-700"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-300 focus:text-white focus:bg-slate-700"
                onClick={handleImport}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                className="text-slate-300 focus:text-white focus:bg-slate-700"
                onClick={() => {
                  setSaveName('');
                  setSaveDescription('');
                  setShowSaveDialog(true);
                }}
              >
                <FileJson className="w-4 h-4 mr-2" />
                Save As...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400"
            onClick={() => setShowBrowser(!showBrowser)}
          >
            {showBrowser ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
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
          className={`flex-1 ml-64 relative transition-all ${showBrowser ? 'mr-80' : ''}`}
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
            onCanvasReady={handleCanvasReady}
          />

          <WeatherMapLegend heatmapMode={heatmapMode} />
        </div>

        {showBrowser && (
          <div className="w-80 border-l border-slate-700 bg-slate-800/50">
            <WeatherMapBrowser
              onLoad={handleLoadFromBrowser}
              onClose={() => setShowBrowser(false)}
              currentMapId={currentMapId}
            />
          </div>
        )}
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Save Weather Map</DialogTitle>
            <DialogDescription className="text-slate-400">
              Give your weather map a name and optional description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Name</label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My Weather Map"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Description (optional)</label>
              <Input
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="A brief description..."
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Category</label>
              <select
                value={saveCategory}
                onChange={(e) => setSaveCategory(e.target.value)}
                className="w-full h-10 rounded-md bg-slate-900 border border-slate-600 text-white px-3"
              >
                <option value="user">User Created</option>
                <option value="tropical">Tropical</option>
                <option value="frontal">Frontal Systems</option>
                <option value="regional">Regional</option>
                <option value="severe">Severe Weather</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNew}
              disabled={isSaving || !saveName.trim()}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

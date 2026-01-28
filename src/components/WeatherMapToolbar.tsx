import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import {
  Paintbrush,
  Eraser,
  Wind,
  RotateCcw,
  Waves,
  Circle,
  ArrowRight,
  Droplets,
  Mountain,
  Sparkles
} from 'lucide-react';
import { WeatherFront, PressureSystem, HeatmapMode, CLOUD_TYPE_NAMES, FRONT_COLORS } from '../lib/weatherTypes';
import { WEATHER_MAP_PRESETS } from '../lib/weatherMapPresets';

interface WeatherMapToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushStrength: number;
  setBrushStrength: (strength: number) => void;
  brushFalloff: number;
  setBrushFalloff: (falloff: number) => void;
  selectedCloudType: number;
  setSelectedCloudType: (type: number) => void;
  selectedFrontType: WeatherFront['type'];
  setSelectedFrontType: (type: WeatherFront['type']) => void;
  frontStrength: number;
  setFrontStrength: (strength: number) => void;
  frontWidth: number;
  setFrontWidth: (width: number) => void;
  selectedPressureType: PressureSystem['type'];
  setSelectedPressureType: (type: PressureSystem['type']) => void;
  pressureRadius: number;
  setPressureRadius: (radius: number) => void;
  pressureIntensity: number;
  setPressureIntensity: (intensity: number) => void;
  heatmapMode: HeatmapMode;
  setHeatmapMode: (mode: HeatmapMode) => void;
  heatmapOpacity: number;
  setHeatmapOpacity: (opacity: number) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showCoordinates: boolean;
  setShowCoordinates: (show: boolean) => void;
  showWindVectors: boolean;
  setShowWindVectors: (show: boolean) => void;
  showFronts: boolean;
  setShowFronts: (show: boolean) => void;
  onClear: () => void;
  onResetView: () => void;
  onCompleteFront: () => void;
  currentFrontPoints: number;
  onApplyPreset: (presetId: string) => void;
}

const tools = [
  { id: 'brush', label: 'Cloud Brush', icon: Paintbrush },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'moisture', label: 'Moisture', icon: Droplets },
  { id: 'altitude', label: 'Altitude', icon: Mountain },
  { id: 'front', label: 'Weather Front', icon: Waves },
  { id: 'pressure', label: 'Pressure System', icon: Circle },
  { id: 'wind', label: 'Wind Vector', icon: Wind },
];

const heatmapModes: { value: HeatmapMode; label: string }[] = [
  { value: 'coverage', label: 'Cloud Coverage' },
  { value: 'baseAltitude', label: 'Cloud Base' },
  { value: 'topAltitude', label: 'Cloud Top' },
  { value: 'thickness', label: 'Cloud Thickness' },
  { value: 'moisture', label: 'Moisture' },
  { value: 'wind', label: 'Wind Speed' },
];

export function WeatherMapToolbar({
  activeTool,
  setActiveTool,
  brushSize,
  setBrushSize,
  brushStrength,
  setBrushStrength,
  brushFalloff,
  setBrushFalloff,
  selectedCloudType,
  setSelectedCloudType,
  selectedFrontType,
  setSelectedFrontType,
  frontStrength,
  setFrontStrength,
  frontWidth,
  setFrontWidth,
  selectedPressureType,
  setSelectedPressureType,
  pressureRadius,
  setPressureRadius,
  pressureIntensity,
  setPressureIntensity,
  heatmapMode,
  setHeatmapMode,
  heatmapOpacity,
  setHeatmapOpacity,
  showGrid,
  setShowGrid,
  showCoordinates,
  setShowCoordinates,
  showWindVectors,
  setShowWindVectors,
  showFronts,
  setShowFronts,
  onClear,
  onResetView,
  onCompleteFront,
  currentFrontPoints,
  onApplyPreset,
}: WeatherMapToolbarProps) {
  return (
    <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900/95 border-r border-slate-700 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Tools</h3>
          <div className="grid grid-cols-4 gap-1">
            {tools.map(tool => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? 'default' : 'ghost'}
                size="icon"
                className="h-10 w-10"
                onClick={() => setActiveTool(tool.id)}
                title={tool.label}
              >
                <tool.icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'moisture' || activeTool === 'altitude') && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Brush Settings</h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Size</Label>
                <span className="text-xs text-slate-400">{brushSize}m</span>
              </div>
              <Slider
                value={[brushSize]}
                onValueChange={([v]) => setBrushSize(v)}
                min={100}
                max={5000}
                step={100}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Strength</Label>
                <span className="text-xs text-slate-400">{(brushStrength * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[brushStrength]}
                onValueChange={([v]) => setBrushStrength(v)}
                min={0.1}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Falloff</Label>
                <span className="text-xs text-slate-400">{brushFalloff.toFixed(1)}</span>
              </div>
              <Slider
                value={[brushFalloff]}
                onValueChange={([v]) => setBrushFalloff(v)}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {activeTool === 'brush' && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Cloud Type</Label>
                <Select value={String(selectedCloudType)} onValueChange={v => setSelectedCloudType(Number(v))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLOUD_TYPE_NAMES).map(([value, name]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {activeTool === 'front' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Front Settings</h3>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Front Type</Label>
              <div className="grid grid-cols-2 gap-1">
                {(['cold', 'warm', 'occluded', 'stationary'] as const).map(type => (
                  <Button
                    key={type}
                    variant={selectedFrontType === type ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs capitalize"
                    style={{
                      borderColor: selectedFrontType === type ? FRONT_COLORS[type] : undefined,
                      backgroundColor: selectedFrontType === type ? FRONT_COLORS[type] : undefined,
                    }}
                    onClick={() => setSelectedFrontType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Strength</Label>
                <span className="text-xs text-slate-400">{(frontStrength * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[frontStrength]}
                onValueChange={([v]) => setFrontStrength(v)}
                min={0.2}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Width</Label>
                <span className="text-xs text-slate-400">{(frontWidth / 1000).toFixed(1)}km</span>
              </div>
              <Slider
                value={[frontWidth]}
                onValueChange={([v]) => setFrontWidth(v)}
                min={1000}
                max={10000}
                step={500}
                className="w-full"
              />
            </div>

            <p className="text-xs text-slate-400 italic">
              Click to add points. Points: {currentFrontPoints}
            </p>

            {currentFrontPoints >= 2 && (
              <Button onClick={onCompleteFront} size="sm" className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Complete Front
              </Button>
            )}
          </div>
        )}

        {activeTool === 'pressure' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Pressure System</h3>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">System Type</Label>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant={selectedPressureType === 'high' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelectedPressureType('high')}
                >
                  <span className="text-blue-400 font-bold mr-1">H</span> High
                </Button>
                <Button
                  variant={selectedPressureType === 'low' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelectedPressureType('low')}
                >
                  <span className="text-red-400 font-bold mr-1">L</span> Low
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Radius</Label>
                <span className="text-xs text-slate-400">{(pressureRadius / 1000).toFixed(1)}km</span>
              </div>
              <Slider
                value={[pressureRadius]}
                onValueChange={([v]) => setPressureRadius(v)}
                min={5000}
                max={30000}
                step={1000}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Intensity</Label>
                <span className="text-xs text-slate-400">{(pressureIntensity * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[pressureIntensity]}
                onValueChange={([v]) => setPressureIntensity(v)}
                min={0.2}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <p className="text-xs text-slate-400 italic">
              Click on map to place system
            </p>
          </div>
        )}

        {activeTool === 'wind' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Wind Vector</h3>
            <p className="text-xs text-slate-400 italic">
              Click and drag to set wind direction and speed
            </p>
          </div>
        )}

        <Separator className="bg-slate-700" />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Visualization</h3>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Heatmap Layer</Label>
            <Select value={heatmapMode} onValueChange={v => setHeatmapMode(v as HeatmapMode)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {heatmapModes.map(mode => (
                  <SelectItem key={mode.value} value={mode.value} className="text-xs">
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-slate-400">Heatmap Opacity</Label>
              <span className="text-xs text-slate-400">{(heatmapOpacity * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[heatmapOpacity]}
              onValueChange={([v]) => setHeatmapOpacity(v)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-400">Show Grid</Label>
              <Switch checked={showGrid} onCheckedChange={setShowGrid} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-400">Show Coordinates</Label>
              <Switch checked={showCoordinates} onCheckedChange={setShowCoordinates} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-400">Show Wind Vectors</Label>
              <Switch checked={showWindVectors} onCheckedChange={setShowWindVectors} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-400">Show Fronts</Label>
              <Switch checked={showFronts} onCheckedChange={setShowFronts} />
            </div>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        <Separator className="bg-slate-700" />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">
            <Sparkles className="h-4 w-4 inline mr-2" />
            Weather Presets
          </h3>
          <div className="space-y-1">
            {WEATHER_MAP_PRESETS.map(preset => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                className="w-full justify-start h-auto py-2 text-left"
                onClick={() => onApplyPreset(preset.id)}
              >
                <div>
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-xs text-slate-400 font-normal">{preset.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Separator className="bg-slate-700" />

        <div className="space-y-2">
          <Button onClick={onResetView} variant="outline" size="sm" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
          <Button onClick={onClear} variant="destructive" size="sm" className="w-full">
            Clear All Weather
          </Button>
        </div>
      </div>
    </div>
  );
}

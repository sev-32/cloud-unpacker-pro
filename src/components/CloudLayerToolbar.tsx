import { CloudLayerId, BrushType, CLOUD_LAYERS, CLOUD_BRUSHES } from '@/lib/cloudLayerTypes';
import { CLOUD_TYPE_NAMES, HeatmapMode } from '@/lib/weatherTypes';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  Cloud,
  Droplets,
  Waves,
  Mountain,
  Droplet,
  Wind,
  Navigation,
  Eraser,
  Eye,
  EyeOff,
  Layers,
  RefreshCw,
  Sparkles,
  Grid3X3,
} from 'lucide-react';

interface CloudLayerToolbarProps {
  activeLayer: CloudLayerId;
  setActiveLayer: (layer: CloudLayerId) => void;
  layerVisibility: Record<CloudLayerId, boolean>;
  toggleLayerVisibility: (layer: CloudLayerId) => void;
  activeBrush: BrushType;
  setActiveBrush: (brush: BrushType) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushStrength: number;
  setBrushStrength: (strength: number) => void;
  brushFalloff: number;
  setBrushFalloff: (falloff: number) => void;
  selectedCloudType: number;
  setSelectedCloudType: (type: number) => void;
  heatmapMode: HeatmapMode;
  setHeatmapMode: (mode: HeatmapMode) => void;
  heatmapOpacity: number;
  setHeatmapOpacity: (opacity: number) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showWindVectors: boolean;
  setShowWindVectors: (show: boolean) => void;
  onClear: () => void;
  onApplyPreset: (presetId: string) => void;
  onResetView: () => void;
}

const brushIcons: Record<BrushType, React.ReactNode> = {
  coverage: <Cloud className="w-4 h-4" />,
  density: <Droplets className="w-4 h-4" />,
  texture: <Waves className="w-4 h-4" />,
  altitude: <Mountain className="w-4 h-4" />,
  moisture: <Droplet className="w-4 h-4" />,
  turbulence: <Wind className="w-4 h-4" />,
  wind: <Navigation className="w-4 h-4" />,
  eraser: <Eraser className="w-4 h-4" />,
};

export function CloudLayerToolbar({
  activeLayer,
  setActiveLayer,
  layerVisibility,
  toggleLayerVisibility,
  activeBrush,
  setActiveBrush,
  brushSize,
  setBrushSize,
  brushStrength,
  setBrushStrength,
  brushFalloff,
  setBrushFalloff,
  selectedCloudType,
  setSelectedCloudType,
  heatmapMode,
  setHeatmapMode,
  heatmapOpacity,
  setHeatmapOpacity,
  showGrid,
  setShowGrid,
  showWindVectors,
  setShowWindVectors,
  onClear,
  onApplyPreset,
  onResetView,
}: CloudLayerToolbarProps) {
  const activeLayerData = CLOUD_LAYERS[activeLayer];

  return (
    <div className="w-72 bg-slate-800/95 border-r border-slate-700 flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Cloud Layers Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              <Layers className="w-4 h-4" />
              Cloud Layers
            </div>

            <div className="space-y-1">
              {(Object.keys(CLOUD_LAYERS) as CloudLayerId[]).map((layerId) => {
                const layer = CLOUD_LAYERS[layerId];
                const isActive = activeLayer === layerId;
                const isVisible = layerVisibility[layerId];

                return (
                  <div
                    key={layerId}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all
                      ${isActive ? 'bg-slate-700 ring-1 ring-slate-500' : 'hover:bg-slate-700/50'}
                    `}
                    onClick={() => setActiveLayer(layerId)}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{layer.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {layer.minAltitude / 1000}km - {layer.maxAltitude / 1000}km
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(layerId);
                      }}
                    >
                      {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Brushes Section */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Brushes
            </div>

            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(CLOUD_BRUSHES) as BrushType[]).map((brushId) => {
                const brush = CLOUD_BRUSHES[brushId];
                const isActive = activeBrush === brushId;
                const isAvailable = brush.affectsLayers === 'all' || brush.affectsLayers.includes(activeLayer);

                return (
                  <Button
                    key={brushId}
                    variant={isActive ? 'default' : 'outline'}
                    size="icon"
                    className={`
                      h-10 w-full border-slate-600
                      ${!isAvailable && 'opacity-40 pointer-events-none'}
                      ${isActive && 'bg-sky-600 border-sky-500'}
                    `}
                    onClick={() => setActiveBrush(brushId)}
                    title={brush.description}
                  >
                    {brushIcons[brushId]}
                  </Button>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 text-center">
              {CLOUD_BRUSHES[activeBrush].description}
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Brush Settings */}
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Brush Settings
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Size</span>
                  <span className="text-slate-300">{(brushSize / 1000).toFixed(1)} km</span>
                </div>
                <Slider
                  value={[brushSize]}
                  onValueChange={([v]) => setBrushSize(v)}
                  min={500}
                  max={10000}
                  step={100}
                  className="cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Strength</span>
                  <span className="text-slate-300">{Math.round(brushStrength * 100)}%</span>
                </div>
                <Slider
                  value={[brushStrength]}
                  onValueChange={([v]) => setBrushStrength(v)}
                  min={0.1}
                  max={1}
                  step={0.05}
                  className="cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Falloff</span>
                  <span className="text-slate-300">{brushFalloff.toFixed(1)}</span>
                </div>
                <Slider
                  value={[brushFalloff]}
                  onValueChange={([v]) => setBrushFalloff(v)}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Cloud Type for Active Layer */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Cloud Type
            </div>

            <div className="grid grid-cols-2 gap-1">
              {activeLayerData.defaultCloudTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedCloudType === type ? 'default' : 'outline'}
                  size="sm"
                  className={`
                    text-xs border-slate-600
                    ${selectedCloudType === type && 'bg-sky-600 border-sky-500'}
                  `}
                  onClick={() => setSelectedCloudType(type)}
                >
                  {CLOUD_TYPE_NAMES[type]}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Display Options */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Display
            </div>

            <div className="space-y-2">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Heatmap Mode</span>
                </div>
                <select
                  value={heatmapMode}
                  onChange={(e) => setHeatmapMode(e.target.value as HeatmapMode)}
                  className="w-full h-8 rounded-md bg-slate-900 border border-slate-600 text-white text-xs px-2"
                >
                  <option value="coverage">Coverage</option>
                  <option value="baseAltitude">Base Altitude</option>
                  <option value="topAltitude">Top Altitude</option>
                  <option value="thickness">Thickness</option>
                  <option value="moisture">Moisture</option>
                  <option value="wind">Wind Speed</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Opacity</span>
                  <span className="text-slate-300">{Math.round(heatmapOpacity * 100)}%</span>
                </div>
                <Slider
                  value={[heatmapOpacity]}
                  onValueChange={([v]) => setHeatmapOpacity(v)}
                  min={0}
                  max={1}
                  step={0.05}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant={showGrid ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3X3 className="w-3 h-3 mr-1" />
                  Grid
                </Button>
                <Button
                  variant={showWindVectors ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowWindVectors(!showWindVectors)}
                >
                  <Wind className="w-3 h-3 mr-1" />
                  Wind
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Presets */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Quick Presets
            </div>

            <div className="grid grid-cols-2 gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-600"
                onClick={() => onApplyPreset('scattered_cumulus')}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Fair Weather
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-600"
                onClick={() => onApplyPreset('overcast')}
              >
                <Cloud className="w-3 h-3 mr-1" />
                Overcast
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-600"
                onClick={() => onApplyPreset('storm_front')}
              >
                <Wind className="w-3 h-3 mr-1" />
                Storm Front
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-600"
                onClick={() => onApplyPreset('high_altitude')}
              >
                <Mountain className="w-3 h-3 mr-1" />
                High Cirrus
              </Button>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-slate-600 text-slate-300"
              onClick={onResetView}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-red-800 text-red-400 hover:bg-red-900/30"
              onClick={onClear}
            >
              <Eraser className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

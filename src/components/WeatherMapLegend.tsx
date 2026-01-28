import { HeatmapMode, HEATMAP_COLORS } from '../lib/weatherTypes';

interface WeatherMapLegendProps {
  heatmapMode: HeatmapMode;
}

const legendLabels: Record<HeatmapMode, { title: string; min: string; max: string; unit: string }> = {
  coverage: { title: 'Cloud Coverage', min: '0', max: '100', unit: '%' },
  baseAltitude: { title: 'Cloud Base', min: '0', max: '10000', unit: 'm' },
  topAltitude: { title: 'Cloud Top', min: '0', max: '15000', unit: 'm' },
  thickness: { title: 'Cloud Thickness', min: '0', max: '8000', unit: 'm' },
  moisture: { title: 'Moisture', min: '0', max: '100', unit: '%' },
  wind: { title: 'Wind Speed', min: '0', max: '40', unit: 'm/s' },
};

export function WeatherMapLegend({ heatmapMode }: WeatherMapLegendProps) {
  const colors = HEATMAP_COLORS[heatmapMode];
  const labels = legendLabels[heatmapMode];

  const gradientStyle = {
    background: `linear-gradient(to right, ${colors.join(', ')})`,
  };

  return (
    <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 min-w-[180px]">
      <div className="text-xs font-semibold text-slate-200 mb-2">{labels.title}</div>

      <div
        className="h-4 rounded"
        style={gradientStyle}
      />

      <div className="flex justify-between mt-1">
        <span className="text-xs text-slate-400">{labels.min}{labels.unit}</span>
        <span className="text-xs text-slate-400">{labels.max}{labels.unit}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span className="text-xs text-slate-400">Cold Front</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-500" />
          <span className="text-xs text-slate-400">Warm Front</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-purple-500" />
          <span className="text-xs text-slate-400">Occluded Front</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-xs">H</span>
          <span className="text-xs text-slate-400">High Pressure</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400 font-bold text-xs">L</span>
          <span className="text-xs text-slate-400">Low Pressure</span>
        </div>
      </div>
    </div>
  );
}

export interface WeatherCell {
  coverage: number;
  cloudType: number;
  moisture: number;
  verticalDevelopment: number;
  baseAltitude: number;
  topAltitude: number;
  precipitationRate: number;
  turbulence: number;
}

export interface WindCell {
  directionX: number;
  directionY: number;
  speed: number;
  gustFactor: number;
}

export interface WeatherFront {
  id: string;
  type: 'cold' | 'warm' | 'occluded' | 'stationary';
  points: { x: number; y: number }[];
  strength: number;
  width: number;
  movementVector: { x: number; y: number };
}

export interface MoistureRegion {
  id: string;
  center: { x: number; y: number };
  radius: number;
  intensity: number;
  falloff: number;
}

export interface PressureSystem {
  id: string;
  type: 'high' | 'low';
  center: { x: number; y: number };
  radius: number;
  intensity: number;
  rotation: number;
}

export interface WeatherMapData {
  width: number;
  height: number;
  worldScale: number;
  coverage: Float32Array;
  cloudType: Float32Array;
  moisture: Float32Array;
  verticalDevelopment: Float32Array;
  baseAltitude: Float32Array;
  topAltitude: Float32Array;
  windX: Float32Array;
  windY: Float32Array;
  windSpeed: Float32Array;
  turbulence: Float32Array;
  fronts: WeatherFront[];
  moistureRegions: MoistureRegion[];
  pressureSystems: PressureSystem[];
}

export interface BrushSettings {
  size: number;
  strength: number;
  falloff: number;
  mode: 'add' | 'subtract' | 'set';
}

export interface WeatherTool {
  type: 'brush' | 'eraser' | 'gradient' | 'front' | 'wind' | 'pressure' | 'select';
  settings: BrushSettings;
}

export interface WeatherLayerVisibility {
  coverage: boolean;
  cloudType: boolean;
  moisture: boolean;
  altitude: boolean;
  wind: boolean;
  fronts: boolean;
  pressure: boolean;
}

export type HeatmapMode = 'coverage' | 'baseAltitude' | 'topAltitude' | 'thickness' | 'moisture' | 'wind';

export interface WeatherMapSettings {
  resolution: number;
  worldExtent: number;
  defaultCloudBase: number;
  defaultCloudTop: number;
  autoUpdateClouds: boolean;
  showGrid: boolean;
  showCoordinates: boolean;
  heatmapOpacity: number;
  heatmapMode: HeatmapMode;
}

export const DEFAULT_WEATHER_MAP_SETTINGS: WeatherMapSettings = {
  resolution: 256,
  worldExtent: 50000,
  defaultCloudBase: 1500,
  defaultCloudTop: 4000,
  autoUpdateClouds: true,
  showGrid: true,
  showCoordinates: true,
  heatmapOpacity: 0.7,
  heatmapMode: 'coverage',
};

export const CLOUD_TYPE_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Cumulus',
  2: 'Stratus',
  3: 'Stratocumulus',
  4: 'Altostratus',
  5: 'Altocumulus',
  6: 'Cirrus',
  7: 'Cirrostratus',
  8: 'Cirrocumulus',
  9: 'Cumulonimbus',
};

export const FRONT_COLORS: Record<WeatherFront['type'], string> = {
  cold: '#0066ff',
  warm: '#ff3300',
  occluded: '#9933ff',
  stationary: '#ff6600',
};

export const HEATMAP_COLORS = {
  coverage: ['#000033', '#003366', '#006699', '#3399cc', '#66ccff', '#99ffff', '#ffffff'],
  baseAltitude: ['#003300', '#006600', '#339900', '#66cc00', '#99ff00', '#ccff66', '#ffffff'],
  topAltitude: ['#330033', '#660066', '#990099', '#cc00cc', '#ff33ff', '#ff99ff', '#ffffff'],
  thickness: ['#333300', '#666600', '#999900', '#cccc00', '#ffff00', '#ffff66', '#ffffff'],
  moisture: ['#330000', '#660000', '#990000', '#cc3300', '#ff6600', '#ff9933', '#ffcc66'],
  wind: ['#003333', '#006666', '#009999', '#00cccc', '#00ffff', '#66ffff', '#ccffff'],
};

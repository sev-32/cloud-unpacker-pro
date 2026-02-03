// Cloud layer types for multi-layer painting system

export type CloudLayerId = 'low' | 'mid' | 'high' | 'cb';

export interface CloudLayer {
  id: CloudLayerId;
  name: string;
  minAltitude: number;
  maxAltitude: number;
  defaultCloudTypes: number[];
  color: string;
  description: string;
}

export const CLOUD_LAYERS: Record<CloudLayerId, CloudLayer> = {
  low: {
    id: 'low',
    name: 'Low Clouds',
    minAltitude: 0,
    maxAltitude: 2000,
    defaultCloudTypes: [1, 2, 3], // Cumulus, Stratus, Stratocumulus
    color: '#4ade80',
    description: 'Surface to 2km - Cumulus, Stratus, Fog',
  },
  mid: {
    id: 'mid',
    name: 'Mid Clouds',
    minAltitude: 2000,
    maxAltitude: 6000,
    defaultCloudTypes: [4, 5], // Altostratus, Altocumulus
    color: '#60a5fa',
    description: '2km to 6km - Altostratus, Altocumulus',
  },
  high: {
    id: 'high',
    name: 'High Clouds',
    minAltitude: 6000,
    maxAltitude: 12000,
    defaultCloudTypes: [6, 7, 8], // Cirrus, Cirrostratus, Cirrocumulus
    color: '#c4b5fd',
    description: '6km to 12km - Cirrus, Cirrostratus',
  },
  cb: {
    id: 'cb',
    name: 'Cumulonimbus',
    minAltitude: 500,
    maxAltitude: 15000,
    defaultCloudTypes: [9], // Cumulonimbus
    color: '#ef4444',
    description: 'Towering thunderstorm clouds',
  },
};

export type BrushType = 
  | 'coverage' 
  | 'density' 
  | 'texture' 
  | 'altitude' 
  | 'moisture' 
  | 'turbulence'
  | 'wind'
  | 'eraser';

export interface CloudBrush {
  id: BrushType;
  name: string;
  icon: string;
  description: string;
  affectsLayers: CloudLayerId[] | 'all';
}

export const CLOUD_BRUSHES: Record<BrushType, CloudBrush> = {
  coverage: {
    id: 'coverage',
    name: 'Coverage',
    icon: 'cloud',
    description: 'Paint cloud coverage/presence',
    affectsLayers: 'all',
  },
  density: {
    id: 'density',
    name: 'Density',
    icon: 'droplets',
    description: 'Adjust cloud optical thickness',
    affectsLayers: 'all',
  },
  texture: {
    id: 'texture',
    name: 'Texture',
    icon: 'waves',
    description: 'Add turbulent detail and structure',
    affectsLayers: ['low', 'mid', 'cb'],
  },
  altitude: {
    id: 'altitude',
    name: 'Altitude',
    icon: 'mountain',
    description: 'Adjust cloud base and top heights',
    affectsLayers: 'all',
  },
  moisture: {
    id: 'moisture',
    name: 'Moisture',
    icon: 'droplet',
    description: 'Control precipitation potential',
    affectsLayers: 'all',
  },
  turbulence: {
    id: 'turbulence',
    name: 'Turbulence',
    icon: 'wind',
    description: 'Add convective activity',
    affectsLayers: ['low', 'cb'],
  },
  wind: {
    id: 'wind',
    name: 'Wind',
    icon: 'navigation',
    description: 'Set wind direction and speed',
    affectsLayers: 'all',
  },
  eraser: {
    id: 'eraser',
    name: 'Eraser',
    icon: 'eraser',
    description: 'Remove clouds',
    affectsLayers: 'all',
  },
};

export interface CloudLayerData {
  coverage: Float32Array;
  density: Float32Array;
  texture: Float32Array;
  baseAltitude: Float32Array;
  topAltitude: Float32Array;
}

export interface MultiLayerWeatherData {
  width: number;
  height: number;
  worldScale: number;
  layers: Record<CloudLayerId, CloudLayerData>;
  windX: Float32Array;
  windY: Float32Array;
  windSpeed: Float32Array;
  moisture: Float32Array;
  turbulence: Float32Array;
}

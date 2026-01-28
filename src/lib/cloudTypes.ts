export type LowCloudType = 'cumulus' | 'stratus' | 'stratocumulus' | 'none';
export type MidCloudType = 'altostratus' | 'altocumulus' | 'none';
export type HighCloudType = 'cirrus' | 'cirrostratus' | 'cirrocumulus' | 'none';

export interface CloudTypeParams {
  name: string;
  abbreviation: string;
  altitudeMin: number;
  altitudeMax: number;
  baseDensity: number;
  noiseFrequency: number;
  noiseOctaves: number;
  noiseAmplitude: number;
  verticalStretch: number;
  horizontalStretch: number;
  windResponse: number;
  humidityThreshold: number;
  description: string;
}

export interface CloudLayerSettings {
  lowType: LowCloudType;
  midType: MidCloudType;
  highType: HighCloudType;
  lowCoverage: number;
  midCoverage: number;
  highCoverage: number;
  verticalDevelopment: number;
}

export const LOW_CLOUD_TYPES: Record<Exclude<LowCloudType, 'none'>, CloudTypeParams> = {
  cumulus: {
    name: 'Cumulus',
    abbreviation: 'Cu',
    altitudeMin: 500,
    altitudeMax: 2000,
    baseDensity: 1.0,
    noiseFrequency: 0.0008,
    noiseOctaves: 5,
    noiseAmplitude: 1.0,
    verticalStretch: 1.2,
    horizontalStretch: 1.0,
    windResponse: 0.8,
    humidityThreshold: 0.6,
    description: 'Puffy, cotton-like fair weather clouds with flat bases and rounded tops',
  },
  stratus: {
    name: 'Stratus',
    abbreviation: 'St',
    altitudeMin: 0,
    altitudeMax: 1500,
    baseDensity: 0.6,
    noiseFrequency: 0.0003,
    noiseOctaves: 3,
    noiseAmplitude: 0.4,
    verticalStretch: 0.2,
    horizontalStretch: 3.0,
    windResponse: 0.3,
    humidityThreshold: 0.8,
    description: 'Flat, gray, featureless layer that often produces drizzle',
  },
  stratocumulus: {
    name: 'Stratocumulus',
    abbreviation: 'Sc',
    altitudeMin: 500,
    altitudeMax: 2000,
    baseDensity: 0.8,
    noiseFrequency: 0.0006,
    noiseOctaves: 4,
    noiseAmplitude: 0.7,
    verticalStretch: 0.4,
    horizontalStretch: 1.5,
    windResponse: 0.5,
    humidityThreshold: 0.7,
    description: 'Lumpy, patchy layer with cellular patterns, common in marine environments',
  },
};

export const MID_CLOUD_TYPES: Record<Exclude<MidCloudType, 'none'>, CloudTypeParams> = {
  altostratus: {
    name: 'Altostratus',
    abbreviation: 'As',
    altitudeMin: 2000,
    altitudeMax: 6000,
    baseDensity: 0.5,
    noiseFrequency: 0.0002,
    noiseOctaves: 2,
    noiseAmplitude: 0.3,
    verticalStretch: 0.15,
    horizontalStretch: 4.0,
    windResponse: 0.4,
    humidityThreshold: 0.65,
    description: 'Gray or blue-gray sheet that may obscure the sun, often precedes rain',
  },
  altocumulus: {
    name: 'Altocumulus',
    abbreviation: 'Ac',
    altitudeMin: 2000,
    altitudeMax: 6000,
    baseDensity: 0.6,
    noiseFrequency: 0.0005,
    noiseOctaves: 4,
    noiseAmplitude: 0.6,
    verticalStretch: 0.5,
    horizontalStretch: 1.2,
    windResponse: 0.6,
    humidityThreshold: 0.55,
    description: 'White or gray patches arranged in waves or rolls, often called mackerel sky',
  },
};

export const HIGH_CLOUD_TYPES: Record<Exclude<HighCloudType, 'none'>, CloudTypeParams> = {
  cirrus: {
    name: 'Cirrus',
    abbreviation: 'Ci',
    altitudeMin: 6000,
    altitudeMax: 12000,
    baseDensity: 0.15,
    noiseFrequency: 0.0004,
    noiseOctaves: 3,
    noiseAmplitude: 0.5,
    verticalStretch: 0.3,
    horizontalStretch: 2.5,
    windResponse: 1.0,
    humidityThreshold: 0.3,
    description: 'Wispy, hair-like ice crystal clouds streaked by high-altitude winds',
  },
  cirrostratus: {
    name: 'Cirrostratus',
    abbreviation: 'Cs',
    altitudeMin: 6000,
    altitudeMax: 12000,
    baseDensity: 0.1,
    noiseFrequency: 0.00015,
    noiseOctaves: 2,
    noiseAmplitude: 0.2,
    verticalStretch: 0.1,
    horizontalStretch: 5.0,
    windResponse: 0.5,
    humidityThreshold: 0.35,
    description: 'Thin, transparent ice crystal veil that creates halos around sun/moon',
  },
  cirrocumulus: {
    name: 'Cirrocumulus',
    abbreviation: 'Cc',
    altitudeMin: 6000,
    altitudeMax: 12000,
    baseDensity: 0.12,
    noiseFrequency: 0.0007,
    noiseOctaves: 3,
    noiseAmplitude: 0.4,
    verticalStretch: 0.2,
    horizontalStretch: 1.0,
    windResponse: 0.8,
    humidityThreshold: 0.4,
    description: 'Small white rippled patches of ice crystals, often in regular patterns',
  },
};

export const TOWERING_CUMULUS_PARAMS: CloudTypeParams = {
  name: 'Towering Cumulus',
  abbreviation: 'TCu',
  altitudeMin: 500,
  altitudeMax: 6000,
  baseDensity: 1.2,
  noiseFrequency: 0.0006,
  noiseOctaves: 6,
  noiseAmplitude: 1.2,
  verticalStretch: 2.5,
  horizontalStretch: 0.8,
  windResponse: 0.6,
  humidityThreshold: 0.5,
  description: 'Vertically developing cumulus with significant height, precursor to thunderstorms',
};

export const LOW_TYPE_TO_INDEX: Record<LowCloudType, number> = {
  none: 0,
  cumulus: 1,
  stratus: 2,
  stratocumulus: 3,
};

export const MID_TYPE_TO_INDEX: Record<MidCloudType, number> = {
  none: 0,
  altostratus: 1,
  altocumulus: 2,
};

export const HIGH_TYPE_TO_INDEX: Record<HighCloudType, number> = {
  none: 0,
  cirrus: 1,
  cirrostratus: 2,
  cirrocumulus: 3,
};

export const DEFAULT_CLOUD_LAYER_SETTINGS: CloudLayerSettings = {
  lowType: 'cumulus',
  midType: 'none',
  highType: 'cirrus',
  lowCoverage: 0.5,
  midCoverage: 0.0,
  highCoverage: 0.3,
  verticalDevelopment: 0.0,
};

export function getCloudTypeInfo(
  layer: 'low' | 'mid' | 'high',
  type: LowCloudType | MidCloudType | HighCloudType
): CloudTypeParams | null {
  if (type === 'none') return null;

  switch (layer) {
    case 'low':
      return LOW_CLOUD_TYPES[type as Exclude<LowCloudType, 'none'>] || null;
    case 'mid':
      return MID_CLOUD_TYPES[type as Exclude<MidCloudType, 'none'>] || null;
    case 'high':
      return HIGH_CLOUD_TYPES[type as Exclude<HighCloudType, 'none'>] || null;
  }
}

export interface CloudLayerPreset {
  name: string;
  settings: CloudLayerSettings;
}

export const CLOUD_LAYER_PRESETS: CloudLayerPreset[] = [
  {
    name: 'Fair Weather',
    settings: {
      lowType: 'cumulus',
      midType: 'none',
      highType: 'none',
      lowCoverage: 0.3,
      midCoverage: 0.0,
      highCoverage: 0.0,
      verticalDevelopment: 0.0,
    },
  },
  {
    name: 'Overcast',
    settings: {
      lowType: 'stratus',
      midType: 'none',
      highType: 'none',
      lowCoverage: 0.9,
      midCoverage: 0.0,
      highCoverage: 0.0,
      verticalDevelopment: 0.0,
    },
  },
  {
    name: 'Mixed Layer',
    settings: {
      lowType: 'stratocumulus',
      midType: 'altocumulus',
      highType: 'none',
      lowCoverage: 0.6,
      midCoverage: 0.4,
      highCoverage: 0.0,
      verticalDevelopment: 0.0,
    },
  },
  {
    name: 'High Thin',
    settings: {
      lowType: 'none',
      midType: 'none',
      highType: 'cirrostratus',
      lowCoverage: 0.0,
      midCoverage: 0.0,
      highCoverage: 0.7,
      verticalDevelopment: 0.0,
    },
  },
  {
    name: 'Building Weather',
    settings: {
      lowType: 'cumulus',
      midType: 'none',
      highType: 'cirrus',
      lowCoverage: 0.5,
      midCoverage: 0.0,
      highCoverage: 0.2,
      verticalDevelopment: 0.6,
    },
  },
  {
    name: 'Marine Layer',
    settings: {
      lowType: 'stratocumulus',
      midType: 'none',
      highType: 'none',
      lowCoverage: 0.8,
      midCoverage: 0.0,
      highCoverage: 0.0,
      verticalDevelopment: 0.0,
    },
  },
  {
    name: 'Approaching Front',
    settings: {
      lowType: 'cumulus',
      midType: 'altostratus',
      highType: 'cirrus',
      lowCoverage: 0.4,
      midCoverage: 0.5,
      highCoverage: 0.6,
      verticalDevelopment: 0.3,
    },
  },
  {
    name: 'Mackerel Sky',
    settings: {
      lowType: 'none',
      midType: 'altocumulus',
      highType: 'cirrocumulus',
      lowCoverage: 0.0,
      midCoverage: 0.6,
      highCoverage: 0.4,
      verticalDevelopment: 0.0,
    },
  },
];

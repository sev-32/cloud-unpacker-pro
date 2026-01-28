export const ATMOSPHERIC_CONSTANTS = {
  DRY_LAPSE_RATE: 9.8,
  MOIST_LAPSE_RATE: 6.5,
  SEA_LEVEL_PRESSURE: 1013.25,
  SEA_LEVEL_TEMP: 288.15,
  STANDARD_TEMP_CELSIUS: 15,
  GAS_CONSTANT_DRY: 287.05,
  GAS_CONSTANT_VAPOR: 461.5,
  LATENT_HEAT_VAPORIZATION: 2.501e6,
  SPECIFIC_HEAT_DRY: 1005,
  SPECIFIC_HEAT_VAPOR: 1850,
  GRAVITY: 9.81,
  KELVIN_OFFSET: 273.15,
} as const;

export const CLOUD_ALTITUDE_BANDS = {
  LOW: { min: 0, max: 2000, label: 'Low (0-2km)' },
  MIDDLE: { min: 2000, max: 6000, label: 'Middle (2-6km)' },
  HIGH: { min: 6000, max: 12000, label: 'High (6-12km)' },
  VERTICAL: { min: 500, max: 12000, label: 'Vertical Development' },
} as const;

export interface AtmosphericCell {
  temperature: number;
  pressure: number;
  humidity: number;
  dewpoint: number;
  windU: number;
  windV: number;
  windW: number;
  instability: number;
}

export interface AtmosphericGridConfig {
  resolutionX: number;
  resolutionY: number;
  resolutionZ: number;
  minAltitude: number;
  maxAltitude: number;
  extentXZ: number;
}

export interface AtmosphericGrid {
  config: AtmosphericGridConfig;
  data: Float32Array;
  needsUpdate: boolean;
  lastUpdateTime: number;
}

export interface SurfaceConditions {
  temperature: number;
  pressure: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
}

export interface AtmosphericProfile {
  surfaceConditions: SurfaceConditions;
  lapseRate: number;
  inversionAltitude: number;
  inversionStrength: number;
  tropopauseAltitude: number;
  instabilityIndex: number;
  moistureProfile: 'dry' | 'moderate' | 'moist' | 'saturated';
}

export interface WeatherState {
  id: string;
  name: string;
  timestamp: number;
  atmosphericProfile: AtmosphericProfile;
  cloudCoverage: number;
  precipitationIntensity: number;
  visibility: number;
  stormActivity: number;
}

export interface AtmosphericUniforms {
  uSurfaceTemperature: number;
  uSurfacePressure: number;
  uSurfaceHumidity: number;
  uLapseRate: number;
  uInversionAltitude: number;
  uInversionStrength: number;
  uTropopauseAltitude: number;
  uInstabilityIndex: number;
  uAtmosphereGridResolution: [number, number, number];
  uAtmosphereGridBounds: [number, number, number, number];
}

export function celsiusToKelvin(celsius: number): number {
  return celsius + ATMOSPHERIC_CONSTANTS.KELVIN_OFFSET;
}

export function kelvinToCelsius(kelvin: number): number {
  return kelvin - ATMOSPHERIC_CONSTANTS.KELVIN_OFFSET;
}

export function calculateDewpoint(tempKelvin: number, relativeHumidity: number): number {
  const tempC = kelvinToCelsius(tempKelvin);
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * tempC) / (b + tempC) + Math.log(Math.max(0.01, relativeHumidity));
  const dewpointC = (b * gamma) / (a - gamma);
  return celsiusToKelvin(dewpointC);
}

export function calculateLCL(surfaceTempKelvin: number, surfaceHumidity: number): number {
  const dewpoint = calculateDewpoint(surfaceTempKelvin, surfaceHumidity);
  const tempDiff = surfaceTempKelvin - dewpoint;
  const lclHeight = tempDiff * 125;
  return Math.max(0, lclHeight);
}

export function calculatePressureAtAltitude(
  surfacePressure: number,
  altitude: number,
  surfaceTemp: number,
  lapseRate: number
): number {
  const g = ATMOSPHERIC_CONSTANTS.GRAVITY;
  const R = ATMOSPHERIC_CONSTANTS.GAS_CONSTANT_DRY;
  const L = lapseRate / 1000;

  if (Math.abs(L) < 0.0001) {
    return surfacePressure * Math.exp(-g * altitude / (R * surfaceTemp));
  }

  const exponent = g / (R * L);
  return surfacePressure * Math.pow(1 - (L * altitude) / surfaceTemp, exponent);
}

export function calculateTemperatureAtAltitude(
  surfaceTemp: number,
  altitude: number,
  lapseRate: number,
  inversionAltitude: number,
  inversionStrength: number
): number {
  let temp = surfaceTemp - (lapseRate / 1000) * altitude;

  if (altitude > inversionAltitude && inversionStrength > 0) {
    const aboveInversion = altitude - inversionAltitude;
    const inversionEffect = inversionStrength * (1 - Math.exp(-aboveInversion / 500));
    temp += inversionEffect;
  }

  return Math.max(temp, 180);
}

export function calculateSaturationVaporPressure(tempKelvin: number): number {
  const tempC = kelvinToCelsius(tempKelvin);
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
}

export function calculateRelativeHumidity(
  actualVaporPressure: number,
  saturationVaporPressure: number
): number {
  return Math.min(1, Math.max(0, actualVaporPressure / saturationVaporPressure));
}

export function calculateCAPE(
  surfaceTemp: number,
  surfaceHumidity: number,
  environmentalLapseRate: number
): number {
  const dewpoint = calculateDewpoint(surfaceTemp, surfaceHumidity);
  const lcl = calculateLCL(surfaceTemp, surfaceHumidity);

  const tempDiff = surfaceTemp - dewpoint;
  const moistAdiabat = ATMOSPHERIC_CONSTANTS.MOIST_LAPSE_RATE / 1000;
  const envLapse = environmentalLapseRate / 1000;

  const buoyancy = (envLapse - moistAdiabat) * 1000;
  const depth = Math.max(0, 10000 - lcl);

  const cape = Math.max(0, buoyancy * depth * 0.1 * surfaceHumidity);
  return Math.min(cape, 5000);
}

export function calculateLiftedIndex(
  surfaceTemp: number,
  surfaceHumidity: number,
  temp500hPa: number
): number {
  const lcl = calculateLCL(surfaceTemp, surfaceHumidity);
  const moistLapse = ATMOSPHERIC_CONSTANTS.MOIST_LAPSE_RATE / 1000;
  const altitude500 = 5500;

  const liftedTemp = surfaceTemp - (lcl / 1000) * (ATMOSPHERIC_CONSTANTS.DRY_LAPSE_RATE / 1000)
    - ((altitude500 - lcl) / 1000) * moistLapse;

  return kelvinToCelsius(temp500hPa) - kelvinToCelsius(liftedTemp);
}

export function createDefaultAtmosphericProfile(): AtmosphericProfile {
  return {
    surfaceConditions: {
      temperature: celsiusToKelvin(20),
      pressure: ATMOSPHERIC_CONSTANTS.SEA_LEVEL_PRESSURE,
      humidity: 0.6,
      windSpeed: 5,
      windDirection: Math.PI / 4,
    },
    lapseRate: ATMOSPHERIC_CONSTANTS.DRY_LAPSE_RATE,
    inversionAltitude: 1500,
    inversionStrength: 0,
    tropopauseAltitude: 11000,
    instabilityIndex: 0.3,
    moistureProfile: 'moderate',
  };
}

export function createAtmosphericGridConfig(
  resX = 32,
  resY = 16,
  resZ = 32,
  maxAlt = 12000,
  extent = 50000
): AtmosphericGridConfig {
  return {
    resolutionX: resX,
    resolutionY: resY,
    resolutionZ: resZ,
    minAltitude: 0,
    maxAltitude: maxAlt,
    extentXZ: extent,
  };
}

export function packAtmosphericCell(cell: AtmosphericCell): [number, number, number, number] {
  const normalizedTemp = (cell.temperature - 200) / 150;
  const normalizedHumidity = cell.humidity;
  const windMag = Math.sqrt(cell.windU * cell.windU + cell.windV * cell.windV);
  const normalizedWind = Math.min(1, windMag / 50);
  const normalizedInstability = cell.instability;

  return [normalizedTemp, normalizedHumidity, normalizedWind, normalizedInstability];
}

export function unpackAtmosphericCell(packed: [number, number, number, number]): Partial<AtmosphericCell> {
  return {
    temperature: packed[0] * 150 + 200,
    humidity: packed[1],
    instability: packed[3],
  };
}

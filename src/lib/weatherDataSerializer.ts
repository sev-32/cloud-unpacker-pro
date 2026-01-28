import pako from 'pako';
import { WeatherMapData, WeatherFront, PressureSystem, MoistureRegion } from './weatherTypes';

function float32ArrayToBase64(arr: Float32Array): string {
  const bytes = new Uint8Array(arr.buffer);
  const compressed = pako.deflate(bytes);
  let binary = '';
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return btoa(binary);
}

function base64ToFloat32Array(base64: string, length: number): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decompressed = pako.inflate(bytes);
  return new Float32Array(decompressed.buffer).slice(0, length);
}

export interface SerializedWeatherMapData {
  coverage_data: string;
  cloud_type_data: string;
  moisture_data: string;
  vertical_dev_data: string;
  base_altitude_data: string;
  top_altitude_data: string;
  wind_x_data: string;
  wind_y_data: string;
  wind_speed_data: string;
  turbulence_data: string;
}

export interface SerializedWeatherFront {
  front_type: WeatherFront['type'];
  points: { x: number; y: number }[];
  strength: number;
  width: number;
  movement_x: number;
  movement_y: number;
}

export interface SerializedPressureSystem {
  system_type: PressureSystem['type'];
  center_x: number;
  center_y: number;
  radius: number;
  intensity: number;
  rotation: number;
}

export interface SerializedMoistureRegion {
  center_x: number;
  center_y: number;
  radius: number;
  intensity: number;
  falloff: number;
}

export function serializeWeatherMapData(data: WeatherMapData): SerializedWeatherMapData {
  return {
    coverage_data: float32ArrayToBase64(data.coverage),
    cloud_type_data: float32ArrayToBase64(data.cloudType),
    moisture_data: float32ArrayToBase64(data.moisture),
    vertical_dev_data: float32ArrayToBase64(data.verticalDevelopment),
    base_altitude_data: float32ArrayToBase64(data.baseAltitude),
    top_altitude_data: float32ArrayToBase64(data.topAltitude),
    wind_x_data: float32ArrayToBase64(data.windX),
    wind_y_data: float32ArrayToBase64(data.windY),
    wind_speed_data: float32ArrayToBase64(data.windSpeed),
    turbulence_data: float32ArrayToBase64(data.turbulence),
  };
}

export function deserializeWeatherMapData(
  serialized: SerializedWeatherMapData,
  width: number,
  height: number,
  worldScale: number
): WeatherMapData {
  const size = width * height;
  return {
    width,
    height,
    worldScale,
    coverage: base64ToFloat32Array(serialized.coverage_data, size),
    cloudType: base64ToFloat32Array(serialized.cloud_type_data, size),
    moisture: base64ToFloat32Array(serialized.moisture_data, size),
    verticalDevelopment: base64ToFloat32Array(serialized.vertical_dev_data, size),
    baseAltitude: base64ToFloat32Array(serialized.base_altitude_data, size),
    topAltitude: base64ToFloat32Array(serialized.top_altitude_data, size),
    windX: base64ToFloat32Array(serialized.wind_x_data, size),
    windY: base64ToFloat32Array(serialized.wind_y_data, size),
    windSpeed: base64ToFloat32Array(serialized.wind_speed_data, size),
    turbulence: base64ToFloat32Array(serialized.turbulence_data, size),
    fronts: [],
    moistureRegions: [],
    pressureSystems: [],
  };
}

export function serializeWeatherFront(front: WeatherFront): SerializedWeatherFront {
  return {
    front_type: front.type,
    points: front.points,
    strength: front.strength,
    width: front.width,
    movement_x: front.movementVector.x,
    movement_y: front.movementVector.y,
  };
}

export function deserializeWeatherFront(serialized: SerializedWeatherFront, id: string): WeatherFront {
  return {
    id,
    type: serialized.front_type,
    points: serialized.points,
    strength: serialized.strength,
    width: serialized.width,
    movementVector: { x: serialized.movement_x, y: serialized.movement_y },
  };
}

export function serializePressureSystem(system: PressureSystem): SerializedPressureSystem {
  return {
    system_type: system.type,
    center_x: system.center.x,
    center_y: system.center.y,
    radius: system.radius,
    intensity: system.intensity,
    rotation: system.rotation,
  };
}

export function deserializePressureSystem(serialized: SerializedPressureSystem, id: string): PressureSystem {
  return {
    id,
    type: serialized.system_type,
    center: { x: serialized.center_x, y: serialized.center_y },
    radius: serialized.radius,
    intensity: serialized.intensity,
    rotation: serialized.rotation,
  };
}

export function serializeMoistureRegion(region: MoistureRegion): SerializedMoistureRegion {
  return {
    center_x: region.center.x,
    center_y: region.center.y,
    radius: region.radius,
    intensity: region.intensity,
    falloff: region.falloff,
  };
}

export function deserializeMoistureRegion(serialized: SerializedMoistureRegion, id: string): MoistureRegion {
  return {
    id,
    center: { x: serialized.center_x, y: serialized.center_y },
    radius: serialized.radius,
    intensity: serialized.intensity,
    falloff: serialized.falloff,
  };
}

export interface ExportedWeatherMap {
  version: number;
  name: string;
  description: string;
  resolution: number;
  worldExtent: number;
  category: string;
  region: string;
  data: SerializedWeatherMapData;
  fronts: SerializedWeatherFront[];
  pressureSystems: SerializedPressureSystem[];
  moistureRegions: SerializedMoistureRegion[];
}

export function exportWeatherMapToJSON(
  name: string,
  description: string,
  resolution: number,
  worldExtent: number,
  category: string,
  region: string,
  data: WeatherMapData
): string {
  const exported: ExportedWeatherMap = {
    version: 1,
    name,
    description,
    resolution,
    worldExtent,
    category,
    region,
    data: serializeWeatherMapData(data),
    fronts: data.fronts.map(serializeWeatherFront),
    pressureSystems: data.pressureSystems.map(serializePressureSystem),
    moistureRegions: data.moistureRegions.map(serializeMoistureRegion),
  };
  return JSON.stringify(exported);
}

export function importWeatherMapFromJSON(json: string): {
  name: string;
  description: string;
  resolution: number;
  worldExtent: number;
  category: string;
  region: string;
  data: WeatherMapData;
} {
  const imported: ExportedWeatherMap = JSON.parse(json);
  const worldScale = imported.worldExtent / imported.resolution;
  const data = deserializeWeatherMapData(
    imported.data,
    imported.resolution,
    imported.resolution,
    worldScale
  );

  data.fronts = imported.fronts.map((f, i) => deserializeWeatherFront(f, `front-${i}`));
  data.pressureSystems = imported.pressureSystems.map((p, i) => deserializePressureSystem(p, `pressure-${i}`));
  data.moistureRegions = imported.moistureRegions.map((m, i) => deserializeMoistureRegion(m, `moisture-${i}`));

  return {
    name: imported.name,
    description: imported.description,
    resolution: imported.resolution,
    worldExtent: imported.worldExtent,
    category: imported.category,
    region: imported.region,
    data,
  };
}

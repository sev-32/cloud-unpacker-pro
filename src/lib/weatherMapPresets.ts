import { WeatherTextureManager } from './weatherTextureManager';
import { WeatherFront, PressureSystem } from './weatherTypes';

export interface WeatherMapPreset {
  id: string;
  name: string;
  description: string;
  apply: (manager: WeatherTextureManager, worldExtent: number) => void;
}

export const WEATHER_MAP_PRESETS: WeatherMapPreset[] = [
  {
    id: 'clear',
    name: 'Clear Skies',
    description: 'High pressure system with minimal cloud cover',
    apply: (manager, worldExtent) => {
      manager.clear();

      const highPressure: PressureSystem = {
        id: 'preset-high-1',
        type: 'high',
        center: { x: 0, y: 0 },
        radius: worldExtent * 0.6,
        intensity: 0.8,
        rotation: 1,
      };
      manager.applyPressureSystem(highPressure);
    },
  },
  {
    id: 'scattered-cumulus',
    name: 'Scattered Cumulus',
    description: 'Fair weather with scattered cumulus clouds',
    apply: (manager, worldExtent) => {
      manager.clear();

      const cells = 8;
      const spacing = worldExtent * 2 / cells;

      for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {
          const x = -worldExtent + spacing * (i + 0.5) + (Math.random() - 0.5) * spacing * 0.6;
          const z = -worldExtent + spacing * (j + 0.5) + (Math.random() - 0.5) * spacing * 0.6;

          if (Math.random() > 0.4) {
            const coverage = 0.4 + Math.random() * 0.4;
            const radius = 1500 + Math.random() * 2000;
            manager.setCoverage(x, z, coverage, radius, 1.5);
            manager.setCloudType(x, z, 1, radius);
            manager.setAltitude(x, z, 1500 + Math.random() * 500, 3000 + Math.random() * 1500, radius, 2);
          }
        }
      }

      for (let i = 0; i < 5; i++) {
        const x = (Math.random() - 0.5) * worldExtent * 1.5;
        const z = (Math.random() - 0.5) * worldExtent * 1.5;
        manager.setMoisture(x, z, 0.6 + Math.random() * 0.3, 5000 + Math.random() * 5000, 2);
      }
    },
  },
  {
    id: 'overcast-stratus',
    name: 'Overcast Stratus',
    description: 'Low overcast layer with light drizzle potential',
    apply: (manager, worldExtent) => {
      manager.clear();

      for (let x = -worldExtent; x <= worldExtent; x += 500) {
        for (let z = -worldExtent; z <= worldExtent; z += 500) {
          const baseNoise = Math.sin(x * 0.0003) * Math.cos(z * 0.0003) * 0.15;
          const coverage = 0.75 + baseNoise + (Math.random() - 0.5) * 0.1;
          manager.setCoverage(x, z, Math.max(0, coverage), 800, 2);
          manager.setCloudType(x, z, 2, 800);
        }
      }

      manager.setAltitude(0, 0, 500, 1500, worldExtent, 3);

      for (let x = -worldExtent; x <= worldExtent; x += 1000) {
        for (let z = -worldExtent; z <= worldExtent; z += 1000) {
          manager.setMoisture(x, z, 0.85, 2000, 2);
        }
      }
    },
  },
  {
    id: 'cold-front',
    name: 'Cold Front Passage',
    description: 'Active cold front with line of thunderstorms',
    apply: (manager, worldExtent) => {
      manager.clear();

      const front: WeatherFront = {
        id: 'preset-cold-front',
        type: 'cold',
        points: [
          { x: -worldExtent * 0.8, y: worldExtent * 0.6 },
          { x: -worldExtent * 0.3, y: worldExtent * 0.2 },
          { x: worldExtent * 0.2, y: -worldExtent * 0.3 },
          { x: worldExtent * 0.7, y: -worldExtent * 0.7 },
        ],
        strength: 0.9,
        width: 5000,
        movementVector: { x: 0.5, y: -0.3 },
      };
      manager.applyFront(front);

      const highBehind: PressureSystem = {
        id: 'preset-high-behind',
        type: 'high',
        center: { x: -worldExtent * 0.5, y: -worldExtent * 0.3 },
        radius: worldExtent * 0.4,
        intensity: 0.6,
        rotation: 1,
      };
      manager.applyPressureSystem(highBehind);
    },
  },
  {
    id: 'warm-front',
    name: 'Approaching Warm Front',
    description: 'Warm front with layered clouds and steady rain',
    apply: (manager, worldExtent) => {
      manager.clear();

      const front: WeatherFront = {
        id: 'preset-warm-front',
        type: 'warm',
        points: [
          { x: -worldExtent * 0.9, y: -worldExtent * 0.4 },
          { x: -worldExtent * 0.3, y: -worldExtent * 0.1 },
          { x: worldExtent * 0.3, y: worldExtent * 0.2 },
          { x: worldExtent * 0.9, y: worldExtent * 0.4 },
        ],
        strength: 0.8,
        width: 8000,
        movementVector: { x: 0.3, y: 0.2 },
      };
      manager.applyFront(front);
    },
  },
  {
    id: 'low-pressure',
    name: 'Low Pressure System',
    description: 'Deep low pressure with spiraling clouds',
    apply: (manager, worldExtent) => {
      manager.clear();

      const low: PressureSystem = {
        id: 'preset-low-center',
        type: 'low',
        center: { x: worldExtent * 0.1, y: -worldExtent * 0.1 },
        radius: worldExtent * 0.7,
        intensity: 0.85,
        rotation: -1.5,
      };
      manager.applyPressureSystem(low);

      const coldFront: WeatherFront = {
        id: 'preset-low-cold',
        type: 'cold',
        points: [
          { x: worldExtent * 0.1, y: -worldExtent * 0.1 },
          { x: -worldExtent * 0.2, y: -worldExtent * 0.5 },
          { x: -worldExtent * 0.5, y: -worldExtent * 0.8 },
        ],
        strength: 0.7,
        width: 4000,
        movementVector: { x: -0.3, y: -0.2 },
      };
      manager.applyFront(coldFront);

      const warmFront: WeatherFront = {
        id: 'preset-low-warm',
        type: 'warm',
        points: [
          { x: worldExtent * 0.1, y: -worldExtent * 0.1 },
          { x: worldExtent * 0.4, y: worldExtent * 0.2 },
          { x: worldExtent * 0.7, y: worldExtent * 0.5 },
        ],
        strength: 0.6,
        width: 6000,
        movementVector: { x: 0.2, y: 0.3 },
      };
      manager.applyFront(warmFront);
    },
  },
  {
    id: 'tropical',
    name: 'Tropical Disturbance',
    description: 'Organized tropical convection',
    apply: (manager, worldExtent) => {
      manager.clear();

      const tropical: PressureSystem = {
        id: 'preset-tropical',
        type: 'low',
        center: { x: 0, y: 0 },
        radius: worldExtent * 0.5,
        intensity: 0.95,
        rotation: -2,
      };
      manager.applyPressureSystem(tropical);

      const bands = 4;
      for (let b = 0; b < bands; b++) {
        const bandRadius = worldExtent * (0.2 + b * 0.15);
        const points = 24;
        for (let p = 0; p < points; p++) {
          const angle = (p / points) * Math.PI * 2 + b * 0.5;
          const spiralAngle = angle + (bandRadius / worldExtent) * 1.5;
          const x = Math.cos(spiralAngle) * bandRadius;
          const z = Math.sin(spiralAngle) * bandRadius;

          const coverage = 0.7 + Math.random() * 0.3;
          manager.setCoverage(x, z, coverage, 2000, 1.5);
          manager.setCloudType(x, z, b === 0 ? 9 : 3, 2000);
          manager.setMoisture(x, z, 0.9, 3000, 1.5);
        }
      }
    },
  },
  {
    id: 'marine-layer',
    name: 'Marine Layer',
    description: 'Coastal stratus with clear interior',
    apply: (manager, worldExtent) => {
      manager.clear();

      for (let x = -worldExtent; x <= worldExtent * 0.3; x += 600) {
        for (let z = -worldExtent; z <= worldExtent; z += 600) {
          const distFromCoast = (x + worldExtent) / (worldExtent * 1.3);
          const coverage = Math.max(0, 0.85 - distFromCoast * 0.6 + (Math.random() - 0.5) * 0.15);
          manager.setCoverage(x, z, coverage, 1000, 2);
          manager.setCloudType(x, z, 2, 1000);
          manager.setAltitude(x, z, 200, 800, 1000, 2);
          manager.setMoisture(x, z, 0.9 - distFromCoast * 0.3, 1500, 2);
        }
      }

      const windDir = { x: 1, y: 0 };
      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          manager.setWind(x, z, windDir.x, windDir.y, 8, 3000);
        }
      }
    },
  },
  {
    id: 'mountain-waves',
    name: 'Mountain Wave Clouds',
    description: 'Lenticular clouds in wave patterns',
    apply: (manager, worldExtent) => {
      manager.clear();

      const waveSpacing = worldExtent * 0.25;
      const waveCount = 6;

      for (let w = 0; w < waveCount; w++) {
        const waveZ = -worldExtent * 0.5 + w * waveSpacing;

        for (let x = -worldExtent; x <= worldExtent; x += 800) {
          const waveAmplitude = 0.6 + Math.sin(x * 0.0005) * 0.3;
          const coverage = waveAmplitude * (0.8 - Math.abs(w - waveCount / 2) / waveCount * 0.5);

          if (coverage > 0.3) {
            manager.setCoverage(x, waveZ, coverage, 1500, 2);
            manager.setCloudType(x, waveZ, 5, 1500);
            manager.setAltitude(x, waveZ, 4000 + w * 500, 5500 + w * 500, 1500, 2);
          }
        }
      }

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          manager.setWind(x, z, 0, -1, 25, 3000);
        }
      }
    },
  },
  {
    id: 'convergence-zone',
    name: 'Convergence Zone',
    description: 'Line of convection from converging winds',
    apply: (manager, worldExtent) => {
      manager.clear();

      for (let x = -worldExtent * 0.1; x <= worldExtent * 0.1; x += 600) {
        for (let z = -worldExtent; z <= worldExtent; z += 600) {
          const distFromLine = Math.abs(x) / (worldExtent * 0.1);
          const coverage = Math.max(0, 0.8 - distFromLine * 0.5 + (Math.random() - 0.5) * 0.2);

          if (coverage > 0.3) {
            manager.setCoverage(x, z, coverage, 1200, 1.5);
            manager.setCloudType(x, z, coverage > 0.6 ? 9 : 1, 1200);
            manager.setMoisture(x, z, 0.8, 2000, 1.5);

            if (coverage > 0.6) {
              const vd = (coverage - 0.6) / 0.4;
              manager.data.verticalDevelopment[
                Math.floor((z + worldExtent) / (worldExtent * 2) * manager.data.height) * manager.data.width +
                Math.floor((x + worldExtent) / (worldExtent * 2) * manager.data.width)
              ] = vd;
            }
          }
        }
      }

      for (let x = -worldExtent; x < -worldExtent * 0.2; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          manager.setWind(x, z, 1, 0, 12, 3000);
        }
      }
      for (let x = worldExtent * 0.2; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          manager.setWind(x, z, -1, 0, 12, 3000);
        }
      }
    },
  },
];

export function getWeatherMapPreset(id: string): WeatherMapPreset | undefined {
  return WEATHER_MAP_PRESETS.find(p => p.id === id);
}

export function applyWeatherMapPreset(
  manager: WeatherTextureManager,
  presetId: string,
  worldExtent: number
): boolean {
  const preset = getWeatherMapPreset(presetId);
  if (!preset) return false;

  preset.apply(manager, worldExtent);
  return true;
}

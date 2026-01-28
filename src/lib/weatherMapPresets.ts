import { WeatherTextureManager } from './weatherTextureManager';
import { WeatherFront, PressureSystem } from './weatherTypes';

export interface WeatherMapPreset {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'historical' | 'regional' | 'severe';
  region?: string;
  apply: (manager: WeatherTextureManager, worldExtent: number) => void;
}

export const WEATHER_MAP_PRESETS: WeatherMapPreset[] = [
  {
    id: 'clear',
    name: 'Clear Skies',
    description: 'High pressure system with minimal cloud cover',
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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
    category: 'basic',
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

  // Historical/Geographic Presets
  {
    id: 'north-atlantic-cyclone',
    name: 'North Atlantic Cyclone',
    description: 'Deep extratropical cyclone based on Icelandic Low patterns with occluded front structure',
    category: 'historical',
    region: 'North Atlantic',
    apply: (manager, worldExtent) => {
      manager.clear();

      const low: PressureSystem = {
        id: 'iceland-low',
        type: 'low',
        center: { x: worldExtent * 0.15, y: worldExtent * 0.2 },
        radius: worldExtent * 0.65,
        intensity: 0.92,
        rotation: -1.8,
      };
      manager.applyPressureSystem(low);

      const occludedFront: WeatherFront = {
        id: 'occluded-main',
        type: 'occluded',
        points: [
          { x: worldExtent * 0.15, y: worldExtent * 0.2 },
          { x: -worldExtent * 0.1, y: worldExtent * 0.35 },
          { x: -worldExtent * 0.35, y: worldExtent * 0.25 },
          { x: -worldExtent * 0.55, y: -worldExtent * 0.05 },
        ],
        strength: 0.85,
        width: 4500,
        movementVector: { x: 0.4, y: 0.1 },
      };
      manager.applyFront(occludedFront);

      const coldFront: WeatherFront = {
        id: 'trailing-cold',
        type: 'cold',
        points: [
          { x: -worldExtent * 0.55, y: -worldExtent * 0.05 },
          { x: -worldExtent * 0.45, y: -worldExtent * 0.4 },
          { x: -worldExtent * 0.25, y: -worldExtent * 0.7 },
        ],
        strength: 0.75,
        width: 3500,
        movementVector: { x: 0.5, y: -0.2 },
      };
      manager.applyFront(coldFront);

      const warmFront: WeatherFront = {
        id: 'trailing-warm',
        type: 'warm',
        points: [
          { x: -worldExtent * 0.55, y: -worldExtent * 0.05 },
          { x: -worldExtent * 0.25, y: worldExtent * 0.1 },
          { x: worldExtent * 0.1, y: worldExtent * 0.3 },
        ],
        strength: 0.65,
        width: 6000,
        movementVector: { x: 0.3, y: 0.25 },
      };
      manager.applyFront(warmFront);

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          const dx = x - worldExtent * 0.15;
          const dz = z - worldExtent * 0.2;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const angle = Math.atan2(dz, dx) - Math.PI / 2;
          const speed = 15 + (1 - dist / worldExtent) * 25;
          manager.setWind(x, z, Math.cos(angle), Math.sin(angle), speed, 3000);
        }
      }
    },
  },
  {
    id: 'great-plains-supercell',
    name: 'Great Plains Supercell',
    description: 'Dryline convergence with isolated supercell thunderstorms - Tornado Alley setup',
    category: 'severe',
    region: 'US Great Plains',
    apply: (manager, worldExtent) => {
      manager.clear();

      for (let z = -worldExtent; z <= worldExtent; z += 500) {
        const x = worldExtent * 0.1 + Math.sin(z * 0.0002) * worldExtent * 0.05;
        manager.setMoisture(x, z, 0.4, 1500, 2);

        for (let dx = -worldExtent * 0.5; dx < 0; dx += 800) {
          manager.setMoisture(x + dx, z, 0.85 + (Math.random() - 0.5) * 0.1, 1200, 2);
        }
        for (let dx = 0; dx < worldExtent * 0.5; dx += 800) {
          manager.setMoisture(x + dx, z, 0.25 + (Math.random() - 0.5) * 0.1, 1200, 2);
        }
      }

      const supercells = [
        { x: -worldExtent * 0.05, z: worldExtent * 0.3 },
        { x: worldExtent * 0.12, z: -worldExtent * 0.1 },
        { x: worldExtent * 0.08, z: -worldExtent * 0.5 },
      ];

      supercells.forEach((cell, i) => {
        const radius = 4000 + Math.random() * 2000;
        manager.setCoverage(cell.x, cell.z, 0.95, radius, 1.2);
        manager.setCloudType(cell.x, cell.z, 9, radius);
        manager.setAltitude(cell.x, cell.z, 1500, 14000, radius, 1.5);
        manager.setMoisture(cell.x, cell.z, 0.95, radius * 1.2, 1.5);

        const idx = Math.floor((cell.z + worldExtent) / (worldExtent * 2) * manager.data.height) * manager.data.width +
          Math.floor((cell.x + worldExtent) / (worldExtent * 2) * manager.data.width);
        if (idx >= 0 && idx < manager.data.verticalDevelopment.length) {
          manager.data.verticalDevelopment[idx] = 0.95;
        }

        for (let a = 0; a < 3; a++) {
          const angle = Math.PI * 0.5 + (a - 1) * 0.4;
          const anvilX = cell.x + Math.cos(angle) * radius * 2;
          const anvilZ = cell.z + Math.sin(angle) * radius * 2;
          manager.setCoverage(anvilX, anvilZ, 0.6, radius * 1.5, 2);
          manager.setCloudType(anvilX, anvilZ, 7, radius * 1.5);
          manager.setAltitude(anvilX, anvilZ, 10000, 14000, radius * 1.5, 2);
        }
      });

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          if (x < worldExtent * 0.1) {
            manager.setWind(x, z, 0.3, 0.95, 15, 3000);
          } else {
            manager.setWind(x, z, 0.7, -0.7, 20, 3000);
          }
        }
      }
    },
  },
  {
    id: 'atmospheric-river',
    name: 'Pacific Atmospheric River',
    description: 'Pineapple Express - Long narrow moisture plume from tropical Pacific',
    category: 'historical',
    region: 'Pacific Northwest',
    apply: (manager, worldExtent) => {
      manager.clear();

      const riverWidth = worldExtent * 0.2;
      const riverAngle = Math.PI * 0.15;

      for (let t = -1.2; t <= 1.2; t += 0.02) {
        const centerX = t * worldExtent;
        const centerZ = t * worldExtent * Math.tan(riverAngle);

        for (let w = -riverWidth; w <= riverWidth; w += 400) {
          const perpX = centerX + w * Math.cos(riverAngle + Math.PI / 2);
          const perpZ = centerZ + w * Math.sin(riverAngle + Math.PI / 2);

          if (Math.abs(perpX) > worldExtent || Math.abs(perpZ) > worldExtent) continue;

          const distFromCenter = Math.abs(w) / riverWidth;
          const moisture = 0.95 - distFromCenter * 0.4;
          const coverage = Math.max(0, 0.8 - distFromCenter * 0.5 + (Math.random() - 0.5) * 0.1);

          manager.setMoisture(perpX, perpZ, moisture, 600, 1.5);
          manager.setCoverage(perpX, perpZ, coverage, 600, 1.5);

          if (distFromCenter < 0.3) {
            manager.setCloudType(perpX, perpZ, 3, 600);
            manager.setAltitude(perpX, perpZ, 500, 4000, 600, 2);
          } else if (distFromCenter < 0.6) {
            manager.setCloudType(perpX, perpZ, 4, 600);
            manager.setAltitude(perpX, perpZ, 2000, 5000, 600, 2);
          } else {
            manager.setCloudType(perpX, perpZ, 6, 600);
            manager.setAltitude(perpX, perpZ, 5000, 8000, 600, 2);
          }
        }
      }

      const warmFront: WeatherFront = {
        id: 'ar-warm',
        type: 'warm',
        points: [
          { x: -worldExtent * 0.8, y: -worldExtent * 0.6 },
          { x: -worldExtent * 0.3, y: -worldExtent * 0.2 },
          { x: worldExtent * 0.2, y: worldExtent * 0.1 },
          { x: worldExtent * 0.7, y: worldExtent * 0.4 },
        ],
        strength: 0.7,
        width: 5000,
        movementVector: { x: 0.4, y: 0.2 },
      };
      manager.applyFront(warmFront);

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          manager.setWind(x, z, 0.85, 0.5, 25, 3000);
        }
      }
    },
  },
  {
    id: 'saharan-air-layer',
    name: 'Saharan Air Layer',
    description: 'Elevated dust-laden layer with trade wind inversion suppressing convection',
    category: 'historical',
    region: 'Tropical Atlantic',
    apply: (manager, worldExtent) => {
      manager.clear();

      for (let x = -worldExtent * 0.3; x <= worldExtent; x += 500) {
        for (let z = -worldExtent; z <= worldExtent; z += 500) {
          const salIntensity = Math.max(0, 1 - (worldExtent - x) / (worldExtent * 1.3));
          const noise = Math.sin(x * 0.0003) * Math.cos(z * 0.0004) * 0.2;

          if (salIntensity > 0.2) {
            manager.setCoverage(x, z, salIntensity * 0.4 + noise, 800, 2);
            manager.setCloudType(x, z, 5, 800);
            manager.setAltitude(x, z, 1500, 5000, 800, 2);
            manager.setMoisture(x, z, 0.2 + (1 - salIntensity) * 0.3, 1000, 2);
          }
        }
      }

      for (let x = -worldExtent; x < -worldExtent * 0.3; x += 600) {
        for (let z = -worldExtent; z <= worldExtent; z += 600) {
          const distFromSal = (-worldExtent * 0.3 - x) / worldExtent;
          if (Math.random() > 0.6) {
            const coverage = 0.5 + Math.random() * 0.3;
            manager.setCoverage(x, z, coverage, 1500, 1.5);
            manager.setCloudType(x, z, 1, 1500);
            manager.setAltitude(x, z, 600, 2000, 1500, 2);
            manager.setMoisture(x, z, 0.7, 2000, 2);
          }
        }
      }

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          manager.setWind(x, z, -0.95, -0.3, 12, 3000);
        }
      }
    },
  },
  {
    id: 'asian-monsoon',
    name: 'Asian Summer Monsoon',
    description: 'Broad ITCZ convergence zone with embedded mesoscale convective systems',
    category: 'historical',
    region: 'South Asia',
    apply: (manager, worldExtent) => {
      manager.clear();

      for (let x = -worldExtent; x <= worldExtent; x += 400) {
        for (let z = -worldExtent * 0.4; z <= worldExtent * 0.3; z += 400) {
          const zoneIntensity = 1 - Math.abs(z) / (worldExtent * 0.35);
          const noise = Math.sin(x * 0.0004) * 0.15 + Math.cos(z * 0.0005) * 0.1;
          const coverage = zoneIntensity * 0.7 + noise + (Math.random() - 0.5) * 0.15;

          manager.setCoverage(x, z, Math.max(0, coverage), 600, 1.5);
          manager.setMoisture(x, z, 0.85 + zoneIntensity * 0.1, 800, 1.5);

          if (coverage > 0.6) {
            manager.setCloudType(x, z, 3, 600);
            manager.setAltitude(x, z, 500, 6000, 600, 2);
          } else if (coverage > 0.3) {
            manager.setCloudType(x, z, 2, 600);
            manager.setAltitude(x, z, 300, 2500, 600, 2);
          }
        }
      }

      const mcsLocations = [
        { x: -worldExtent * 0.5, z: -worldExtent * 0.1 },
        { x: worldExtent * 0.1, z: worldExtent * 0.05 },
        { x: worldExtent * 0.6, z: -worldExtent * 0.15 },
        { x: -worldExtent * 0.2, z: worldExtent * 0.15 },
      ];

      mcsLocations.forEach((mcs) => {
        const radius = 5000 + Math.random() * 3000;
        manager.setCoverage(mcs.x, mcs.z, 0.9, radius, 1.3);
        manager.setCloudType(mcs.x, mcs.z, 9, radius * 0.6);
        manager.setAltitude(mcs.x, mcs.z, 800, 12000, radius, 1.5);

        const idx = Math.floor((mcs.z + worldExtent) / (worldExtent * 2) * manager.data.height) * manager.data.width +
          Math.floor((mcs.x + worldExtent) / (worldExtent * 2) * manager.data.width);
        if (idx >= 0 && idx < manager.data.verticalDevelopment.length) {
          manager.data.verticalDevelopment[idx] = 0.85;
        }
      });

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          if (z < -worldExtent * 0.2) {
            manager.setWind(x, z, 0.7, 0.7, 8, 3000);
          } else {
            manager.setWind(x, z, -0.5, 0.85, 12, 3000);
          }
        }
      }
    },
  },
  {
    id: 'mediterranean-cutoff',
    name: 'Mediterranean Cutoff Low',
    description: 'Slow-moving isolated upper-level low with heavy rain potential',
    category: 'historical',
    region: 'Mediterranean',
    apply: (manager, worldExtent) => {
      manager.clear();

      const cutoffLow: PressureSystem = {
        id: 'cutoff-center',
        type: 'low',
        center: { x: worldExtent * 0.1, y: 0 },
        radius: worldExtent * 0.45,
        intensity: 0.8,
        rotation: -1.2,
      };
      manager.applyPressureSystem(cutoffLow);

      const secondaryLow: PressureSystem = {
        id: 'secondary-low',
        type: 'low',
        center: { x: -worldExtent * 0.25, y: worldExtent * 0.25 },
        radius: worldExtent * 0.25,
        intensity: 0.5,
        rotation: -0.8,
      };
      manager.applyPressureSystem(secondaryLow);

      for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
        const r = worldExtent * 0.3;
        const x = worldExtent * 0.1 + Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        const coverage = 0.7 + Math.sin(angle * 3) * 0.15;
        manager.setCoverage(x, z, coverage, 2500, 1.5);
        manager.setCloudType(x, z, coverage > 0.75 ? 9 : 4, 2500);
        manager.setMoisture(x, z, 0.9, 3500, 1.5);
      }

      const highToEast: PressureSystem = {
        id: 'blocking-high',
        type: 'high',
        center: { x: worldExtent * 0.7, y: -worldExtent * 0.2 },
        radius: worldExtent * 0.4,
        intensity: 0.65,
        rotation: 1,
      };
      manager.applyPressureSystem(highToEast);
    },
  },
  {
    id: 'australian-southerly',
    name: 'Australian Southerly Buster',
    description: 'Sharp cold front with gusty winds and rapid temperature drop',
    category: 'historical',
    region: 'Southeast Australia',
    apply: (manager, worldExtent) => {
      manager.clear();

      const coldFront: WeatherFront = {
        id: 'southerly-front',
        type: 'cold',
        points: [
          { x: -worldExtent * 0.9, y: worldExtent * 0.3 },
          { x: -worldExtent * 0.4, y: worldExtent * 0.15 },
          { x: worldExtent * 0.1, y: 0 },
          { x: worldExtent * 0.6, y: -worldExtent * 0.2 },
          { x: worldExtent * 0.9, y: -worldExtent * 0.35 },
        ],
        strength: 0.95,
        width: 3000,
        movementVector: { x: 0, y: -0.8 },
      };
      manager.applyFront(coldFront);

      for (let z = worldExtent * 0.3; z <= worldExtent; z += 500) {
        for (let x = -worldExtent; x <= worldExtent; x += 500) {
          manager.setCoverage(x, z, 0.15 + (Math.random() - 0.5) * 0.1, 800, 2);
          manager.setCloudType(x, z, 1, 800);
        }
      }

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          if (z > worldExtent * 0.2) {
            manager.setWind(x, z, 0, -1, 35, 3000);
          } else if (z > -worldExtent * 0.1) {
            manager.setWind(x, z, -0.3, -0.95, 25, 3000);
          } else {
            manager.setWind(x, z, 0.7, 0.7, 10, 3000);
          }
        }
      }
    },
  },
  {
    id: 'noreaster',
    name: "Classic Nor'easter",
    description: 'Coastal cyclogenesis with heavy snow/rain and wrap-around moisture bands',
    category: 'severe',
    region: 'US East Coast',
    apply: (manager, worldExtent) => {
      manager.clear();

      const noreaster: PressureSystem = {
        id: 'noreaster-center',
        type: 'low',
        center: { x: worldExtent * 0.2, y: -worldExtent * 0.15 },
        radius: worldExtent * 0.6,
        intensity: 0.9,
        rotation: -1.6,
      };
      manager.applyPressureSystem(noreaster);

      for (let band = 0; band < 4; band++) {
        const bandAngle = -Math.PI * 0.3 - band * 0.3;
        const bandLength = worldExtent * (0.5 + band * 0.15);

        for (let t = 0; t < bandLength; t += 400) {
          const spiralFactor = t / bandLength;
          const angle = bandAngle + spiralFactor * 1.2;
          const r = worldExtent * 0.15 + t;

          const x = worldExtent * 0.2 + Math.cos(angle) * r * 0.7;
          const z = -worldExtent * 0.15 + Math.sin(angle) * r;

          if (Math.abs(x) > worldExtent || Math.abs(z) > worldExtent) continue;

          const coverage = 0.75 - spiralFactor * 0.3 + (Math.random() - 0.5) * 0.1;
          manager.setCoverage(x, z, Math.max(0, coverage), 1000, 1.5);
          manager.setCloudType(x, z, band === 0 ? 9 : 3, 1000);
          manager.setMoisture(x, z, 0.9 - spiralFactor * 0.2, 1500, 1.5);
        }
      }

      for (let z = -worldExtent * 0.5; z <= worldExtent * 0.2; z += 500) {
        const transitionX = worldExtent * (-0.1 + Math.sin(z * 0.0003) * 0.1);
        manager.setCoverage(transitionX, z, 0.6, 2000, 2);
      }

      const coldFront: WeatherFront = {
        id: 'noreaster-cold',
        type: 'cold',
        points: [
          { x: worldExtent * 0.2, y: -worldExtent * 0.15 },
          { x: -worldExtent * 0.1, y: -worldExtent * 0.45 },
          { x: -worldExtent * 0.4, y: -worldExtent * 0.7 },
        ],
        strength: 0.7,
        width: 3500,
        movementVector: { x: -0.2, y: -0.3 },
      };
      manager.applyFront(coldFront);

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          const dx = x - worldExtent * 0.2;
          const dz = z + worldExtent * 0.15;
          const angle = Math.atan2(dz, dx) - Math.PI / 2;
          manager.setWind(x, z, Math.cos(angle), Math.sin(angle), 30, 3000);
        }
      }
    },
  },
  {
    id: 'bay-of-bengal-cyclone',
    name: 'Bay of Bengal Cyclone',
    description: 'Organized tropical cyclone with distinct eye, eyewall, and spiral rainbands',
    category: 'severe',
    region: 'Bay of Bengal',
    apply: (manager, worldExtent) => {
      manager.clear();

      const eyeRadius = worldExtent * 0.03;
      const eyewallRadius = worldExtent * 0.08;
      const centerX = 0;
      const centerZ = 0;

      for (let x = -eyeRadius; x <= eyeRadius; x += 300) {
        for (let z = -eyeRadius; z <= eyeRadius; z += 300) {
          const dist = Math.sqrt(x * x + z * z);
          if (dist < eyeRadius) {
            manager.setCoverage(centerX + x, centerZ + z, 0.05, 500, 2);
            manager.setMoisture(centerX + x, centerZ + z, 0.3, 500, 2);
          }
        }
      }

      for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        for (let r = eyeRadius; r <= eyewallRadius; r += 200) {
          const x = centerX + Math.cos(angle) * r;
          const z = centerZ + Math.sin(angle) * r;

          manager.setCoverage(x, z, 0.98, 600, 1.2);
          manager.setCloudType(x, z, 9, 600);
          manager.setAltitude(x, z, 500, 15000, 600, 1.5);
          manager.setMoisture(x, z, 0.98, 800, 1.5);

          const idx = Math.floor((z + worldExtent) / (worldExtent * 2) * manager.data.height) * manager.data.width +
            Math.floor((x + worldExtent) / (worldExtent * 2) * manager.data.width);
          if (idx >= 0 && idx < manager.data.verticalDevelopment.length) {
            manager.data.verticalDevelopment[idx] = 0.95;
          }
        }
      }

      for (let band = 0; band < 5; band++) {
        const startAngle = band * Math.PI * 0.4;
        const bandRadius = eyewallRadius + worldExtent * 0.08 * (band + 1);

        for (let a = 0; a < Math.PI * 1.5; a += 0.03) {
          const spiralAngle = startAngle + a + a * 0.3;
          const r = bandRadius + a * worldExtent * 0.1;

          if (r > worldExtent * 0.9) continue;

          const x = centerX + Math.cos(spiralAngle) * r;
          const z = centerZ + Math.sin(spiralAngle) * r;

          if (Math.abs(x) > worldExtent || Math.abs(z) > worldExtent) continue;

          const coverage = 0.7 - a * 0.15 + (Math.random() - 0.5) * 0.1;
          manager.setCoverage(x, z, Math.max(0, coverage), 1200, 1.5);
          manager.setCloudType(x, z, coverage > 0.5 ? 3 : 2, 1200);
          manager.setMoisture(x, z, 0.85, 1500, 1.5);
        }
      }

      for (let x = -worldExtent; x <= worldExtent; x += 1500) {
        for (let z = -worldExtent; z <= worldExtent; z += 1500) {
          const dx = x - centerX;
          const dz = z - centerZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const angle = Math.atan2(dz, dx) - Math.PI / 2 - Math.PI * 0.15;

          let speed;
          if (dist < eyeRadius) {
            speed = 5;
          } else if (dist < eyewallRadius) {
            speed = 50 + (dist - eyeRadius) / (eyewallRadius - eyeRadius) * 20;
          } else {
            speed = Math.max(10, 70 - (dist - eyewallRadius) / worldExtent * 50);
          }

          manager.setWind(x, z, Math.cos(angle), Math.sin(angle), speed, 2500);
        }
      }
    },
  },
  {
    id: 'european-blocking',
    name: 'European Blocking High',
    description: 'Persistent omega block anticyclone with clear skies and potential fog',
    category: 'historical',
    region: 'Europe',
    apply: (manager, worldExtent) => {
      manager.clear();

      const blockingHigh: PressureSystem = {
        id: 'omega-high',
        type: 'high',
        center: { x: 0, y: 0 },
        radius: worldExtent * 0.55,
        intensity: 0.85,
        rotation: 1.2,
      };
      manager.applyPressureSystem(blockingHigh);

      for (let x = -worldExtent * 0.4; x <= worldExtent * 0.4; x += 800) {
        for (let z = -worldExtent * 0.4; z <= worldExtent * 0.4; z += 800) {
          const dist = Math.sqrt(x * x + z * z) / worldExtent;
          if (dist < 0.3 && Math.random() > 0.7) {
            manager.setCoverage(x, z, 0.4 + Math.random() * 0.3, 1500, 2);
            manager.setCloudType(x, z, 2, 1500);
            manager.setAltitude(x, z, 50, 300, 1500, 2);
            manager.setMoisture(x, z, 0.95, 2000, 2);
          }
        }
      }

      const lowToNorth: PressureSystem = {
        id: 'northern-low',
        type: 'low',
        center: { x: -worldExtent * 0.5, y: worldExtent * 0.7 },
        radius: worldExtent * 0.35,
        intensity: 0.6,
        rotation: -1,
      };
      manager.applyPressureSystem(lowToNorth);

      const lowToSouth: PressureSystem = {
        id: 'southern-low',
        type: 'low',
        center: { x: worldExtent * 0.5, y: -worldExtent * 0.7 },
        radius: worldExtent * 0.35,
        intensity: 0.6,
        rotation: -1,
      };
      manager.applyPressureSystem(lowToSouth);
    },
  },
  {
    id: 'itcz-convection',
    name: 'ITCZ Convection Zone',
    description: 'Equatorial convergence belt with diurnal thunderstorm cycles',
    category: 'historical',
    region: 'Tropical Pacific',
    apply: (manager, worldExtent) => {
      manager.clear();

      for (let x = -worldExtent; x <= worldExtent; x += 400) {
        for (let z = -worldExtent * 0.2; z <= worldExtent * 0.2; z += 400) {
          const zoneIntensity = 1 - Math.pow(Math.abs(z) / (worldExtent * 0.2), 2);
          const noise = Math.sin(x * 0.0003) * Math.cos(z * 0.0006) * 0.2;
          const coverage = zoneIntensity * 0.65 + noise + (Math.random() - 0.5) * 0.15;

          manager.setCoverage(x, z, Math.max(0, coverage), 600, 1.5);
          manager.setMoisture(x, z, 0.8 + zoneIntensity * 0.15, 800, 1.5);

          if (coverage > 0.5) {
            manager.setCloudType(x, z, 1, 600);
            manager.setAltitude(x, z, 800, 4000, 600, 2);
          }
        }
      }

      const hotTowers = [];
      for (let i = 0; i < 12; i++) {
        hotTowers.push({
          x: (Math.random() - 0.5) * worldExtent * 1.8,
          z: (Math.random() - 0.5) * worldExtent * 0.35,
        });
      }

      hotTowers.forEach((tower) => {
        const radius = 3000 + Math.random() * 2000;
        manager.setCoverage(tower.x, tower.z, 0.9, radius, 1.3);
        manager.setCloudType(tower.x, tower.z, 9, radius * 0.7);
        manager.setAltitude(tower.x, tower.z, 600, 14000, radius, 1.5);
        manager.setMoisture(tower.x, tower.z, 0.95, radius * 1.2, 1.5);

        const idx = Math.floor((tower.z + worldExtent) / (worldExtent * 2) * manager.data.height) * manager.data.width +
          Math.floor((tower.x + worldExtent) / (worldExtent * 2) * manager.data.width);
        if (idx >= 0 && idx < manager.data.verticalDevelopment.length) {
          manager.data.verticalDevelopment[idx] = 0.9;
        }
      });

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          if (z > worldExtent * 0.1) {
            manager.setWind(x, z, -0.8, -0.6, 10, 3000);
          } else if (z < -worldExtent * 0.1) {
            manager.setWind(x, z, -0.8, 0.6, 10, 3000);
          } else {
            manager.setWind(x, z, -0.95, z / (worldExtent * 0.2) * 0.3, 5, 3000);
          }
        }
      }
    },
  },
  {
    id: 'polar-vortex',
    name: 'Polar Vortex Intrusion',
    description: 'Arctic air mass boundary with lake effect snow setup',
    category: 'severe',
    region: 'North America',
    apply: (manager, worldExtent) => {
      manager.clear();

      const arcticFront: WeatherFront = {
        id: 'arctic-front',
        type: 'cold',
        points: [
          { x: -worldExtent * 0.9, y: worldExtent * 0.4 },
          { x: -worldExtent * 0.4, y: worldExtent * 0.25 },
          { x: worldExtent * 0.1, y: worldExtent * 0.15 },
          { x: worldExtent * 0.6, y: worldExtent * 0.3 },
          { x: worldExtent * 0.9, y: worldExtent * 0.5 },
        ],
        strength: 0.95,
        width: 4000,
        movementVector: { x: 0, y: -0.7 },
      };
      manager.applyFront(arcticFront);

      const lakeEffectZones = [
        { x: -worldExtent * 0.3, z: worldExtent * 0.55, width: worldExtent * 0.15, length: worldExtent * 0.35 },
        { x: worldExtent * 0.1, z: worldExtent * 0.5, width: worldExtent * 0.12, length: worldExtent * 0.3 },
      ];

      lakeEffectZones.forEach((zone) => {
        for (let dx = 0; dx < zone.length; dx += 500) {
          for (let dz = -zone.width / 2; dz < zone.width / 2; dz += 500) {
            const x = zone.x + dx;
            const z = zone.z + dz;

            if (Math.abs(x) > worldExtent || Math.abs(z) > worldExtent) continue;

            const coverage = 0.7 + (Math.random() - 0.5) * 0.2 - dx / zone.length * 0.3;
            manager.setCoverage(x, z, Math.max(0, coverage), 800, 1.5);
            manager.setCloudType(x, z, coverage > 0.5 ? 3 : 2, 800);
            manager.setAltitude(x, z, 500, 3000, 800, 2);
            manager.setMoisture(x, z, 0.9, 1000, 1.5);
          }
        }
      });

      for (let x = -worldExtent; x <= worldExtent; x += 600) {
        for (let z = worldExtent * 0.5; z <= worldExtent; z += 600) {
          if (Math.random() > 0.7) {
            manager.setCoverage(x, z, 0.3 + Math.random() * 0.2, 1000, 2);
            manager.setCloudType(x, z, 1, 1000);
          }
        }
      }

      for (let x = -worldExtent; x <= worldExtent; x += 2000) {
        for (let z = -worldExtent; z <= worldExtent; z += 2000) {
          if (z > worldExtent * 0.3) {
            manager.setWind(x, z, 0, -1, 35, 3000);
          } else {
            manager.setWind(x, z, 0.3, 0.95, 8, 3000);
          }
        }
      }
    },
  },
];

export function getWeatherMapPreset(id: string): WeatherMapPreset | undefined {
  return WEATHER_MAP_PRESETS.find(p => p.id === id);
}

export function getPresetsByCategory(category: WeatherMapPreset['category']): WeatherMapPreset[] {
  return WEATHER_MAP_PRESETS.filter(p => p.category === category);
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

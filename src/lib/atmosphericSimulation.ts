import {
  ATMOSPHERIC_CONSTANTS,
  AtmosphericGrid,
  AtmosphericGridConfig,
  AtmosphericProfile,
  AtmosphericCell,
  calculateTemperatureAtAltitude,
  calculatePressureAtAltitude,
  calculateDewpoint,
  calculateLCL,
  calculateCAPE,
  packAtmosphericCell,
  createAtmosphericGridConfig,
  createDefaultAtmosphericProfile,
} from './atmosphericTypes';

export class AtmosphericSimulation {
  private grid: AtmosphericGrid;
  private profile: AtmosphericProfile;
  private updateInterval: number;
  private simulationTime: number;

  constructor(
    config: AtmosphericGridConfig = createAtmosphericGridConfig(),
    profile: AtmosphericProfile = createDefaultAtmosphericProfile()
  ) {
    const totalCells = config.resolutionX * config.resolutionY * config.resolutionZ;
    this.grid = {
      config,
      data: new Float32Array(totalCells * 4),
      needsUpdate: true,
      lastUpdateTime: 0,
    };
    this.profile = profile;
    this.updateInterval = 100;
    this.simulationTime = 0;
  }

  public getGrid(): AtmosphericGrid {
    return this.grid;
  }

  public getProfile(): AtmosphericProfile {
    return this.profile;
  }

  public setProfile(profile: Partial<AtmosphericProfile>): void {
    this.profile = { ...this.profile, ...profile };
    this.grid.needsUpdate = true;
  }

  public setSurfaceConditions(conditions: Partial<AtmosphericProfile['surfaceConditions']>): void {
    this.profile.surfaceConditions = { ...this.profile.surfaceConditions, ...conditions };
    this.grid.needsUpdate = true;
  }

  public update(deltaTime: number): boolean {
    this.simulationTime += deltaTime;

    if (!this.grid.needsUpdate && this.simulationTime - this.grid.lastUpdateTime < this.updateInterval) {
      return false;
    }

    this.computeAtmosphericGrid();
    this.grid.needsUpdate = false;
    this.grid.lastUpdateTime = this.simulationTime;
    return true;
  }

  public forceUpdate(): void {
    this.computeAtmosphericGrid();
    this.grid.needsUpdate = false;
    this.grid.lastUpdateTime = this.simulationTime;
  }

  private computeAtmosphericGrid(): void {
    const { resolutionX, resolutionY, resolutionZ, minAltitude, maxAltitude, extentXZ } = this.grid.config;
    const { surfaceConditions, lapseRate, inversionAltitude, inversionStrength, instabilityIndex } = this.profile;

    const cape = calculateCAPE(
      surfaceConditions.temperature,
      surfaceConditions.humidity,
      lapseRate
    );
    const normalizedCAPE = Math.min(1, cape / 3000);

    for (let z = 0; z < resolutionZ; z++) {
      for (let y = 0; y < resolutionY; y++) {
        for (let x = 0; x < resolutionX; x++) {
          const worldX = ((x / (resolutionX - 1)) - 0.5) * 2 * extentXZ;
          const worldY = minAltitude + (y / (resolutionY - 1)) * (maxAltitude - minAltitude);
          const worldZ = ((z / (resolutionZ - 1)) - 0.5) * 2 * extentXZ;

          const cell = this.computeCellAtPosition(worldX, worldY, worldZ, normalizedCAPE);
          const packed = packAtmosphericCell(cell);

          const idx = (z * resolutionY * resolutionX + y * resolutionX + x) * 4;
          this.grid.data[idx + 0] = packed[0];
          this.grid.data[idx + 1] = packed[1];
          this.grid.data[idx + 2] = packed[2];
          this.grid.data[idx + 3] = packed[3];
        }
      }
    }
  }

  private computeCellAtPosition(
    worldX: number,
    worldY: number,
    worldZ: number,
    normalizedCAPE: number
  ): AtmosphericCell {
    const { surfaceConditions, lapseRate, inversionAltitude, inversionStrength, instabilityIndex } = this.profile;

    const temperature = calculateTemperatureAtAltitude(
      surfaceConditions.temperature,
      worldY,
      lapseRate,
      inversionAltitude,
      inversionStrength
    );

    const pressure = calculatePressureAtAltitude(
      surfaceConditions.pressure,
      worldY,
      surfaceConditions.temperature,
      lapseRate
    );

    const humidityDecay = Math.exp(-worldY / 8000);
    const humidity = surfaceConditions.humidity * humidityDecay;

    const dewpoint = calculateDewpoint(temperature, humidity);

    const windShearFactor = 1 + worldY / 5000;
    const windAngle = surfaceConditions.windDirection + (worldY / 10000) * 0.3;
    const windMag = surfaceConditions.windSpeed * windShearFactor;
    const windU = windMag * Math.cos(windAngle);
    const windV = windMag * Math.sin(windAngle);

    const thermalNoise = this.simplexNoise3D(
      worldX / 5000 + this.simulationTime * 0.0001,
      worldY / 2000,
      worldZ / 5000
    );
    const windW = thermalNoise * 2 * instabilityIndex;

    const localInstability = instabilityIndex * (1 + normalizedCAPE * 0.5) *
      (1 - Math.min(1, worldY / 12000));

    return {
      temperature,
      pressure,
      humidity,
      dewpoint,
      windU,
      windV,
      windW,
      instability: Math.min(1, localInstability),
    };
  }

  private simplexNoise3D(x: number, y: number, z: number): number {
    const p = [x, y, z].map(v => Math.floor(v));
    const f = [x, y, z].map(v => v - Math.floor(v));

    const u = f.map(v => v * v * (3 - 2 * v));

    const hash = (px: number, py: number, pz: number): number => {
      const h = Math.sin(px * 127.1 + py * 311.7 + pz * 74.7) * 43758.5453;
      return h - Math.floor(h);
    };

    const lerp = (a: number, b: number, t: number) => a + t * (b - a);

    const n000 = hash(p[0], p[1], p[2]) * 2 - 1;
    const n001 = hash(p[0], p[1], p[2] + 1) * 2 - 1;
    const n010 = hash(p[0], p[1] + 1, p[2]) * 2 - 1;
    const n011 = hash(p[0], p[1] + 1, p[2] + 1) * 2 - 1;
    const n100 = hash(p[0] + 1, p[1], p[2]) * 2 - 1;
    const n101 = hash(p[0] + 1, p[1], p[2] + 1) * 2 - 1;
    const n110 = hash(p[0] + 1, p[1] + 1, p[2]) * 2 - 1;
    const n111 = hash(p[0] + 1, p[1] + 1, p[2] + 1) * 2 - 1;

    const nx00 = lerp(n000, n100, u[0]);
    const nx01 = lerp(n001, n101, u[0]);
    const nx10 = lerp(n010, n110, u[0]);
    const nx11 = lerp(n011, n111, u[0]);

    const nxy0 = lerp(nx00, nx10, u[1]);
    const nxy1 = lerp(nx01, nx11, u[1]);

    return lerp(nxy0, nxy1, u[2]);
  }

  public getLCL(): number {
    const { temperature, humidity } = this.profile.surfaceConditions;
    return calculateLCL(temperature, humidity);
  }

  public getCAPE(): number {
    const { temperature, humidity } = this.profile.surfaceConditions;
    return calculateCAPE(temperature, humidity, this.profile.lapseRate);
  }

  public getCloudBaseAltitude(): number {
    return this.getLCL();
  }

  public getCondensationProbability(altitude: number): number {
    const lcl = this.getLCL();
    if (altitude < lcl) return 0;

    const { humidity } = this.profile.surfaceConditions;
    const humidityAtAlt = humidity * Math.exp(-altitude / 8000);
    const aboveLCL = (altitude - lcl) / 1000;

    return Math.min(1, humidityAtAlt * (1 + aboveLCL * 0.5));
  }

  public serialize(): string {
    return JSON.stringify({
      profile: this.profile,
      config: this.grid.config,
      simulationTime: this.simulationTime,
    });
  }

  public static deserialize(json: string): AtmosphericSimulation {
    const data = JSON.parse(json);
    const sim = new AtmosphericSimulation(data.config, data.profile);
    sim.simulationTime = data.simulationTime || 0;
    sim.forceUpdate();
    return sim;
  }

  public getUniformData(): {
    surfaceTemp: number;
    surfacePressure: number;
    surfaceHumidity: number;
    lapseRate: number;
    inversionAlt: number;
    inversionStrength: number;
    tropopause: number;
    instability: number;
    lcl: number;
    cape: number;
    gridResolution: [number, number, number];
    gridBounds: [number, number, number, number];
  } {
    const { config } = this.grid;
    return {
      surfaceTemp: this.profile.surfaceConditions.temperature,
      surfacePressure: this.profile.surfaceConditions.pressure,
      surfaceHumidity: this.profile.surfaceConditions.humidity,
      lapseRate: this.profile.lapseRate,
      inversionAlt: this.profile.inversionAltitude,
      inversionStrength: this.profile.inversionStrength,
      tropopause: this.profile.tropopauseAltitude,
      instability: this.profile.instabilityIndex,
      lcl: this.getLCL(),
      cape: this.getCAPE(),
      gridResolution: [config.resolutionX, config.resolutionY, config.resolutionZ],
      gridBounds: [config.minAltitude, config.maxAltitude, config.extentXZ, config.extentXZ],
    };
  }

  public getTextureData(): Float32Array {
    return this.grid.data;
  }

  public getTextureSize(): [number, number, number] {
    const { resolutionX, resolutionY, resolutionZ } = this.grid.config;
    return [resolutionX, resolutionY, resolutionZ];
  }
}

export function createAtmosphericSimulation(
  surfaceTemp = 293,
  surfaceHumidity = 0.6,
  instability = 0.3
): AtmosphericSimulation {
  const profile = createDefaultAtmosphericProfile();
  profile.surfaceConditions.temperature = surfaceTemp;
  profile.surfaceConditions.humidity = surfaceHumidity;
  profile.instabilityIndex = instability;

  const sim = new AtmosphericSimulation(createAtmosphericGridConfig(), profile);
  sim.forceUpdate();
  return sim;
}

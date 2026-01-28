import { WeatherMapData, WeatherFront, PressureSystem, DEFAULT_WEATHER_MAP_SETTINGS } from './weatherTypes';

export interface WeatherTextures {
  coverageTexture: WebGLTexture | null;
  windTexture: WebGLTexture | null;
  altitudeTexture: WebGLTexture | null;
}

export interface WeatherTextureManager {
  textures: WeatherTextures;
  data: WeatherMapData;
  isDirty: boolean;
  dirtyRect: { x: number; y: number; width: number; height: number } | null;
  uploadToGPU: (gl: WebGL2RenderingContext) => void;
  setCoverage: (x: number, y: number, value: number, radius: number, falloff: number) => void;
  setCloudType: (x: number, y: number, value: number, radius: number) => void;
  setMoisture: (x: number, y: number, value: number, radius: number, falloff: number) => void;
  setWind: (x: number, y: number, dirX: number, dirY: number, speed: number, radius: number) => void;
  setAltitude: (x: number, y: number, base: number, top: number, radius: number, falloff: number) => void;
  applyFront: (front: WeatherFront) => void;
  applyPressureSystem: (system: PressureSystem) => void;
  clear: () => void;
  getDataAtPosition: (worldX: number, worldZ: number) => {
    coverage: number;
    cloudType: number;
    moisture: number;
    baseAltitude: number;
    topAltitude: number;
    windX: number;
    windY: number;
    windSpeed: number;
  };
  dispose: (gl: WebGL2RenderingContext) => void;
}

export function createWeatherMapData(width: number, height: number, worldScale: number): WeatherMapData {
  const size = width * height;
  return {
    width,
    height,
    worldScale,
    coverage: new Float32Array(size),
    cloudType: new Float32Array(size),
    moisture: new Float32Array(size).fill(0.5),
    verticalDevelopment: new Float32Array(size),
    baseAltitude: new Float32Array(size).fill(DEFAULT_WEATHER_MAP_SETTINGS.defaultCloudBase),
    topAltitude: new Float32Array(size).fill(DEFAULT_WEATHER_MAP_SETTINGS.defaultCloudTop),
    windX: new Float32Array(size),
    windY: new Float32Array(size).fill(-1),
    windSpeed: new Float32Array(size).fill(5),
    turbulence: new Float32Array(size),
    fronts: [],
    moistureRegions: [],
    pressureSystems: [],
  };
}

function createFloatTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

export function createWeatherTextureManager(
  resolution: number = 256,
  worldExtent: number = 50000
): WeatherTextureManager {
  const data = createWeatherMapData(resolution, resolution, worldExtent / resolution);

  const textures: WeatherTextures = {
    coverageTexture: null,
    windTexture: null,
    altitudeTexture: null,
  };

  let isDirty = true;
  let dirtyRect: { x: number; y: number; width: number; height: number } | null = null;

  function worldToTexel(worldX: number, worldZ: number): { tx: number; ty: number } {
    const halfExtent = (data.width * data.worldScale) / 2;
    const tx = Math.floor(((worldX + halfExtent) / (halfExtent * 2)) * data.width);
    const ty = Math.floor(((worldZ + halfExtent) / (halfExtent * 2)) * data.height);
    return {
      tx: Math.max(0, Math.min(data.width - 1, tx)),
      ty: Math.max(0, Math.min(data.height - 1, ty))
    };
  }

  function texelToWorld(tx: number, ty: number): { worldX: number; worldZ: number } {
    const halfExtent = (data.width * data.worldScale) / 2;
    const worldX = (tx / data.width) * halfExtent * 2 - halfExtent;
    const worldZ = (ty / data.height) * halfExtent * 2 - halfExtent;
    return { worldX, worldZ };
  }

  function markDirty(x: number, y: number, radius: number) {
    isDirty = true;
    const r = Math.ceil(radius / data.worldScale);
    const newRect = {
      x: Math.max(0, x - r),
      y: Math.max(0, y - r),
      width: Math.min(data.width, x + r + 1) - Math.max(0, x - r),
      height: Math.min(data.height, y + r + 1) - Math.max(0, y - r),
    };

    if (dirtyRect) {
      const minX = Math.min(dirtyRect.x, newRect.x);
      const minY = Math.min(dirtyRect.y, newRect.y);
      const maxX = Math.max(dirtyRect.x + dirtyRect.width, newRect.x + newRect.width);
      const maxY = Math.max(dirtyRect.y + dirtyRect.height, newRect.y + newRect.height);
      dirtyRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    } else {
      dirtyRect = newRect;
    }
  }

  function applyBrush(
    array: Float32Array,
    cx: number,
    cy: number,
    value: number,
    radiusWorld: number,
    falloff: number,
    mode: 'set' | 'add' | 'max' = 'set'
  ) {
    const radiusTexels = Math.ceil(radiusWorld / data.worldScale);

    for (let dy = -radiusTexels; dy <= radiusTexels; dy++) {
      for (let dx = -radiusTexels; dx <= radiusTexels; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;

        if (tx < 0 || tx >= data.width || ty < 0 || ty >= data.height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy) / radiusTexels;
        if (dist > 1) continue;

        const strength = Math.pow(1 - dist, falloff);
        const idx = ty * data.width + tx;

        if (mode === 'set') {
          array[idx] = value * strength + array[idx] * (1 - strength);
        } else if (mode === 'add') {
          array[idx] = Math.min(1, array[idx] + value * strength);
        } else if (mode === 'max') {
          array[idx] = Math.max(array[idx], value * strength);
        }
      }
    }

    markDirty(cx, cy, radiusWorld);
  }

  function uploadToGPU(gl: WebGL2RenderingContext) {
    if (!isDirty) return;

    if (!textures.coverageTexture) {
      textures.coverageTexture = createFloatTexture(gl, data.width, data.height);
    }
    if (!textures.windTexture) {
      textures.windTexture = createFloatTexture(gl, data.width, data.height);
    }
    if (!textures.altitudeTexture) {
      textures.altitudeTexture = createFloatTexture(gl, data.width, data.height);
    }

    const coverageData = new Float32Array(data.width * data.height * 4);
    const windData = new Float32Array(data.width * data.height * 4);
    const altitudeData = new Float32Array(data.width * data.height * 4);

    for (let i = 0; i < data.width * data.height; i++) {
      const idx = i * 4;
      coverageData[idx] = data.coverage[i];
      coverageData[idx + 1] = data.cloudType[i] / 10;
      coverageData[idx + 2] = data.moisture[i];
      coverageData[idx + 3] = data.verticalDevelopment[i];

      windData[idx] = data.windX[i];
      windData[idx + 1] = data.windY[i];
      windData[idx + 2] = data.windSpeed[i] / 50;
      windData[idx + 3] = data.turbulence[i];

      altitudeData[idx] = data.baseAltitude[i] / 10000;
      altitudeData[idx + 1] = data.topAltitude[i] / 10000;
      altitudeData[idx + 2] = (data.topAltitude[i] - data.baseAltitude[i]) / 5000;
      altitudeData[idx + 3] = 1.0;
    }

    gl.bindTexture(gl.TEXTURE_2D, textures.coverageTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, data.width, data.height, gl.RGBA, gl.FLOAT, coverageData);

    gl.bindTexture(gl.TEXTURE_2D, textures.windTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, data.width, data.height, gl.RGBA, gl.FLOAT, windData);

    gl.bindTexture(gl.TEXTURE_2D, textures.altitudeTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, data.width, data.height, gl.RGBA, gl.FLOAT, altitudeData);

    gl.bindTexture(gl.TEXTURE_2D, null);

    isDirty = false;
    dirtyRect = null;
  }

  function setCoverage(x: number, y: number, value: number, radius: number, falloff: number) {
    const { tx, ty } = worldToTexel(x, y);
    applyBrush(data.coverage, tx, ty, value, radius, falloff, 'set');
  }

  function setCloudType(x: number, y: number, value: number, radius: number) {
    const { tx, ty } = worldToTexel(x, y);
    const radiusTexels = Math.ceil(radius / data.worldScale);

    for (let dy = -radiusTexels; dy <= radiusTexels; dy++) {
      for (let dx = -radiusTexels; dx <= radiusTexels; dx++) {
        const ttx = tx + dx;
        const tty = ty + dy;

        if (ttx < 0 || ttx >= data.width || tty < 0 || tty >= data.height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy) / radiusTexels;
        if (dist > 1) continue;

        const idx = tty * data.width + ttx;
        data.cloudType[idx] = value;
      }
    }

    markDirty(tx, ty, radius);
  }

  function setMoisture(x: number, y: number, value: number, radius: number, falloff: number) {
    const { tx, ty } = worldToTexel(x, y);
    applyBrush(data.moisture, tx, ty, value, radius, falloff, 'set');
  }

  function setWind(x: number, y: number, dirX: number, dirY: number, speed: number, radius: number) {
    const { tx, ty } = worldToTexel(x, y);
    const radiusTexels = Math.ceil(radius / data.worldScale);

    for (let dy = -radiusTexels; dy <= radiusTexels; dy++) {
      for (let dx = -radiusTexels; dx <= radiusTexels; dx++) {
        const ttx = tx + dx;
        const tty = ty + dy;

        if (ttx < 0 || ttx >= data.width || tty < 0 || tty >= data.height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy) / radiusTexels;
        if (dist > 1) continue;

        const strength = 1 - dist;
        const idx = tty * data.width + ttx;

        data.windX[idx] = dirX * strength + data.windX[idx] * (1 - strength);
        data.windY[idx] = dirY * strength + data.windY[idx] * (1 - strength);
        data.windSpeed[idx] = speed * strength + data.windSpeed[idx] * (1 - strength);
      }
    }

    markDirty(tx, ty, radius);
  }

  function setAltitude(x: number, y: number, base: number, top: number, radius: number, falloff: number) {
    const { tx, ty } = worldToTexel(x, y);
    applyBrush(data.baseAltitude, tx, ty, base, radius, falloff, 'set');
    applyBrush(data.topAltitude, tx, ty, top, radius, falloff, 'set');
  }

  function applyFront(front: WeatherFront) {
    if (front.points.length < 2) return;

    for (let i = 0; i < front.points.length - 1; i++) {
      const p1 = front.points[i];
      const p2 = front.points[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;

      const nx = -dy / len;
      const ny = dx / len;

      const steps = Math.ceil(len / (data.worldScale * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = p1.x + dx * t;
        const py = p1.y + dy * t;

        const frontWidth = front.width;

        if (front.type === 'cold') {
          for (let w = -frontWidth; w <= frontWidth * 2; w += data.worldScale) {
            const wx = px + nx * w;
            const wy = py + ny * w;
            const dist = Math.abs(w) / frontWidth;

            if (w < 0) {
              const coverage = front.strength * (1 - dist) * 0.9;
              setCoverage(wx, wy, coverage, data.worldScale * 3, 1.5);
              if (coverage > 0.5) {
                setCloudType(wx, wy, 9, data.worldScale * 3);
                const vd = front.strength * (1 - dist);
                applyBrush(data.verticalDevelopment,
                  Math.floor((wx + data.width * data.worldScale / 2) / data.worldScale),
                  Math.floor((wy + data.height * data.worldScale / 2) / data.worldScale),
                  vd, data.worldScale * 3, 1.5, 'max');
              }
            } else {
              const coverage = front.strength * 0.3 * Math.exp(-w / (frontWidth * 1.5));
              setCoverage(wx, wy, coverage, data.worldScale * 3, 2);
              setCloudType(wx, wy, 1, data.worldScale * 3);
            }
          }

          setMoisture(px + nx * frontWidth * 0.5, py + ny * frontWidth * 0.5,
            0.8 * front.strength, frontWidth * 1.5, 2);

        } else if (front.type === 'warm') {
          for (let w = -frontWidth * 3; w <= frontWidth; w += data.worldScale) {
            const wx = px + nx * w;
            const wy = py + ny * w;

            if (w < -frontWidth * 2) {
              const coverage = front.strength * 0.4 * (1 - (Math.abs(w) - frontWidth * 2) / frontWidth);
              setCoverage(wx, wy, coverage, data.worldScale * 3, 2);
              setCloudType(wx, wy, 6, data.worldScale * 3);
              setAltitude(wx, wy, 6000, 9000, data.worldScale * 3, 2);
            } else if (w < -frontWidth) {
              const coverage = front.strength * 0.6;
              setCoverage(wx, wy, coverage, data.worldScale * 3, 2);
              setCloudType(wx, wy, 4, data.worldScale * 3);
              setAltitude(wx, wy, 3000, 6000, data.worldScale * 3, 2);
            } else if (w < 0) {
              const coverage = front.strength * 0.8;
              setCoverage(wx, wy, coverage, data.worldScale * 3, 2);
              setCloudType(wx, wy, 2, data.worldScale * 3);
              setAltitude(wx, wy, 500, 2500, data.worldScale * 3, 2);
            }
          }

          setMoisture(px - nx * frontWidth, py - ny * frontWidth,
            0.9 * front.strength, frontWidth * 2, 2);

        } else if (front.type === 'occluded') {
          for (let w = -frontWidth * 2; w <= frontWidth * 2; w += data.worldScale) {
            const wx = px + nx * w;
            const wy = py + ny * w;
            const dist = Math.abs(w) / frontWidth;

            const coverage = front.strength * Math.exp(-dist * dist);
            setCoverage(wx, wy, coverage, data.worldScale * 3, 1.5);

            if (Math.abs(w) < frontWidth * 0.5) {
              setCloudType(wx, wy, 9, data.worldScale * 3);
              applyBrush(data.verticalDevelopment,
                Math.floor((wx + data.width * data.worldScale / 2) / data.worldScale),
                Math.floor((wy + data.height * data.worldScale / 2) / data.worldScale),
                front.strength * 0.8, data.worldScale * 3, 1.5, 'max');
            } else if (w < 0) {
              setCloudType(wx, wy, 4, data.worldScale * 3);
            } else {
              setCloudType(wx, wy, 2, data.worldScale * 3);
            }
          }

          setMoisture(px, py, 0.95 * front.strength, frontWidth * 1.5, 1.5);

        } else if (front.type === 'stationary') {
          for (let w = -frontWidth; w <= frontWidth; w += data.worldScale) {
            const wx = px + nx * w;
            const wy = py + ny * w;
            const dist = Math.abs(w) / frontWidth;

            const coverage = front.strength * 0.5 * (1 - dist * 0.5);
            setCoverage(wx, wy, coverage, data.worldScale * 3, 2);
            setCloudType(wx, wy, 3, data.worldScale * 3);
          }

          setMoisture(px, py, 0.7 * front.strength, frontWidth, 2);
        }
      }
    }

    if (!data.fronts.find(f => f.id === front.id)) {
      data.fronts.push(front);
    }
  }

  function applyPressureSystem(system: PressureSystem) {
    const steps = 36;
    const { tx: cx, ty: cy } = worldToTexel(system.center.x, system.center.y);

    if (system.type === 'high') {
      for (let r = 0; r <= system.radius; r += data.worldScale * 2) {
        const coverage = 0.1 * (r / system.radius) * system.intensity;

        for (let a = 0; a < steps; a++) {
          const angle = (a / steps) * Math.PI * 2;
          const x = system.center.x + Math.cos(angle) * r;
          const y = system.center.y + Math.sin(angle) * r;

          setCoverage(x, y, coverage, data.worldScale * 3, 2);

          const windAngle = angle + Math.PI / 2 * system.rotation;
          const windSpeed = (r / system.radius) * 15 * system.intensity;
          setWind(x, y, Math.cos(windAngle), Math.sin(windAngle), windSpeed, data.worldScale * 3);
        }
      }

      const outerR = system.radius * 0.8;
      for (let a = 0; a < steps; a++) {
        const angle = (a / steps) * Math.PI * 2;
        const x = system.center.x + Math.cos(angle) * outerR;
        const y = system.center.y + Math.sin(angle) * outerR;
        setCoverage(x, y, 0.3 * system.intensity, data.worldScale * 4, 2);
        setCloudType(x, y, 6, data.worldScale * 4);
      }

    } else {
      for (let r = system.radius; r >= 0; r -= data.worldScale * 2) {
        const normalized = 1 - (r / system.radius);
        const coverage = (0.3 + normalized * 0.6) * system.intensity;

        for (let a = 0; a < steps; a++) {
          const angle = (a / steps) * Math.PI * 2;
          const spiralAngle = angle + normalized * Math.PI * 2 * system.rotation;
          const x = system.center.x + Math.cos(spiralAngle) * r;
          const y = system.center.y + Math.sin(spiralAngle) * r;

          setCoverage(x, y, coverage, data.worldScale * 3, 1.5);
          setMoisture(x, y, 0.5 + normalized * 0.4, data.worldScale * 3, 1.5);

          if (normalized > 0.7) {
            setCloudType(x, y, 9, data.worldScale * 3);
            applyBrush(data.verticalDevelopment,
              Math.floor((x + data.width * data.worldScale / 2) / data.worldScale),
              Math.floor((y + data.height * data.worldScale / 2) / data.worldScale),
              normalized * system.intensity, data.worldScale * 3, 1.5, 'max');
          } else if (normalized > 0.4) {
            setCloudType(x, y, 3, data.worldScale * 3);
          } else {
            setCloudType(x, y, 2, data.worldScale * 3);
          }

          const windAngle = spiralAngle - Math.PI / 2 * system.rotation + Math.PI / 6;
          const windSpeed = (10 + normalized * 30) * system.intensity;
          setWind(x, y, Math.cos(windAngle), Math.sin(windAngle), windSpeed, data.worldScale * 3);
        }
      }
    }

    if (!data.pressureSystems.find(p => p.id === system.id)) {
      data.pressureSystems.push(system);
    }
  }

  function clear() {
    data.coverage.fill(0);
    data.cloudType.fill(0);
    data.moisture.fill(0.5);
    data.verticalDevelopment.fill(0);
    data.baseAltitude.fill(DEFAULT_WEATHER_MAP_SETTINGS.defaultCloudBase);
    data.topAltitude.fill(DEFAULT_WEATHER_MAP_SETTINGS.defaultCloudTop);
    data.windX.fill(0);
    data.windY.fill(-1);
    data.windSpeed.fill(5);
    data.turbulence.fill(0);
    data.fronts = [];
    data.moistureRegions = [];
    data.pressureSystems = [];
    isDirty = true;
    dirtyRect = null;
  }

  function getDataAtPosition(worldX: number, worldZ: number) {
    const { tx, ty } = worldToTexel(worldX, worldZ);
    const idx = ty * data.width + tx;

    return {
      coverage: data.coverage[idx],
      cloudType: data.cloudType[idx],
      moisture: data.moisture[idx],
      baseAltitude: data.baseAltitude[idx],
      topAltitude: data.topAltitude[idx],
      windX: data.windX[idx],
      windY: data.windY[idx],
      windSpeed: data.windSpeed[idx],
    };
  }

  function dispose(gl: WebGL2RenderingContext) {
    if (textures.coverageTexture) gl.deleteTexture(textures.coverageTexture);
    if (textures.windTexture) gl.deleteTexture(textures.windTexture);
    if (textures.altitudeTexture) gl.deleteTexture(textures.altitudeTexture);
    textures.coverageTexture = null;
    textures.windTexture = null;
    textures.altitudeTexture = null;
  }

  return {
    textures,
    data,
    get isDirty() { return isDirty; },
    get dirtyRect() { return dirtyRect; },
    uploadToGPU,
    setCoverage,
    setCloudType,
    setMoisture,
    setWind,
    setAltitude,
    applyFront,
    applyPressureSystem,
    clear,
    getDataAtPosition,
    dispose,
  };
}

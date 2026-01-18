import { useRef, useEffect, useCallback, useState } from 'react';

export interface CloudSettings {
  // Render
  scale: number;
  timeScale: number;
  fast: boolean;
  fastWhileDrag: boolean;
  taa: boolean;
  reproject: boolean;
  taaDuringDrag: boolean;
  taaAlpha: number;
  taaUseDragAlpha: boolean;
  taaAlphaDrag: number;
  debugDepth: boolean;

  // Lighting
  lighting: 'night' | 'day';
  lightAzimuthDeg: number;
  lightHeight: number;
  lightColor: string;
  lightPower: number;
  exposure: number;
  stars: number;
  nightSkyColor: string;
  daySkyZenithColor: string;
  daySkyHorizonColor: string;
  sunDiskIntensity: number;
  sunGlowIntensity: number;
  celestialDistance: number;
  celestialSize: number;

  // Godrays
  godrays: boolean;
  godraysDuringDrag: boolean;
  godraysSamples: number;
  godraysDensity: number;
  godraysDecay: number;
  godraysWeight: number;
  godraysIntensity: number;
  godraysRadiusScale: number;

  // Clouds - Shape
  shapeSpeed: number;
  detailSpeed: number;
  densityMultiplier: number;
  shapeStrength: number;
  detailStrength: number;
  cloudBase01: number;
  cloudThickness01: number;
  cloudBottomFade01: number;
  cloudTopFade01: number;
  cloudEdgeFade01: number;
  
  // Clouds - Advanced dynamics
  cloudCoverage: number;
  cloudType: number;
  windSpeed: number;
  windDirection: number;
  turbulence: number;
  precipitation: number;

  // Terrain
  terrainEnabled: boolean;
  terrainScale: number;
  terrainHeight: number;
  terrainDetail: number;
  waterLevel: number;
  snowLevel: number;
  rockColor: string;
  grassColor: string;
  snowColor: string;
  waterColor: string;

  // Camera
  cameraMode: 'orbit' | 'fly' | 'jet';
  fovDeg: number;
  flightSpeed: number;
  flightBoost: number;
  flightDamping: number;
  flightBank: boolean;
  flightBankStrength: number;
}

export const DEFAULT_SETTINGS: CloudSettings = {
  scale: 1,
  timeScale: 1,
  fast: false,
  fastWhileDrag: true,
  taa: true,
  reproject: true,
  debugDepth: false,
  taaDuringDrag: true,
  taaAlpha: 0.12,
  taaUseDragAlpha: true,
  taaAlphaDrag: 0.28,

  lighting: 'day',
  lightAzimuthDeg: 45,
  lightHeight: 0.5,
  lightColor: '#fff8e0',
  lightPower: 120,
  exposure: 0.7,
  stars: 0,
  nightSkyColor: '#08111a',
  daySkyZenithColor: '#3a7bd5',
  daySkyHorizonColor: '#d8f0ff',
  sunDiskIntensity: 1.6,
  sunGlowIntensity: 1.0,
  celestialDistance: 100,
  celestialSize: 8,

  // God rays enabled by default for dramatic effect
  godrays: true,
  godraysDuringDrag: false,
  godraysSamples: 64,
  godraysDensity: 0.95,
  godraysDecay: 0.965,
  godraysWeight: 0.03,
  godraysIntensity: 1.2,
  godraysRadiusScale: 1.0,

  // Cloud shape
  shapeSpeed: -5,
  detailSpeed: -10,
  densityMultiplier: 0.075,
  shapeStrength: 0.7,
  detailStrength: 0.2,
  cloudBase01: 0.0,
  cloudThickness01: 1.0,
  cloudBottomFade01: 0.08,
  cloudTopFade01: 0.12,
  cloudEdgeFade01: 0.10,
  
  // Cloud dynamics
  cloudCoverage: 0.5,
  cloudType: 0.5,
  windSpeed: 10,
  windDirection: 45,
  turbulence: 0.3,
  precipitation: 0,

  // Terrain
  terrainEnabled: true,
  terrainScale: 1.0,
  terrainHeight: 1.0,
  terrainDetail: 12,
  waterLevel: 0.15,
  snowLevel: 0.7,
  rockColor: '#6b5b4f',
  grassColor: '#3d6b2f',
  snowColor: '#f0f5ff',
  waterColor: '#1a4f6e',

  cameraMode: 'jet',
  fovDeg: 60,
  flightSpeed: 60,
  flightBoost: 2.5,
  flightDamping: 1.5,
  flightBank: true,
  flightBankStrength: 0.6,
};

const BLUE_NOISE_SIZE = 1024;
const CLOUD_EXTENT = 1000.0;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function normalize3(v: number[]): number[] {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 1e-8 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

function cross3(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function add3(a: number[], b: number[]): number[] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(v: number[], s: number): number[] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function rotateAroundAxis(v: number[], axis: number[], angle: number): number[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const x = axis[0], y = axis[1], z = axis[2];
  return [
    (t * x * x + c) * v[0] + (t * x * y - s * z) * v[1] + (t * x * z + s * y) * v[2],
    (t * x * y + s * z) * v[0] + (t * y * y + c) * v[1] + (t * y * z - s * x) * v[2],
    (t * x * z - s * y) * v[0] + (t * y * z + s * x) * v[1] + (t * z * z + c) * v[2],
  ];
}

function computeTargetDirFromAngles(x: number, y: number): number[] {
  return [Math.sin(x), y, -Math.cos(x)];
}

export function useCloudRenderer(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [isReady, setIsReady] = useState(false);
  const [fps, setFps] = useState(0);
  const settingsRef = useRef<CloudSettings>({ ...DEFAULT_SETTINGS });
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const animationRef = useRef<number>(0);
  const stateRef = useRef({
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    keys: {} as Record<string, boolean>,
  });

  const cameraAnglesRef = useRef({
    x: 0.1,
    y: 0.07,
    prevMouseNormX: 0,
    prevMouseNormY: 0,
    prevDown: false,
  });

  const flightStateRef = useRef({
    pos: [-CLOUD_EXTENT * 0.4, 0.7 * CLOUD_EXTENT, CLOUD_EXTENT * 0.4],
    vel: [0, 0, 0],
  });

  const flightAnglesRef = useRef({
    x: 0.1,
    y: 0.07,
    roll: 0,
  });
  
  // Extended flight data for HUD
  const flightDataRef = useRef({
    airspeed: 0,
    altitude: 700,
    heading: 0,
    pitch: 0,
    roll: 0,
    throttle: 0.5,
    gForce: 1.0,
  });

  const isPointerLockedRef = useRef(false);
  const flyLookRef = useRef({ dx: 0, dy: 0 });

  const buffersRef = useRef<{
    vao: WebGLVertexArrayObject | null;
    passA: any;
    passB: any;
    passImage: any;
    passImageFast: any;
    passAccum: any;
    passBlit: any;
    passGodrays: any;
    bufferA: any;
    bufferB: any;
    history: any;
    depth: any;
    currentColorTex: WebGLTexture | null;
    currentColorFbo: WebGLFramebuffer | null;
    blueNoise: WebGLTexture | null;
    rtWidth: number;
    rtHeight: number;
  }>({
    vao: null,
    passA: null,
    passB: null,
    passImage: null,
    passImageFast: null,
    passAccum: null,
    passBlit: null,
    passGodrays: null,
    bufferA: null,
    bufferB: null,
    history: null,
    depth: null,
    currentColorTex: null,
    currentColorFbo: null,
    blueNoise: null,
    rtWidth: 0,
    rtHeight: 0,
  });

  const frameRef = useRef(0);
  const simTimeRef = useRef(0);
  const lastNowRef = useRef(performance.now());
  const needsHistoryResetRef = useRef(false);
  const needsBufferBRebuildRef = useRef(true);
  const cameraPosRef = useRef([-CLOUD_EXTENT * 0.4, 0.7 * CLOUD_EXTENT, CLOUD_EXTENT * 0.4]);
  const cameraTargetDirRef = useRef([Math.sin(0.1), 0.07, -Math.cos(0.1)]);
  const cameraUpRef = useRef([0, 1, 0]);
  const prevMouseDownRef = useRef(false);

  const updateSettings = useCallback((newSettings: Partial<CloudSettings>) => {
    const prev = settingsRef.current;
    settingsRef.current = { ...prev, ...newSettings };
    
    const s = settingsRef.current;
    if (prev.cameraMode !== s.cameraMode) {
      needsHistoryResetRef.current = true;
    }
    if (prev.taa !== s.taa || prev.reproject !== s.reproject || prev.fovDeg !== s.fovDeg) {
      needsHistoryResetRef.current = true;
    }
    if (prev.lighting !== s.lighting || prev.lightAzimuthDeg !== s.lightAzimuthDeg ||
        prev.densityMultiplier !== s.densityMultiplier || prev.shapeStrength !== s.shapeStrength ||
        prev.detailStrength !== s.detailStrength) {
      needsHistoryResetRef.current = true;
    }
  }, []);

  const resetHistory = useCallback(() => {
    needsHistoryResetRef.current = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;

    async function loadShader(url: string): Promise<string> {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load shader: ${url}`);
      return response.text();
    }

    function wrapShadertoyFragment(source: string, defineFast = false) {
      const fastDefine = defineFast ? '\n#define FAST\n' : '\n';
      return `#version 300 es
precision highp float;
precision highp int;

uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform float iFrameRate;
uniform int iFrame;
uniform vec4 iMouse;
uniform vec4 iDate;
uniform float iSampleRate;

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform vec3 iChannelResolution[4];

uniform vec3 uHarnessCameraPos;
uniform vec3 uHarnessTargetDir;
uniform vec3 uHarnessCameraUp;
uniform float uHarnessFovDeg;
${fastDefine}
out vec4 outColor;

${source}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  outColor = color;
}
`;
    }

    function wrapShadertoyFragmentWithAux(source: string, defineFast = false) {
      const fastDefine = defineFast ? '\n#define FAST\n' : '\n';
      return `#version 300 es
precision highp float;
precision highp int;

uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform float iFrameRate;
uniform int iFrame;
uniform vec4 iMouse;
uniform vec4 iDate;
uniform float iSampleRate;

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform vec3 iChannelResolution[4];

uniform vec3 uHarnessCameraPos;
uniform vec3 uHarnessTargetDir;
uniform vec3 uHarnessCameraUp;
uniform float uHarnessFovDeg;
${fastDefine}
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outAux;

float gHarnessDepth = 0.0;

${source}

void main() {
  vec4 color = vec4(0.0);
  gHarnessDepth = 0.0;
  mainImage(color, gl_FragCoord.xy);
  outColor = color;
  outAux = vec4(gHarnessDepth, 0.0, 0.0, 1.0);
}
`;
    }

    function patchImageShader(source: string): string {
      return source
        .replace('vec3 rayDir = rayDirection(55.0, fragCoord);', 'vec3 rayDir = rayDirection(uHarnessFovDeg, fragCoord);')
        .replace('vec3 cameraPos = vec3(-CLOUD_EXTENT * 0.4, cloudEnd * 0.7, CLOUD_EXTENT * 0.4);', 'vec3 cameraPos = uHarnessCameraPos;')
        .replace('vec3 targetDir = texelFetch(iChannel0, ivec2(0.5, 1.5), 0).xyz;', 'vec3 targetDir = uHarnessTargetDir;')
        .replace('vec3 up = vec3(0.0, 1.0, 0.0);', 'vec3 up = uHarnessCameraUp;');
    }

    function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compilation error: ${info}`);
      }
      return shader;
    }

    function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
      const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Program link error: ${info}`);
      }
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return program;
    }

    function getUniformLocations(gl: WebGL2RenderingContext, program: WebGLProgram, names: string[]) {
      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      for (const name of names) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      return uniforms;
    }

    function getShadertoyUniformLocations(gl: WebGL2RenderingContext, program: WebGLProgram) {
      return {
        iResolution: gl.getUniformLocation(program, 'iResolution'),
        iTime: gl.getUniformLocation(program, 'iTime'),
        iTimeDelta: gl.getUniformLocation(program, 'iTimeDelta'),
        iFrameRate: gl.getUniformLocation(program, 'iFrameRate'),
        iFrame: gl.getUniformLocation(program, 'iFrame'),
        iMouse: gl.getUniformLocation(program, 'iMouse'),
        iDate: gl.getUniformLocation(program, 'iDate'),
        iSampleRate: gl.getUniformLocation(program, 'iSampleRate'),
        iChannel0: gl.getUniformLocation(program, 'iChannel0'),
        iChannel1: gl.getUniformLocation(program, 'iChannel1'),
        iChannel2: gl.getUniformLocation(program, 'iChannel2'),
        iChannel3: gl.getUniformLocation(program, 'iChannel3'),
        iChannelResolution0: gl.getUniformLocation(program, 'iChannelResolution[0]'),
      };
    }

    function createTexture(gl: WebGL2RenderingContext, width: number, height: number, internalFormat: number, format: number, type: number, data: ArrayBufferView | null = null) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return tex;
    }

    function createFramebuffer(gl: WebGL2RenderingContext, tex: WebGLTexture) {
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return fb;
    }

    function createFramebufferMrt(gl: WebGL2RenderingContext, colorTex: WebGLTexture, auxTex: WebGLTexture) {
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, auxTex, 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return fb;
    }

    function createDoubleBufferedTexture(gl: WebGL2RenderingContext, width: number, height: number, internalFormat: number, format: number, type: number) {
      const buffer = {
        readTex: createTexture(gl, width, height, internalFormat, format, type),
        writeTex: createTexture(gl, width, height, internalFormat, format, type),
        readFbo: null as WebGLFramebuffer | null,
        writeFbo: null as WebGLFramebuffer | null,
        swap() {
          const tempTex = this.readTex;
          this.readTex = this.writeTex;
          this.writeTex = tempTex;
          const tempFbo = this.readFbo;
          this.readFbo = this.writeFbo;
          this.writeFbo = tempFbo;
        },
      };
      buffer.readFbo = createFramebuffer(gl, buffer.readTex);
      buffer.writeFbo = createFramebuffer(gl, buffer.writeTex);
      return buffer;
    }

    function createBlueNoise(gl: WebGL2RenderingContext) {
      const size = BLUE_NOISE_SIZE;
      const data = new Uint8Array(size * size);
      const fract = (x: number) => x - Math.floor(x);
      const a = 0.06711056;
      const b = 0.00583715;
      const c = 52.9829189;
      let idx = 0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = fract(c * fract(x * a + y * b));
          data[idx++] = Math.min(255, Math.max(0, Math.floor(v * 256)));
        }
      }
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, size, size, 0, gl.RED, gl.UNSIGNED_BYTE, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return tex;
    }

    const vertexShaderSource = `#version 300 es
layout(location = 0) in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

    async function init() {
      const gl = canvas.getContext('webgl2');
      if (!gl) throw new Error('WebGL2 not supported');

      gl.getExtension('EXT_color_buffer_float');
      glRef.current = gl;

      // Create VAO
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      // Load shaders
      const [bufferARaw, bufferBRaw, imageRaw, accumSource, godraysSource] = await Promise.all([
        loadShader('/shaders/bufferA.glsl'),
        loadShader('/shaders/bufferB.glsl'),
        loadShader('/shaders/image.glsl'),
        loadShader('/shaders/accum.glsl'),
        loadShader('/shaders/godrays.glsl'),
      ]);

      const bufferASource = wrapShadertoyFragment(bufferARaw);
      const bufferBSource = wrapShadertoyFragment(bufferBRaw);
      const imagePatched = patchImageShader(imageRaw);
      const imageSource = wrapShadertoyFragmentWithAux(imagePatched);
      const imageFastSource = wrapShadertoyFragmentWithAux(imagePatched, true);

      // Create programs
      const passAProgram = createProgram(gl, vertexShaderSource, bufferASource);
      const passA = {
        program: passAProgram,
        uniforms: getShadertoyUniformLocations(gl, passAProgram),
      };

      const passBProgram = createProgram(gl, vertexShaderSource, bufferBSource);
      const passB = {
        program: passBProgram,
        uniforms: getShadertoyUniformLocations(gl, passBProgram),
      };

      const imageUniformNames = [
        'uLightingMode', 'uLightAzimuth', 'uLightHeight', 'uLightColor', 'uLightPower',
        'uExposure', 'uStars', 'uNightSkyColor', 'uDaySkyZenithColor', 'uDaySkyHorizonColor',
        'uSunDiskIntensity', 'uSunGlowIntensity', 'uCelestialDistance', 'uCelestialSize',
        'uHarnessCameraPos', 'uHarnessTargetDir', 'uHarnessCameraUp', 'uHarnessFovDeg',
        'uCloudShapeSpeed', 'uCloudDetailSpeed', 'uCloudDensity', 'uCloudShapeStrength',
        'uCloudDetailStrength', 'uCloudBase01', 'uCloudThickness01', 'uCloudBottomFade01',
        'uCloudTopFade01', 'uCloudEdgeFade01',
        // Terrain uniforms
        'uTerrainEnabled', 'uTerrainScale', 'uTerrainHeight', 'uTerrainDetail',
        'uWaterLevel', 'uSnowLevel', 'uRockColor', 'uGrassColor', 'uSnowColor', 'uWaterColor',
      ];

      const passImageProgram = createProgram(gl, vertexShaderSource, imageSource);
      const passImage = {
        program: passImageProgram,
        uniforms: getShadertoyUniformLocations(gl, passImageProgram),
        imageUniforms: getUniformLocations(gl, passImageProgram, imageUniformNames),
      };

      const passImageFastProgram = createProgram(gl, vertexShaderSource, imageFastSource);
      const passImageFast = {
        program: passImageFastProgram,
        uniforms: getShadertoyUniformLocations(gl, passImageFastProgram),
        imageUniforms: getUniformLocations(gl, passImageFastProgram, imageUniformNames),
      };

      const passAccumProgram = createProgram(gl, vertexShaderSource, accumSource);
      const passAccum = {
        program: passAccumProgram,
        uniforms: getUniformLocations(gl, passAccumProgram, [
          'uResolution', 'uAlpha', 'uReset', 'uUseReprojection',
          'uCameraPosCur', 'uCameraPosPrev', 'uCameraUpCur', 'uCameraUpPrev',
          'uTargetDirCur', 'uTargetDirPrev', 'uFovDeg', 'uCurrent', 'uHistory',
          'uCurrentDepth', 'uPrevDepth',
        ]),
      };

      const blitSource = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTex;
out vec4 outColor;
void main() {
  outColor = texture(uTex, gl_FragCoord.xy / uResolution);
}`;

      const passBlitProgram = createProgram(gl, vertexShaderSource, blitSource);
      const passBlit = {
        program: passBlitProgram,
        uniforms: getUniformLocations(gl, passBlitProgram, ['uResolution', 'uTex']),
      };

      const passGodraysProgram = createProgram(gl, vertexShaderSource, godraysSource);
      const passGodrays = {
        program: passGodraysProgram,
        uniforms: getUniformLocations(gl, passGodraysProgram, [
          'uResolution', 'uLightUv', 'uLightColor', 'uIntensity', 'uDensity',
          'uDecay', 'uWeight', 'uSamples', 'uSourceRadius', 'uScene',
        ]),
      };

      const blueNoise = createBlueNoise(gl);

      buffersRef.current = {
        vao,
        passA,
        passB,
        passImage,
        passImageFast,
        passAccum,
        passBlit,
        passGodrays,
        bufferA: null,
        bufferB: null,
        history: null,
        depth: null,
        currentColorTex: null,
        currentColorFbo: null,
        blueNoise,
        rtWidth: 0,
        rtHeight: 0,
      };

      resizeRenderTargets();
      setIsReady(true);
      lastNowRef.current = performance.now();
      tick();
    }

    function resizeRenderTargets() {
      const gl = glRef.current;
      if (!gl || !canvas) return;

      const settings = settingsRef.current;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      // Ensure we have valid dimensions - fallback to reasonable defaults if canvas isn't laid out yet
      const clientWidth = canvas.clientWidth || window.innerWidth || 800;
      const clientHeight = canvas.clientHeight || window.innerHeight || 600;
      const rtWidth = Math.max(1, Math.floor(clientWidth * settings.scale * dpr));
      const rtHeight = Math.max(1, Math.floor(clientHeight * settings.scale * dpr));
      canvas.width = rtWidth;
      canvas.height = rtHeight;

      const internalFormat = gl.RGBA16F;
      const format = gl.RGBA;
      const type = gl.HALF_FLOAT;

      const bufferA = createDoubleBufferedTexture(gl, 1, 4, internalFormat, format, type);
      const bufferB = createDoubleBufferedTexture(gl, rtWidth, rtHeight, internalFormat, format, type);
      const history = createDoubleBufferedTexture(gl, rtWidth, rtHeight, internalFormat, format, type);
      const depth = createDoubleBufferedTexture(gl, rtWidth, rtHeight, internalFormat, format, type);

      for (const tex of [depth.readTex, depth.writeTex]) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      }
      gl.bindTexture(gl.TEXTURE_2D, null);

      const currentColorTex = createTexture(gl, rtWidth, rtHeight, internalFormat, format, type);
      const currentColorFbo = createFramebufferMrt(gl, currentColorTex, depth.writeTex);

      buffersRef.current.bufferA = bufferA;
      buffersRef.current.bufferB = bufferB;
      buffersRef.current.history = history;
      buffersRef.current.depth = depth;
      buffersRef.current.currentColorTex = currentColorTex;
      buffersRef.current.currentColorFbo = currentColorFbo;
      buffersRef.current.rtWidth = rtWidth;
      buffersRef.current.rtHeight = rtHeight;
      needsBufferBRebuildRef.current = true;
    }

    function computeLightUv(targetDir: number[], up: number[], settings: CloudSettings, rtWidth: number, rtHeight: number): { uv: number[], fade: number } | null {
      if (rtWidth <= 0 || rtHeight <= 0) return null;

      const upN = normalize3(up);
      const zaxis = normalize3(targetDir);
      const xaxis = normalize3(cross3(zaxis, upN));
      const yaxis = cross3(xaxis, zaxis);

      const azimuthRad = (settings.lightAzimuthDeg * Math.PI) / 180;
      const lightDirWorld = normalize3([Math.cos(azimuthRad), settings.lightHeight, Math.sin(azimuthRad)]);

      const camX = dot3(lightDirWorld, xaxis);
      const camY = dot3(lightDirWorld, yaxis);
      const camZ = dot3(lightDirWorld, [-zaxis[0], -zaxis[1], -zaxis[2]]);

      // Smooth angular fade with forgiveness zone past 90°
      const front = -camZ;
      const t = clamp((front + 0.10) / 0.35, 0.0, 1.0);
      const fade = t * t * (3.0 - 2.0 * t); // smoothstep

      const z = (0.5 * rtHeight) / Math.tan(((settings.fovDeg * Math.PI) / 180) * 0.5);

      let uvRaw: number[];
      if (camZ < -1e-4) {
        const k = (-z) / camZ;
        const px = camX * k + rtWidth / 2;
        const py = camY * k + rtHeight / 2;
        uvRaw = [px / rtWidth, py / rtHeight];
      } else {
        const len = Math.hypot(camX, camY);
        const dirx = len > 1e-6 ? camX / len : 0.0;
        const diry = len > 1e-6 ? camY / len : 0.0;
        uvRaw = [0.5 + dirx * 2.0, 0.5 + diry * 2.0];
      }

      const uv = [clamp(uvRaw[0], -0.5, 1.5), clamp(uvRaw[1], -0.5, 1.5)];
      return { uv, fade };
    }

    function tick() {
      if (destroyed) return;
      
      const gl = glRef.current;
      const canvas = canvasRef.current;
      if (!gl || !canvas) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      const b = buffersRef.current;
      if (!b.bufferA || !b.vao) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const rawDt = (now - lastNowRef.current) / 1000;
      lastNowRef.current = now;
      const simTimeDelta = Math.max(0, Math.min(0.1, rawDt || 0));
      const simFrameRate = simTimeDelta > 1e-6 ? 1 / simTimeDelta : 60;
      setFps(simFrameRate);
      
      const settings = settingsRef.current;
      simTimeRef.current += simTimeDelta * settings.timeScale;
      const time = simTimeRef.current;
      const frame = frameRef.current;

      const state = stateRef.current;
      const { rtWidth, rtHeight } = b;

      const prevCameraPos = [...cameraPosRef.current];
      const prevCameraTargetDir = [...cameraTargetDirRef.current];
      const prevCameraUp = [...cameraUpRef.current];

      let curTargetDir: number[];
      let isInteracting = false;
      let useReprojectionThisFrame = settings.reproject;

      // Camera update
      if (settings.cameraMode === 'orbit') {
        const cameraAngles = cameraAnglesRef.current;
        const mx = state.mouseX / rtWidth;
        const my = state.mouseY / rtHeight;
        const prevAngles = { x: cameraAngles.x, y: cameraAngles.y };

        if (state.mouseDown && cameraAngles.prevDown) {
          const dx = mx - cameraAngles.prevMouseNormX;
          const dy = my - cameraAngles.prevMouseNormY;
          cameraAngles.x += dx * 3.5;
          cameraAngles.y += dy * 2.5;
        }
        cameraAngles.prevMouseNormX = mx;
        cameraAngles.prevMouseNormY = my;
        cameraAngles.prevDown = state.mouseDown;
        cameraAngles.x = ((cameraAngles.x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        cameraAngles.y = Math.max(-0.999, Math.min(0.999, cameraAngles.y));

        curTargetDir = computeTargetDirFromAngles(cameraAngles.x, cameraAngles.y);
        cameraPosRef.current = [-CLOUD_EXTENT * 0.4, 0.7 * CLOUD_EXTENT, CLOUD_EXTENT * 0.4];
        cameraTargetDirRef.current = curTargetDir;
        cameraUpRef.current = [0, 1, 0];
        isInteracting = state.mouseDown;
      } else {
        // Fly mode
        const dt = simTimeDelta;
        const lookDx = flyLookRef.current.dx;
        const lookDy = flyLookRef.current.dy;
        flyLookRef.current.dx = 0;
        flyLookRef.current.dy = 0;

        const clientW = canvas.clientWidth || rtWidth || 1;
        const clientH = canvas.clientHeight || rtHeight || 1;
        const dxNorm = lookDx / clientW;
        const dyNorm = lookDy / clientH;

        const flightAngles = flightAnglesRef.current;
        const flightState = flightStateRef.current;

        if (isPointerLockedRef.current) {
          flightAngles.x += 3.5 * dxNorm;
          flightAngles.y += 2.5 * (-dyNorm);
        }

        flightAngles.x = ((flightAngles.x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        flightAngles.y = Math.max(-0.999, Math.min(0.999, flightAngles.y));

        const forward = normalize3(computeTargetDirFromAngles(flightAngles.x, flightAngles.y));
        const worldUp = [0, 1, 0];
        let right = normalize3(cross3(forward, worldUp));
        if (Math.hypot(right[0], right[1], right[2]) < 1e-6) right = [1, 0, 0];
        let upNoRoll = normalize3(cross3(right, forward));

        if (settings.flightBank) {
          const maxRoll = 1.2; // Increased max roll for more dramatic banking
          const speed = Math.hypot(flightState.vel[0], flightState.vel[1], flightState.vel[2]);
          const speedFactor = Math.min(1.0, speed / settings.flightSpeed); // Scale with speed
          
          // FIXED: Removed negative sign - turning right (positive dxNorm) should bank right (positive roll)
          // Also made banking proportional to speed - faster = more bank
          const rollTarget = clamp(dxNorm * 3.5 * 12.0 * settings.flightBankStrength * speedFactor, -maxRoll, maxRoll);
          const k = 1 - Math.exp(-6.0 * dt); // Slightly slower response for smoother feel
          flightAngles.roll = flightAngles.roll + (rollTarget - flightAngles.roll) * k;
        } else {
          const k = 1 - Math.exp(-8.0 * dt);
          flightAngles.roll = flightAngles.roll + (0 - flightAngles.roll) * k;
        }

        let up: number[];
        if (Math.abs(flightAngles.roll) > 1e-4) {
          up = normalize3(rotateAroundAxis(upNoRoll, forward, flightAngles.roll));
        } else {
          up = upNoRoll;
        }
        right = normalize3(cross3(forward, up));
        up = normalize3(cross3(right, forward));

        const key = (k: string) => !!state.keys[k];
        const forwardInput = (key('w') ? 1 : 0) - (key('s') ? 1 : 0);
        const rightInput = (key('d') ? 1 : 0) - (key('a') ? 1 : 0);
        const upInput = (key('e') ? 1 : 0) - (key('q') ? 1 : 0);

        let moveDir = [0, 0, 0];
        if (forwardInput) moveDir = add3(moveDir, scale3(forward, forwardInput));
        if (rightInput) moveDir = add3(moveDir, scale3(right, rightInput));
        if (upInput) moveDir = add3(moveDir, scale3(worldUp, upInput));

        const moveMag = Math.hypot(moveDir[0], moveDir[1], moveDir[2]);
        if (moveMag > 1e-6) moveDir = scale3(moveDir, 1 / moveMag);

        const boost = key('shift') ? settings.flightBoost : 1.0;
        const desiredVel = scale3(moveDir, settings.flightSpeed * boost);

        const response = Math.max(0, settings.flightDamping);
        const t = response > 0 ? 1 - Math.exp(-response * dt) : 0;
        flightState.vel = add3(scale3(flightState.vel, 1 - t), scale3(desiredVel, t));
        flightState.pos = add3(flightState.pos, scale3(flightState.vel, dt));

        cameraPosRef.current = [...flightState.pos];
        cameraTargetDirRef.current = forward;
        cameraUpRef.current = up;
        curTargetDir = forward;

        const speedNow = Math.hypot(flightState.vel[0], flightState.vel[1], flightState.vel[2]);
        const hasLookInput = isPointerLockedRef.current && (Math.abs(lookDx) + Math.abs(lookDy) > 0);
        const hasMoveInput = Math.abs(forwardInput) + Math.abs(rightInput) + Math.abs(upInput) > 0;
        isInteracting = hasLookInput || hasMoveInput || speedNow > 0.05;
        
        // Update flight data for HUD
        flightDataRef.current = {
          airspeed: speedNow,
          altitude: flightState.pos[1],
          heading: flightAngles.x,
          pitch: flightAngles.y,
          roll: flightAngles.roll,
          throttle: boost > 1 ? 1 : (key('shift') ? 1 : 0.5),
          gForce: 1.0 + Math.abs(flightAngles.roll) * 0.5,
        };
      }

      // Check if we need to resize
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const expectedWidth = Math.floor(canvas.clientWidth * settings.scale * dpr);
      const expectedHeight = Math.floor(canvas.clientHeight * settings.scale * dpr);
      if (expectedWidth !== rtWidth || expectedHeight !== rtHeight) {
        resizeRenderTargets();
      }

      // Render passes
      const dragToggled = prevMouseDownRef.current !== isInteracting;
      prevMouseDownRef.current = isInteracting;
      if (dragToggled && settings.fastWhileDrag && !settings.fast && settings.taa) {
        needsHistoryResetRef.current = true;
      }

      // Helper functions for rendering
      function setCommonUniforms(pass: any) {
        const u = pass.uniforms;
        gl.uniform3f(u.iResolution, rtWidth, rtHeight, 1);
        gl.uniform1f(u.iTime, time);
        if (u.iTimeDelta) gl.uniform1f(u.iTimeDelta, simTimeDelta);
        if (u.iFrameRate) gl.uniform1f(u.iFrameRate, simFrameRate);
        gl.uniform1i(u.iFrame, frame);
        const mx = state.mouseX;
        const my = state.mouseY;
        const down = state.mouseDown ? 1 : 0;
        gl.uniform4f(u.iMouse, mx, my, down, down);
      }

      function setChannels(pass: any) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, b.bufferA.readTex);
        gl.uniform1i(pass.uniforms.iChannel0, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, b.bufferB.readTex);
        gl.uniform1i(pass.uniforms.iChannel1, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, b.blueNoise);
        gl.uniform1i(pass.uniforms.iChannel2, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.uniform1i(pass.uniforms.iChannel3, 3);

        // iChannelResolution[0..3] - MUST pass all 4 channel resolutions as a 12-element array
        if (pass.uniforms.iChannelResolution0) {
          gl.uniform3fv(pass.uniforms.iChannelResolution0, new Float32Array([
            1, 4, 1,                        // channel0 (BufferA - 1x4)
            rtWidth, rtHeight, 1,           // channel1 (BufferB - full resolution noise atlas)
            BLUE_NOISE_SIZE, BLUE_NOISE_SIZE, 1, // channel2 (blue noise)
            0, 0, 1,                        // channel3 (unused)
          ]));
        }
      }

      function setImageUniforms(pass: any) {
        const u = pass.imageUniforms;
        const s = settings;
        if (u.uLightingMode) gl.uniform1i(u.uLightingMode, s.lighting === 'day' ? 1 : 0);
        if (u.uLightAzimuth) gl.uniform1f(u.uLightAzimuth, (s.lightAzimuthDeg * Math.PI) / 180);
        if (u.uLightHeight) gl.uniform1f(u.uLightHeight, s.lightHeight);
        const lightColor = hexToRgb01(s.lightColor);
        if (u.uLightColor) gl.uniform3f(u.uLightColor, lightColor[0], lightColor[1], lightColor[2]);
        if (u.uLightPower) gl.uniform1f(u.uLightPower, s.lightPower);
        if (u.uExposure) gl.uniform1f(u.uExposure, s.exposure);
        if (u.uStars) gl.uniform1f(u.uStars, s.stars);
        const nightSky = hexToRgb01(s.nightSkyColor);
        if (u.uNightSkyColor) gl.uniform3f(u.uNightSkyColor, nightSky[0], nightSky[1], nightSky[2]);
        const dayZenith = hexToRgb01(s.daySkyZenithColor);
        if (u.uDaySkyZenithColor) gl.uniform3f(u.uDaySkyZenithColor, dayZenith[0], dayZenith[1], dayZenith[2]);
        const dayHorizon = hexToRgb01(s.daySkyHorizonColor);
        if (u.uDaySkyHorizonColor) gl.uniform3f(u.uDaySkyHorizonColor, dayHorizon[0], dayHorizon[1], dayHorizon[2]);
        if (u.uSunDiskIntensity) gl.uniform1f(u.uSunDiskIntensity, s.sunDiskIntensity);
        if (u.uSunGlowIntensity) gl.uniform1f(u.uSunGlowIntensity, s.sunGlowIntensity);
        if (u.uCelestialDistance) gl.uniform1f(u.uCelestialDistance, s.celestialDistance);
        if (u.uCelestialSize) gl.uniform1f(u.uCelestialSize, s.celestialSize);
        if (u.uCloudShapeSpeed) gl.uniform1f(u.uCloudShapeSpeed, s.shapeSpeed);
        if (u.uCloudDetailSpeed) gl.uniform1f(u.uCloudDetailSpeed, s.detailSpeed);
        if (u.uCloudDensity) gl.uniform1f(u.uCloudDensity, s.densityMultiplier);
        if (u.uCloudShapeStrength) gl.uniform1f(u.uCloudShapeStrength, s.shapeStrength);
        if (u.uCloudDetailStrength) gl.uniform1f(u.uCloudDetailStrength, s.detailStrength);
        if (u.uCloudBase01) gl.uniform1f(u.uCloudBase01, s.cloudBase01);
        if (u.uCloudThickness01) gl.uniform1f(u.uCloudThickness01, s.cloudThickness01);
        if (u.uCloudBottomFade01) gl.uniform1f(u.uCloudBottomFade01, s.cloudBottomFade01);
        if (u.uCloudTopFade01) gl.uniform1f(u.uCloudTopFade01, s.cloudTopFade01);
        if (u.uCloudEdgeFade01) gl.uniform1f(u.uCloudEdgeFade01, s.cloudEdgeFade01);
        
        const cameraPos = cameraPosRef.current;
        const targetDir = cameraTargetDirRef.current;
        const cameraUp = cameraUpRef.current;
        if (u.uHarnessCameraPos) gl.uniform3f(u.uHarnessCameraPos, cameraPos[0], cameraPos[1], cameraPos[2]);
        if (u.uHarnessTargetDir) gl.uniform3f(u.uHarnessTargetDir, targetDir[0], targetDir[1], targetDir[2]);
        if (u.uHarnessCameraUp) gl.uniform3f(u.uHarnessCameraUp, cameraUp[0], cameraUp[1], cameraUp[2]);
        if (u.uHarnessFovDeg) gl.uniform1f(u.uHarnessFovDeg, s.fovDeg);
        
        // Terrain uniforms
        if (u.uTerrainEnabled) gl.uniform1f(u.uTerrainEnabled, s.terrainEnabled ? 1.0 : 0.0);
        if (u.uTerrainScale) gl.uniform1f(u.uTerrainScale, s.terrainScale);
        if (u.uTerrainHeight) gl.uniform1f(u.uTerrainHeight, s.terrainHeight);
        if (u.uTerrainDetail) gl.uniform1f(u.uTerrainDetail, s.terrainDetail);
        if (u.uWaterLevel) gl.uniform1f(u.uWaterLevel, s.waterLevel);
        if (u.uSnowLevel) gl.uniform1f(u.uSnowLevel, s.snowLevel);
        const rockColor = hexToRgb01(s.rockColor);
        if (u.uRockColor) gl.uniform3f(u.uRockColor, rockColor[0], rockColor[1], rockColor[2]);
        const grassColor = hexToRgb01(s.grassColor);
        if (u.uGrassColor) gl.uniform3f(u.uGrassColor, grassColor[0], grassColor[1], grassColor[2]);
        const snowColor = hexToRgb01(s.snowColor);
        if (u.uSnowColor) gl.uniform3f(u.uSnowColor, snowColor[0], snowColor[1], snowColor[2]);
        const waterColor = hexToRgb01(s.waterColor);
        if (u.uWaterColor) gl.uniform3f(u.uWaterColor, waterColor[0], waterColor[1], waterColor[2]);
      }

      function renderPass(pass: any, fbo: WebGLFramebuffer | null, w: number, h: number) {
        gl.useProgram(pass.program);
        gl.bindVertexArray(b.vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, w, h);
        setCommonUniforms(pass);
        setChannels(pass);
        if (pass.imageUniforms) {
          setImageUniforms(pass);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindVertexArray(null);
      }

      function renderBlit(tex: WebGLTexture) {
        gl.useProgram(b.passBlit.program);
        gl.bindVertexArray(b.vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, rtWidth, rtHeight);
        gl.uniform2f(b.passBlit.uniforms.uResolution, rtWidth, rtHeight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(b.passBlit.uniforms.uTex, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
      }

      function renderGodrays(sceneTex: WebGLTexture, lightUvData: { uv: number[], fade: number } | null) {
        if (!b.passGodrays || !lightUvData) {
          renderBlit(sceneTex);
          return;
        }

        const fade = lightUvData.fade;
        if (fade <= 1e-4 || settings.godraysIntensity <= 0.0) {
          renderBlit(sceneTex);
          return;
        }

        const lightUv = lightUvData.uv;
        const lightColor = hexToRgb01(settings.lightColor);

        gl.useProgram(b.passGodrays.program);
        gl.bindVertexArray(b.vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, rtWidth, rtHeight);

        const u = b.passGodrays.uniforms;
        gl.uniform2f(u.uResolution, rtWidth, rtHeight);
        gl.uniform2f(u.uLightUv, lightUv[0], lightUv[1]);
        gl.uniform3f(u.uLightColor, lightColor[0], lightColor[1], lightColor[2]);
        gl.uniform1f(u.uIntensity, settings.godraysIntensity * fade);
        gl.uniform1f(u.uDensity, settings.godraysDensity);
        gl.uniform1f(u.uDecay, settings.godraysDecay);
        gl.uniform1f(u.uWeight, settings.godraysWeight);
        gl.uniform1i(u.uSamples, settings.godraysSamples);

        const theta = Math.atan(settings.celestialSize / settings.celestialDistance);
        const radiusUv = 0.5 * (Math.tan(theta) / Math.tan(((settings.fovDeg * Math.PI) / 180) * 0.5));
        const sourceRadiusUv = Math.max(0.0005, radiusUv * settings.godraysRadiusScale);
        gl.uniform1f(u.uSourceRadius, sourceRadiusUv);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.uniform1i(u.uScene, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
      }

      function renderAccum(targetDirCur: number[], targetDirPrev: number[], cameraPosCur: number[], cameraPosPrev: number[], cameraUpCur: number[], cameraUpPrev: number[], reset: boolean, alpha: number, useReproj: boolean) {
        gl.useProgram(b.passAccum.program);
        gl.bindVertexArray(b.vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, b.history.writeFbo);
        gl.viewport(0, 0, rtWidth, rtHeight);

        const u = b.passAccum.uniforms;
        gl.uniform2f(u.uResolution, rtWidth, rtHeight);
        gl.uniform1f(u.uAlpha, alpha);
        gl.uniform1i(u.uReset, reset ? 1 : 0);
        gl.uniform1i(u.uUseReprojection, useReproj ? 1 : 0);
        if (u.uCameraPosCur) gl.uniform3f(u.uCameraPosCur, cameraPosCur[0], cameraPosCur[1], cameraPosCur[2]);
        if (u.uCameraPosPrev) gl.uniform3f(u.uCameraPosPrev, cameraPosPrev[0], cameraPosPrev[1], cameraPosPrev[2]);
        if (u.uCameraUpCur) gl.uniform3f(u.uCameraUpCur, cameraUpCur[0], cameraUpCur[1], cameraUpCur[2]);
        if (u.uCameraUpPrev) gl.uniform3f(u.uCameraUpPrev, cameraUpPrev[0], cameraUpPrev[1], cameraUpPrev[2]);
        gl.uniform3f(u.uTargetDirCur, targetDirCur[0], targetDirCur[1], targetDirCur[2]);
        gl.uniform3f(u.uTargetDirPrev, targetDirPrev[0], targetDirPrev[1], targetDirPrev[2]);
        gl.uniform1f(u.uFovDeg, settings.fovDeg);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, b.currentColorTex);
        gl.uniform1i(u.uCurrent, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, b.history.readTex);
        gl.uniform1i(u.uHistory, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, b.depth.writeTex);
        if (u.uCurrentDepth) gl.uniform1i(u.uCurrentDepth, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, b.depth.readTex);
        if (u.uPrevDepth) gl.uniform1i(u.uPrevDepth, 3);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindVertexArray(null);

        b.history.swap();
      }

      // BufferA: 1x4 state texture
      renderPass(b.passA, b.bufferA.writeFbo, 1, 4);
      b.bufferA.swap();

      // BufferB: generate once (or on resize)
      if (needsBufferBRebuildRef.current) {
        renderPass(b.passB, b.bufferB.writeFbo, rtWidth, rtHeight);
        b.bufferB.swap();
        needsBufferBRebuildRef.current = false;
      }

      // Compute light UV for god rays
      const lightUvData = computeLightUv(cameraTargetDirRef.current, cameraUpRef.current, settings, rtWidth, rtHeight);
      const shouldRenderGodrays = settings.godrays && (!isInteracting || settings.godraysDuringDrag);

      if (settings.taa) {
        const imagePassThisFrame = isInteracting && settings.fastWhileDrag ? b.passImageFast : b.passImage;
        gl.bindFramebuffer(gl.FRAMEBUFFER, b.currentColorFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, b.depth.writeTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        renderPass(imagePassThisFrame, b.currentColorFbo, rtWidth, rtHeight);

        const resetHistory = needsHistoryResetRef.current || (isInteracting && (!settings.taaDuringDrag || !useReprojectionThisFrame));
        const alphaThisFrame = isInteracting && settings.taaUseDragAlpha ? settings.taaAlphaDrag : settings.taaAlpha;
        renderAccum(
          curTargetDir,
          resetHistory ? curTargetDir : prevCameraTargetDir,
          cameraPosRef.current,
          resetHistory ? cameraPosRef.current : prevCameraPos,
          cameraUpRef.current,
          resetHistory ? cameraUpRef.current : prevCameraUp,
          resetHistory,
          alphaThisFrame,
          useReprojectionThisFrame,
        );

        const finalTex = b.history.readTex;
        if (settings.debugDepth) {
          renderBlit(b.depth.readTex);
        } else if (shouldRenderGodrays) {
          renderGodrays(finalTex, lightUvData);
        } else {
          renderBlit(finalTex);
        }

        if (resetHistory) needsHistoryResetRef.current = false;
      } else {
        const imagePassThisFrame = isInteracting && settings.fastWhileDrag ? b.passImageFast : b.passImage;
        gl.bindFramebuffer(gl.FRAMEBUFFER, b.currentColorFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, b.depth.writeTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        renderPass(imagePassThisFrame, b.currentColorFbo, rtWidth, rtHeight);

        if (settings.debugDepth) {
          renderBlit(b.depth.writeTex);
        } else if (shouldRenderGodrays) {
          renderGodrays(b.currentColorTex!, lightUvData);
        } else {
          renderBlit(b.currentColorTex!);
        }
      }

      b.depth.swap();
      frameRef.current += 1;
      animationRef.current = requestAnimationFrame(tick);
    }

    // Event handlers
    function onPointerDown(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x01 = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const y01 = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      stateRef.current.mouseX = x01 * buffersRef.current.rtWidth;
      stateRef.current.mouseY = (1 - y01) * buffersRef.current.rtHeight;

      if (settingsRef.current.cameraMode === 'orbit') {
        stateRef.current.mouseDown = true;
        try { canvas.setPointerCapture(e.pointerId); } catch {}
      } else {
        if (document.pointerLockElement !== canvas) {
          try { canvas.requestPointerLock(); } catch {}
        }
      }
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x01 = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const y01 = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      stateRef.current.mouseX = x01 * buffersRef.current.rtWidth;
      stateRef.current.mouseY = (1 - y01) * buffersRef.current.rtHeight;
      if (isPointerLockedRef.current) {
        flyLookRef.current.dx += e.movementX || 0;
        flyLookRef.current.dy += e.movementY || 0;
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (settingsRef.current.cameraMode === 'orbit') {
        stateRef.current.mouseDown = false;
      }
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    }

    function onPointerLockChange() {
      isPointerLockedRef.current = document.pointerLockElement === canvas;
      flyLookRef.current.dx = 0;
      flyLookRef.current.dy = 0;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const zoom = Math.exp((e.deltaY || 0) * 0.001);
      const nextFov = clamp(settingsRef.current.fovDeg * zoom, 20, 110);
      settingsRef.current.fovDeg = nextFov;
      needsHistoryResetRef.current = true;
    }

    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      stateRef.current.keys[key] = true;
      if (isPointerLockedRef.current && key.startsWith('arrow')) e.preventDefault();
    }

    function onKeyUp(e: KeyboardEvent) {
      stateRef.current.keys[e.key.toLowerCase()] = false;
    }

    function onBlur() {
      for (const key of Object.keys(stateRef.current.keys)) {
        delete stateRef.current.keys[key];
      }
      stateRef.current.mouseDown = false;
    }

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    init().catch(console.error);

    return () => {
      destroyed = true;
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [canvasRef]);

  return {
    isReady,
    fps,
    settings: settingsRef.current,
    updateSettings,
    resetHistory,
    flightData: flightDataRef.current,
    cameraPos: cameraPosRef.current,
  };
}

import { useRef, useEffect, useCallback, useState } from 'react';
import { WeatherTextureManager } from '@/lib/weatherTextureManager';

interface CloudPreview3DProps {
  weatherManager: WeatherTextureManager | null;
  worldExtent: number;
  onCameraMove?: (position: { x: number; z: number }) => void;
}

export function CloudPreview3D({
  weatherManager,
  worldExtent,
  onCameraMove,
}: CloudPreview3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Camera state
  const cameraRef = useRef({
    x: 0,
    y: 3000,
    z: 10000,
    pitch: -15,
    yaw: 0,
  });

  const mouseRef = useRef({
    isDown: false,
    lastX: 0,
    lastY: 0,
  });

  // Simple vertex shader
  const vertexShaderSource = `#version 300 es
    in vec2 a_position;
    out vec2 v_uv;
    
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Cloud preview fragment shader
  const fragmentShaderSource = `#version 300 es
    precision highp float;
    
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec3 u_cameraPos;
    uniform vec3 u_cameraDir;
    uniform float u_worldExtent;
    uniform sampler2D u_coverageMap;
    uniform sampler2D u_altitudeMap;
    
    in vec2 v_uv;
    out vec4 fragColor;
    
    const vec3 SKY_COLOR_TOP = vec3(0.2, 0.4, 0.8);
    const vec3 SKY_COLOR_HORIZON = vec3(0.6, 0.7, 0.9);
    const vec3 SUN_DIR = normalize(vec3(0.5, 0.7, 0.3));
    const vec3 SUN_COLOR = vec3(1.0, 0.95, 0.85);
    const vec3 CLOUD_COLOR = vec3(1.0, 1.0, 1.0);
    
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    
    float fbm(vec3 p) {
      float f = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) {
        f += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
      }
      return f;
    }
    
    vec2 worldToUV(vec3 pos) {
      float halfExtent = u_worldExtent * 0.5;
      return vec2(
        (pos.x + halfExtent) / u_worldExtent,
        (pos.z + halfExtent) / u_worldExtent
      );
    }
    
    float sampleCloudDensity(vec3 pos) {
      vec2 uv = worldToUV(pos);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
      
      vec4 coverage = texture(u_coverageMap, uv);
      vec4 altitude = texture(u_altitudeMap, uv);
      
      float cloudCoverage = coverage.r;
      float cloudBase = altitude.r * 10000.0;
      float cloudTop = altitude.g * 10000.0;
      
      if (pos.y < cloudBase || pos.y > cloudTop) return 0.0;
      
      float heightFrac = (pos.y - cloudBase) / max(1.0, cloudTop - cloudBase);
      float heightProfile = smoothstep(0.0, 0.3, heightFrac) * smoothstep(1.0, 0.7, heightFrac);
      
      float detail = fbm(pos * 0.001 + u_time * 0.01);
      
      return cloudCoverage * heightProfile * (0.3 + detail * 0.7);
    }
    
    vec4 raymarchClouds(vec3 ro, vec3 rd) {
      float cloudBase = 1000.0;
      float cloudTop = 8000.0;
      
      // Find intersection with cloud layer
      float tMin = (cloudBase - ro.y) / rd.y;
      float tMax = (cloudTop - ro.y) / rd.y;
      
      if (tMin > tMax) {
        float tmp = tMin;
        tMin = tMax;
        tMax = tmp;
      }
      
      if (tMax < 0.0) return vec4(0.0);
      tMin = max(0.0, tMin);
      
      float t = tMin;
      float stepSize = 150.0;
      float transmittance = 1.0;
      vec3 color = vec3(0.0);
      
      for (int i = 0; i < 64; i++) {
        if (t > tMax || transmittance < 0.01) break;
        
        vec3 pos = ro + rd * t;
        float density = sampleCloudDensity(pos);
        
        if (density > 0.01) {
          float lightMarch = 0.0;
          vec3 lightPos = pos;
          for (int j = 0; j < 6; j++) {
            lightPos += SUN_DIR * 100.0;
            lightMarch += sampleCloudDensity(lightPos);
          }
          
          float lightTransmit = exp(-lightMarch * 0.15);
          vec3 ambient = mix(vec3(0.4, 0.45, 0.55), vec3(0.7, 0.75, 0.85), (pos.y - cloudBase) / (cloudTop - cloudBase));
          vec3 cloudLight = mix(ambient, SUN_COLOR * 1.2, lightTransmit * 0.8);
          
          float alpha = 1.0 - exp(-density * stepSize * 0.003);
          color += transmittance * alpha * cloudLight;
          transmittance *= 1.0 - alpha;
        }
        
        t += stepSize;
      }
      
      return vec4(color, 1.0 - transmittance);
    }
    
    void main() {
      vec2 uv = v_uv * 2.0 - 1.0;
      uv.x *= u_resolution.x / u_resolution.y;
      
      // Camera setup
      float pitch = radians(u_cameraDir.x);
      float yaw = radians(u_cameraDir.y);
      
      vec3 forward = vec3(
        sin(yaw) * cos(pitch),
        sin(pitch),
        -cos(yaw) * cos(pitch)
      );
      vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
      vec3 up = cross(right, forward);
      
      vec3 rd = normalize(forward + uv.x * right * 0.8 + uv.y * up * 0.8);
      vec3 ro = u_cameraPos;
      
      // Sky gradient
      float skyBlend = smoothstep(-0.2, 0.5, rd.y);
      vec3 sky = mix(SKY_COLOR_HORIZON, SKY_COLOR_TOP, skyBlend);
      
      // Sun
      float sunDot = max(0.0, dot(rd, SUN_DIR));
      sky += SUN_COLOR * pow(sunDot, 256.0) * 2.0;
      sky += SUN_COLOR * pow(sunDot, 32.0) * 0.3;
      
      // Clouds
      vec4 clouds = raymarchClouds(ro, rd);
      vec3 color = mix(sky, clouds.rgb, clouds.a);
      
      // Ground
      if (rd.y < 0.0) {
        float t = -ro.y / rd.y;
        vec3 groundPos = ro + rd * t;
        float dist = length(groundPos.xz);
        float fog = 1.0 - exp(-dist * 0.00002);
        vec3 groundColor = mix(vec3(0.2, 0.25, 0.2), vec3(0.15, 0.18, 0.15), fbm(groundPos * 0.0001));
        groundColor = mix(groundColor, SKY_COLOR_HORIZON, fog);
        color = mix(color, groundColor, smoothstep(0.0, -0.02, rd.y));
      }
      
      // Tone mapping
      color = color / (1.0 + color);
      color = pow(color, vec3(0.45));
      
      fragColor = vec4(color, 1.0);
    }
  `;

  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
    });

    if (!gl) {
      console.error('WebGL2 not supported');
      return null;
    }

    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vertexShaderSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fragmentShaderSource);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
      return null;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    // Create fullscreen quad
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    return { gl, program, vao };
  }, []);

  useEffect(() => {
    const result = initGL();
    if (!result) return;

    const { gl, program, vao } = result;
    glRef.current = gl;

    const canvas = canvasRef.current!;
    let startTime = performance.now();

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      const time = (performance.now() - startTime) / 1000;
      const cam = cameraRef.current;

      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height);
      gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time);
      gl.uniform3f(gl.getUniformLocation(program, 'u_cameraPos'), cam.x, cam.y, cam.z);
      gl.uniform3f(gl.getUniformLocation(program, 'u_cameraDir'), cam.pitch, cam.yaw, 0);
      gl.uniform1f(gl.getUniformLocation(program, 'u_worldExtent'), worldExtent);

      // Upload weather textures
      if (weatherManager) {
        weatherManager.uploadToGPU(gl);

        if (weatherManager.textures.coverageTexture) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, weatherManager.textures.coverageTexture);
          gl.uniform1i(gl.getUniformLocation(program, 'u_coverageMap'), 0);
        }

        if (weatherManager.textures.altitudeTexture) {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, weatherManager.textures.altitudeTexture);
          gl.uniform1i(gl.getUniformLocation(program, 'u_altitudeMap'), 1);
        }
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationRef.current = requestAnimationFrame(render);
    };

    setIsReady(true);
    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initGL, worldExtent, weatherManager]);

  // Mouse controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseRef.current.isDown = true;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseRef.current.isDown) return;

    const dx = e.clientX - mouseRef.current.lastX;
    const dy = e.clientY - mouseRef.current.lastY;

    cameraRef.current.yaw += dx * 0.2;
    cameraRef.current.pitch = Math.max(-89, Math.min(89, cameraRef.current.pitch - dy * 0.2));

    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDown = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoom = e.deltaY > 0 ? 1.1 : 0.9;
    cameraRef.current.z = Math.max(1000, Math.min(50000, cameraRef.current.z * zoom));
    cameraRef.current.y = Math.max(500, Math.min(20000, cameraRef.current.y * zoom));

    onCameraMove?.({ x: cameraRef.current.x, z: cameraRef.current.z });
  }, [onCameraMove]);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white/60 text-sm">Initializing 3D preview...</div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-black/60 rounded-lg px-3 py-2 text-xs text-white/70">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}

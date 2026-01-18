/*
    Copyright (c) 2020 al-ro

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

/*
    Starry night sky with moonlit clouds.

    See https://www.shadertoy.com/view/3sffzj for clouds

    Blue noise dithering based on:
    https://blog.demofox.org/2020/05/10/ray-marching-fog-with-blue-noise/
    https://www.shadertoy.com/view/WsfBDf

    BufferA: Tracking view direction and resolution change.
    BufferB: Red & Green: Perlin-Worley atlas,
             Blue: cloud map
             Alpha: moon texture.

    EDIT: Better multiple scattering approximation
*/

#define PI 3.14159
#define TWO_PI 2.0 * PI

uniform int uLightingMode; // 0 = night (moon), 1 = day (sun)

uniform float uLightAzimuth; // radians
uniform float uLightHeight; // y component before normalization

uniform vec3 uLightColor;
uniform float uLightPower;
uniform float uExposure;

uniform float uStars; // 0..1

uniform vec3 uNightSkyColor;
uniform vec3 uDaySkyZenithColor;
uniform vec3 uDaySkyHorizonColor;

uniform float uSunDiskIntensity;
uniform float uSunGlowIntensity;

uniform float uCelestialDistance;
uniform float uCelestialSize;

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

float remap(float x, float low1, float high1, float low2, float high2) {
  return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
}

// Comment to see banding that the blue noise hides.
#define DITHERING
const float goldenRatio = 1.61803398875;

// Size of cloud AABB.
#define CLOUD_EXTENT 1000.0

// Uncomment for fewer ray marching steps and better performance.
// #define FAST

#ifdef FAST
#define STEPS_PRIMARY 32
#define STEPS_LIGHT 8
#else
#define STEPS_PRIMARY 64
#define STEPS_LIGHT 10
#endif

// Uncomment to animate moon azimuth.
// #define ANIMATE_MOON

const float moonSpeed = 0.1;

const float starCount = 20000.0;
const float flickerSpeed = 6.0;

// Harness controls (wired from main.js). These replace the old compile-time constants.
uniform float uCloudShapeSpeed;   // default: -5.0
uniform float uCloudDetailSpeed;  // default: -10.0
uniform float uCloudDensity;      // default: 0.075

const float shapeSize = 0.05;
const float detailSize = 0.3;

uniform float uCloudShapeStrength;  // default: 0.7
uniform float uCloudDetailStrength; // default: 0.2

// Vertical profile + edge fade (0..1 in cloud volume's normalized space).
uniform float uCloudBase01;       // default: 0.0
uniform float uCloudThickness01;  // default: 1.0
uniform float uCloudBottomFade01; // default: 0.08
uniform float uCloudTopFade01;    // default: 0.12
uniform float uCloudEdgeFade01;   // default: 0.10

// Terrain uniforms
uniform float uTerrainEnabled;    // 0 = off, 1 = on
uniform float uTerrainScale;      // default: 1.0
uniform float uTerrainHeight;     // max height multiplier
uniform float uTerrainDetail;     // octave count (3-16)
uniform float uWaterLevel;        // normalized 0-1
uniform float uSnowLevel;         // normalized 0-1
uniform vec3 uRockColor;          // rock/cliff color
uniform vec3 uGrassColor;         // vegetation color
uniform vec3 uSnowColor;          // snow color
uniform vec3 uWaterColor;         // water/ocean color

const float cloudStart = 0.0;
const float cloudEnd = CLOUD_EXTENT;

const vec3 minCorner = vec3(-CLOUD_EXTENT, cloudStart, -CLOUD_EXTENT);
const vec3 maxCorner = vec3(CLOUD_EXTENT, cloudEnd, CLOUD_EXTENT);

const mat2 m2 = mat2(0.8, -0.6, 0.6, 0.8);
const float SC = 250.0; // Terrain scale constant

// ============= TERRAIN FUNCTIONS =============
float hash2D(vec2 p) {
  p = 50.0 * fract(p * 0.3183099);
  return fract(p.x * p.y * (p.x + p.y));
}

vec3 noised2D(vec2 x) {
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 du = 6.0 * f * (1.0 - f);
  
  vec2 i = floor(x);
  float a = hash2D(i);
  float b = hash2D(i + vec2(1.0, 0.0));
  float c = hash2D(i + vec2(0.0, 1.0));
  float d = hash2D(i + vec2(1.0, 1.0));
  
  return vec3(
    a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y,
    du * (vec2(b - a, c - a) + (a - b - c + d) * u.yx)
  );
}

float terrainH(vec2 x, int octaves) {
  vec2 p = x * 0.003 / SC;
  float a = 0.0;
  float b = 1.0;
  vec2 d = vec2(0.0);
  
  for (int i = 0; i < 16; i++) {
    if (i >= octaves) break;
    vec3 n = noised2D(p);
    d += n.yz;
    a += b * n.x / (1.0 + dot(d, d)); // Erosion effect
    b *= 0.5;
    p = m2 * p * 2.0;
  }
  
  return SC * 120.0 * a * uTerrainScale * uTerrainHeight;
}

float terrainM(vec2 x) { return terrainH(x, 9); }
float terrainL(vec2 x) { return terrainH(x, 3); }

vec3 calcTerrainNormal(vec3 pos, float t) {
  float eps = max(0.001 * t, 0.1);
  vec2 e = vec2(eps, 0.0);
  return normalize(vec3(
    terrainM(pos.xz - e.xy) - terrainM(pos.xz + e.xy),
    2.0 * eps,
    terrainM(pos.xz - e.yx) - terrainM(pos.xz + e.yx)
  ));
}

float raycastTerrain(vec3 ro, vec3 rd, float tmin, float tmax) {
  float t = tmin;
  for (int i = 0; i < 200; i++) {
    vec3 pos = ro + t * rd;
    float h = pos.y - terrainM(pos.xz);
    if (abs(h) < 0.0015 * t || t > tmax) break;
    t += 0.4 * h;
  }
  return t;
}

float terrainShadow(vec3 ro, vec3 rd) {
  float minStep = SC * 0.5;
  float res = 1.0;
  float t = 0.001;
  
  for (int i = 0; i < 48; i++) {
    vec3 p = ro + t * rd;
    float h = p.y - terrainM(p.xz);
    res = min(res, 16.0 * h / t);
    t += max(minStep, h);
    if (res < 0.001 || p.y > SC * 200.0) break;
  }
  
  return clamp(res, 0.0, 1.0);
}

float fbmTerrain(vec2 p) {
  float f = 0.0;
  float b = 0.5;
  for (int i = 0; i < 4; i++) {
    f += b * hash2D(p);
    b *= 0.5;
    p = m2 * p * 2.02;
  }
  return f / 0.9375;
}

vec3 getTerrainColor(vec3 pos, vec3 nor, vec3 rd, vec3 sunDir, float dist) {
  vec3 col;
  
  float maxH = SC * 120.0 * uTerrainScale * uTerrainHeight;
  float h = pos.y / max(1.0, maxH);
  float waterLevel = uWaterLevel * 0.2;
  float snowLevel = uSnowLevel;
  
  // Water
  if (pos.y < waterLevel * maxH) {
    col = uWaterColor;
    // Specular on water
    vec3 hal = normalize(sunDir - rd);
    float spec = pow(max(dot(vec3(0,1,0), hal), 0.0), 64.0);
    col += spec * vec3(1.0, 0.9, 0.7) * 0.5;
    return col;
  }
  
  // Rock base
  float r = hash2D(pos.xz * 0.01);
  col = (r * 0.25 + 0.75) * 0.9 * uRockColor;
  
  // Grass on gentle slopes
  float grassMask = smoothstep(0.70, 0.9, nor.y);
  col = mix(col, uGrassColor * (0.5 + 0.5 * r), grassMask);
  
  // Snow at high altitude
  float snowH = smoothstep(snowLevel - 0.1, snowLevel + 0.1, h + 0.25 * fbmTerrain(pos.xz * 0.01));
  float snowSlope = smoothstep(1.0 - 0.5 * snowH, 1.0 - 0.1 * snowH, nor.y);
  float snow = snowH * snowSlope;
  col = mix(col, uSnowColor, smoothstep(0.1, 0.9, snow));
  
  // Lighting
  float amb = clamp(0.5 + 0.5 * nor.y, 0.0, 1.0);
  float dif = clamp(dot(sunDir, nor), 0.0, 1.0);
  float bac = clamp(0.2 + 0.8 * dot(normalize(vec3(-sunDir.x, 0.0, sunDir.z)), nor), 0.0, 1.0);
  
  float sh = dif >= 0.0001 ? terrainShadow(pos + sunDir * SC * 0.05, sunDir) : 1.0;
  
  vec3 lin = vec3(0.0);
  lin += dif * vec3(8.0, 5.0, 3.0) * 0.8 * vec3(sh, sh * sh * 0.5 + 0.5 * sh, sh * sh * 0.8 + 0.2 * sh);
  lin += amb * vec3(0.4, 0.6, 1.0) * 0.6;
  lin += bac * vec3(0.4, 0.5, 0.6) * 0.3;
  col *= lin;
  
  // Specular for snow
  vec3 hal = normalize(sunDir - rd);
  col += snow * 0.5 * pow(clamp(1.0 + dot(hal, rd), 0.0, 1.0), 5.0) *
         vec3(7.0, 5.0, 3.0) * dif * sh * pow(clamp(dot(nor, hal), 0.0, 1.0), 16.0);
  
  // Distance fog
  float fo = 1.0 - exp(-pow(0.0008 * dist / SC, 1.5));
  vec3 fogCol = 0.65 * vec3(0.4, 0.65, 1.0);
  col = mix(col, fogCol, fo);
  
  return col;
}

vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
  vec2 xy = fragCoord - iResolution.xy / 2.0;
  float z = (0.5 * iResolution.y) / tan(radians(fieldOfView) / 2.0);
  return normalize(vec3(xy, -z));
}

// https://www.geertarien.com/blog/2017/07/30/breakdown-of-the-lookAt-function-in-OpenGL/
mat3 lookAt(vec3 camera, vec3 targetDir, vec3 up) {
  vec3 zaxis = normalize(targetDir);
  vec3 xaxis = normalize(cross(zaxis, up));
  vec3 yaxis = cross(xaxis, zaxis);

  return mat3(xaxis, yaxis, -zaxis);
}

float getGlow(float dist, float radius, float intensity) {
  dist = max(dist, 5e-7);
  return pow(radius / dist, intensity);
}

// Get Cartesian coordinates from spherical.
vec3 getStarPosition(float theta, float phi) {
  return normalize(vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)));
}

// https://www.shadertoy.com/view/4djSRW
float rand(float p) {
  p = fract(p * .1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

bool isActiveElevation(float theta, float level) {
  return sin(theta) > rand(vec2(theta, level));
}

float getDistToStar(vec3 p, float theta, float phi) {
  vec3 starPos = getStarPosition(theta, phi);
  return 0.5 + 0.5 * dot(starPos, p);
}

// Get star colour from view direction.
float getStars(vec3 rayDir) {
  // acos returns a value in the range [0, PI].
  // The theta of the original view ray.
  float theta = acos(rayDir.z);

  // Extent of each level.
  float width = PI / starCount;

  // The level on which the view ray falls.
  float level = floor((theta / PI) * starCount);

  // The theta of the level considered.
  float theta_;
  // Random angle of the star on the level.
  float phi_;

  float stars = 0.0;
  float dist;

  // Variable to keep track of neighbouring levels.
  float level_;

  float rnd;

  // For a set number of layers above and below the view ray one,
  // accumulate the star colour.
  for (float l = -10.0; l <= 10.0; l++) {
    level_ = min(starCount - 1.0, max(0.0, level + l));
    theta_ = (level_ + 0.5) * width;

    // Uniformly picked latitudes lead to stars concentrating at the poles.
    // Make the likelyhood of rendering stars a function of sin(theta_)
    if (!isActiveElevation(theta_, 0.0)) {
      continue;
    }

    rnd = rand(PI + theta_);
    phi_ = TWO_PI * rand(level_);
    dist = getDistToStar(rayDir, theta_, phi_);

    stars += getGlow(1.0 - dist, rnd * 8e-7, 2.9 + (sin(rand(rnd) * flickerSpeed * iTime)));
  }

  return 0.05 * stars;
}

vec3 getSkyColour(vec3 rayDir, float mu) {
  float stars = 0.0;

  // Render stars only above the horizon.
  if (uStars > 0.0 && rayDir.y > 0.0) {
    // Swap Y and Z axis to be consistent with notation.
    vec3 dir = rayDir.xzy;
    stars = getStars(dir);
  }

  // Return stars plus a blue colour with a brighter haze around the moon.
  stars *= uStars;
  return stars + mix(0.2 * uNightSkyColor, 0.5 * uNightSkyColor, pow(mu, 8.0));
}

// Return the near and far intersections of an infinite ray and a sphere.
// Assumes sphere at origin. No intersection if result.x > result.y
vec2 sphereIntersections(vec3 start, vec3 dir, float radius) {
  float a = dot(dir, dir);
  float b = 2.0 * dot(dir, start);
  float c = dot(start, start) - (radius * radius);
  float d = (b * b) - 4.0 * a * c;
  if (d < 0.0) {
    return vec2(1e5, -1e5);
  }
  return vec2((-b - sqrt(d)) / (2.0 * a), (-b + sqrt(d)) / (2.0 * a));
}

// https://gist.github.com/DomNomNom/46bb1ce47f68d255fd5d
// Compute the near and far intersections using the slab method.
// No intersection if tNear > tFar.
vec2 intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
  vec3 tMin = (boxMin - rayOrigin) / rayDir;
  vec3 tMax = (boxMax - rayOrigin) / rayDir;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  return vec2(tNear, tFar);
}

bool insideAABB(vec3 p) {
  float eps = 1e-4;
  return (p.x > minCorner.x - eps) && (p.y > minCorner.y - eps) && (p.z > minCorner.z - eps) &&
         (p.x < maxCorner.x + eps) && (p.y < maxCorner.y + eps) && (p.z < maxCorner.z + eps);
}

bool getCloudIntersection(vec3 org, vec3 dir, out float distToStart, out float totalDistance) {
  vec2 intersections = intersectAABB(org, dir, minCorner, maxCorner);

  if (insideAABB(org)) {
    intersections.x = 1e-4;
  }

  distToStart = intersections.x;
  totalDistance = intersections.y - intersections.x;
  return intersections.x > 0.0 && (intersections.x < intersections.y);
}

float getPerlinWorleyNoise(vec3 pos) {
  // The cloud shape texture is an atlas of 6*6 tiles (36).
  // Each tile is 32*32 with a 1 pixel wide boundary.
  // Per tile:     32 + 2 = 34.
  // Atlas width:  6 * 34 = 204.
  // The rest of the texture is black.
  // The 3D texture the atlas represents has dimensions 32 * 32 * 36.
  // The green channel is the data of the red channel shifted by one tile.
  // (tex.g is the data one level above tex.r).
  // To get the necessary data only requires a single texture fetch.
  const float dataWidth = 204.0;
  const float tileRows = 6.0;
  const vec3 atlasDimensions = vec3(32.0, 32.0, 36.0);

  // Change from Y being height to Z being height.
  vec3 p = pos.xzy;

  // Pixel coordinates of point in the 3D data.
  vec3 coord = vec3(mod(p, atlasDimensions));
  float f = fract(coord.z);
  float level = floor(coord.z);
  float tileY = floor(level / tileRows);
  float tileX = level - tileY * tileRows;

  // The data coordinates are offset by the x and y tile, the two boundary cells
  // between each tile pair and the initial boundary cell on the first row/column.
  vec2 offset = atlasDimensions.x * vec2(tileX, tileY) + 2.0 * vec2(tileX, tileY) + 1.0;
  vec2 pixel = coord.xy + offset;
  vec2 data = texture(iChannel1, mod(pixel, dataWidth) / iChannelResolution[1].xy).rg;
  return mix(data.x, data.y, f);
}

// Read cloud map.
float getCloudMap(vec3 p) {
  vec2 uv = 0.5 + 0.5 * (p.xz / (2.0 * CLOUD_EXTENT));
  return texture(iChannel1, uv).b;
}

float clouds(vec3 p, out float cloudHeight, bool sampleDetail) {
  if (!insideAABB(p)) {
    return 0.0;
  }

  float cloud = getCloudMap(p);

  // Soft-fade toward the edges of the simulation volume so you don't "hit a wall" when flying.
  float edge01 = max(abs(p.x), abs(p.z)) / CLOUD_EXTENT;
  float edgeFade = 1.0 - smoothstep(1.0 - uCloudEdgeFade01, 1.0, edge01);
  cloud *= edgeFade;

  // If there are no clouds, exit early.
  if (cloud <= 0.0) {
    return 0.0;
  }

  // Vertical profile: base + thickness (globally tunable), with the map controlling the max height.
  float baseY = cloudStart + uCloudBase01 * (cloudEnd - cloudStart);
  float topY = baseY + (cloudEnd - cloudStart) * max(1e-3, uCloudThickness01) * cloud;
  if (p.y < baseY || p.y > topY) {
    return 0.0;
  }
  cloudHeight = saturate((p.y - baseY) / max(1e-3, (topY - baseY)));

  // Bottom/top fades (prevents the "infinite column" look).
  float bottomFade = smoothstep(0.0, uCloudBottomFade01, cloudHeight);
  float topFade = 1.0 - smoothstep(1.0 - uCloudTopFade01, 1.0, cloudHeight);
  cloud *= bottomFade * topFade;

  // Animate main shape.
  p += vec3(uCloudShapeSpeed * iTime);

  // Get main shape noise, invert and scale it.
  float shape = 1.0 - getPerlinWorleyNoise(shapeSize * p);
  shape *= uCloudShapeStrength;

  // Carve away density from cloud based on noise.
  cloud = saturate(remap(cloud, shape, 1.0, 0.0, 1.0));

  // Early exit from empty space
  if (cloud <= 0.0) {
    return 0.0;
  }

  // Details are expensive. For shadow/light-ray marching we can often skip them.
  if (sampleDetail) {
    // Animate details.
    p += vec3(uCloudDetailSpeed * iTime, 0.0, 0.5 * uCloudDetailSpeed * iTime);

    float detail = getPerlinWorleyNoise(detailSize * p);
    detail *= uCloudDetailStrength;

    // Carve away detail based on the noise
    cloud = saturate(remap(cloud, detail, 1.0, 0.0, 1.0));
  }

  return uCloudDensity * cloud;
}

float HenyeyGreenstein(float g, float costh) {
  return (1.0 / (4.0 * 3.1415)) * ((1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * costh, 1.5));
}

// https://twitter.com/FewesW/status/1364629939568451587/photo/1
float multipleOctaves(float extinction, float mu, float stepL) {
  float luminance = 0.0;
  const float octaves = 4.0;

  // Attenuation
  float a = 1.0;
  // Contribution
  float b = 1.0;
  // Phase attenuation
  float c = 1.0;

  float phase;

  for (float i = 0.0; i < octaves; i++) {
    // Two-lobed HG
    phase = mix(HenyeyGreenstein(-0.1 * c, mu), HenyeyGreenstein(0.3 * c, mu), 0.7);
    luminance += b * phase * exp(-stepL * extinction * a);
    // Lower is brighter
    a *= 0.25;
    // Higher is brighter
    b *= 0.5;
    c *= 0.5;
  }
  return luminance;
}

// Get the amount of light that reaches a sample point.
float lightRay(vec3 org, vec3 p, float mu, vec3 lightDirection) {
  float lightRayDistance = CLOUD_EXTENT * 1.5;
  float distToStart = 0.0;

  getCloudIntersection(p, lightDirection, distToStart, lightRayDistance);

  float stepL = lightRayDistance / float(STEPS_LIGHT);

  float lightRayDensity = 0.0;

  float cloudHeight = 0.0;

  // Collect total density along light ray.
  for (int j = 0; j < STEPS_LIGHT; j++) {
    bool sampleDetail = true;
    if (lightRayDensity > 0.3) {
      sampleDetail = false;
    }
    // Reduce density of clouds when looking towards the light for more luminous clouds.
    lightRayDensity += mix(1.0, 0.75, mu) * clouds(p + lightDirection * float(j) * stepL, cloudHeight, sampleDetail);
  }

  float beersLaw = multipleOctaves(lightRayDensity, mu, stepL);

  // Enhanced powder effect that works better when backlit
  float powder = 2.0 * (1.0 - exp(-stepL * lightRayDensity * 2.0));
  
  // Add minimum ambient contribution to prevent complete blackness when looking away from light
  // This simulates ambient sky illumination and multiple scattering from all directions
  float ambientScatter = 0.15 + 0.1 * (1.0 - mu); // More ambient when looking away from light
  
  // Blend between powder effect and pure beer's law based on view angle
  // When looking away from light (low mu), use more beer's law with ambient boost
  float directLight = mix(beersLaw * powder, beersLaw, 0.5 + 0.5 * mu);
  
  // Combine direct and ambient lighting
  return max(directLight, ambientScatter * beersLaw);
}

// Get the colour along the main view ray.
vec3 mainRay(
  vec3 org,
  vec3 dir,
  vec3 lightDirection,
  out float totalTransmittance,
  out float depthOut,
  float mu,
  vec3 lightColour,
  float offset
) {
  // Variable to track transmittance along view ray.
  // Assume clear sky and attenuate light when encountering clouds.
  totalTransmittance = 1.0;
  depthOut = 0.0;

  // Default to black.
  vec3 colour = vec3(0.0);

  // Approximate ray depth for reprojection (optical-depth weighted average distance).
  float depthSum = 0.0;
  float weightSum = 0.0;

  // The distance at which to start ray marching.
  float distToStart = 0.0;

  // The length of the intersection.
  float totalDistance = 0.0;

  // Determine if ray intersects bounding volume.
  // Set ray parameters in the cloud layer.
  bool renderClouds = getCloudIntersection(org, dir, distToStart, totalDistance);

  if (!renderClouds) {
    return colour;
  }

  // Sampling step size.
  float stepS = totalDistance / float(STEPS_PRIMARY);

  // Offset the starting point by blue noise.
  distToStart += stepS * offset;

  // Track distance to sample point.
  float dist = distToStart;

  // Initialise sampling point.
  vec3 p = org + dist * dir;

  vec3 moonLight = lightColour * uLightPower;

  // Combine backward and forward scattering to have details in all directions.
  float phaseFunction = mix(HenyeyGreenstein(-0.3, mu), HenyeyGreenstein(0.3, mu), 0.7);

  for (int i = 0; i < STEPS_PRIMARY; i++) {
    // Normalised height for shaping and ambient lighting weighting.
    float cloudHeight;

    // Get density and cloud height at sample point
    float density = clouds(p, cloudHeight, true);

    // Scattering and absorption coefficients.
    float sigmaS = 1.0;
    float sigmaA = 0.0;

    // Extinction coefficient.
    float sigmaE = sigmaS + sigmaA;

    float sampleSigmaS = sigmaS * density;
    float sampleSigmaE = sigmaE * density;

    // If there is a cloud at the sample point.
    if (density > 0.0) {
      // Enhanced ambient lighting - base ambient plus height-based contribution
      // Add extra ambient when looking away from the light source
      float ambientBoost = 0.3 + 0.2 * (1.0 - clamp(dot(dir, lightDirection), 0.0, 1.0));
      vec3 ambient = lightColour * mix(ambientBoost * 0.5, ambientBoost, cloudHeight);

      // Amount of sunlight that reaches the sample point through the cloud
      // is the combination of ambient light and attenuated direct light.
      vec3 luminance = 0.3 * ambient + moonLight * phaseFunction * lightRay(org, p, mu, lightDirection);

      // Scale light contribution by density of the cloud.
      luminance *= sampleSigmaS;

      // Beer-Lambert.
      float transmittance = exp(-sampleSigmaE * stepS);

      // Track representative depth of the volume contribution (for temporal reprojection).
      float wDepth = totalTransmittance * (1.0 - transmittance);
      depthSum += wDepth * dist;
      weightSum += wDepth;

      // Better energy conserving integration
      // "From Physically based sky, atmosphere and cloud rendering in Frostbite" 5.6
      // by Sebastian Hillaire.
      colour += totalTransmittance * (luminance - luminance * transmittance) / sampleSigmaE;

      // Attenuate the amount of light that reaches the camera.
      totalTransmittance *= transmittance;

      // If ray combined transmittance is close to 0, nothing beyond this sample
      // point is visible, so break early.
      if (totalTransmittance <= 0.01) {
        totalTransmittance = 0.0;
        if (weightSum > 1e-6) depthOut = depthSum / weightSum;
        else depthOut = dist;
        return colour;
      }
    }

    dist += stepS;

    // Step along ray.
    p = org + dir * dist;
  }

  if (weightSum > 1e-6) depthOut = depthSum / weightSum;
  else depthOut = 0.0;
  return colour;
}

// From Scratchpixel
// Assume normalised vectors.
bool getPlaneIntersection(vec3 org, vec3 ray, vec3 planePoint, vec3 normal, out float t) {
  float denom = dot(normal, ray);
  if (denom > 1e-6) {
    vec3 p0l0 = planePoint - org;
    t = dot(p0l0, normal) / denom;
    return (t >= 0.0);
  }

  return false;
}

// Get the moon texture.
vec3 getMoon(vec3 cameraPos, vec3 rayDir, vec3 moonDirection, out bool covered) {
  vec2 uv = vec2(0);
  covered = false;

  // Get the texture coordinates.
  // The moon is a disk on a plane perpendicular to the moon direction vector.
  // The texture coordinates of this plane are two perpendicular vectors u and v
  // which are also perpendicular to the plane normal.
  // As the moon is always facing the camera, we want u to be tangent to constant latitudes
  // and v to be tangent to constant longitudes. We first find the point p0 that
  // defines the plane. We then find a point p1 where a ray r1 offset in elevation
  // from the moon direction r0 hits the moon plane. Vector v is then the normalised vector
  // p1-p0 and u can be found by cross(r0, v).

  vec3 p0 = cameraPos + moonDirection * uCelestialDistance;
  vec3 offsetDir = normalize(vec3(cos(uLightAzimuth), uLightHeight + 0.01, sin(uLightAzimuth)));

  float t = 0.0;
  getPlaneIntersection(cameraPos, offsetDir, p0, moonDirection, t);

  vec3 p1 = cameraPos + offsetDir * t;
  vec3 v = normalize(p1 - p0);
  vec3 u = normalize(cross(moonDirection, v));

  if (getPlaneIntersection(cameraPos, rayDir, p0, moonDirection, t)) {
    // Where view ray hits the plane.
    vec3 p = cameraPos + rayDir * t;

    // Is point larger than the specified radius.
        if (length(p - p0) > uCelestialSize) {
          return vec3(0);
        }

    uv = vec2(dot(p, u), dot(p, v));
        uv /= (2.0 * uCelestialSize);

    covered = true;
    return texture(iChannel1, uv + 0.5).aaa;
  }

  return vec3(0);
}

// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 ACESFilm(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Get the default direction of the ray (along the negative Z direction)
  vec3 rayDir = rayDirection(55.0, fragCoord);

  //----------------- Define a camera -----------------

  vec3 cameraPos = vec3(-CLOUD_EXTENT * 0.4, cloudEnd * 0.7, CLOUD_EXTENT * 0.4);
  vec3 targetDir = texelFetch(iChannel0, ivec2(0.5, 1.5), 0).xyz;
  vec3 up = vec3(0.0, 1.0, 0.0);

  // Get the view matrix from the camera orientation
  mat3 viewMatrix = lookAt(cameraPos, targetDir, up);

  // Transform the ray to point in the correct direction
  rayDir = normalize(viewMatrix * rayDir);

  //---------------------------------------------------

#ifdef ANIMATE_MOON
  float lightAzimuth = uLightAzimuth + moonSpeed * iTime;
#else
  float lightAzimuth = uLightAzimuth;
#endif

  float lightHeight = uLightHeight;
  vec3 lightDirection = normalize(vec3(cos(lightAzimuth), lightHeight, sin(lightAzimuth)));

  // Alignment of view and light directions.
  float mu = 0.5 + 0.5 * dot(rayDir, lightDirection);

  float offset = 0.0;

#ifdef DITHERING
  // Sometimes the blue noise texture is not immediately loaded into iChannel2
  // leading to jitters.
  if (iChannelResolution[2].x > 0.0) {
    // From https://blog.demofox.org/2020/05/10/ray-marching-fog-with-blue-noise/
    // Get blue noise for the fragment.
    float blueNoise = texture(iChannel2, fragCoord / iChannelResolution[2].xy).r;

    // Blue noise texture is blue in space but animating it leads to white noise in time.
    // Adding golden ratio to a number yields a low discrepancy sequence (apparently),
    // making the offset of each pixel more blue in time (use fract() for modulo 1).
    // https://blog.demofox.org/2017/10/31/animating-noise-for-integration-over-time/
    offset = fract(blueNoise + float(iFrame) * goldenRatio);
  }
#endif

  float diskRadius = 0.5 * (1.0 - cos(atan(uCelestialSize / uCelestialDistance)));

  // ============= TERRAIN RENDERING =============
  vec3 terrainColor = vec3(0.0);
  float terrainT = -1.0;
  
  if (uTerrainEnabled > 0.5 && rayDir.y < 0.3) {
    float tmax = 8000.0 * SC;
    float maxh = 250.0 * SC * uTerrainScale * uTerrainHeight;
    float tmin = 1.0;
    
    // Clip ray against terrain bounding volume
    float tp = (maxh - cameraPos.y) / rayDir.y;
    if (tp > 0.0) {
      if (cameraPos.y > maxh) tmin = max(tmin, tp);
      else tmax = min(tmax, tp);
    }
    
    terrainT = raycastTerrain(cameraPos, rayDir, tmin, tmax);
    
    if (terrainT < tmax - 1.0) {
      vec3 terrainPos = cameraPos + terrainT * rayDir;
      vec3 terrainNor = calcTerrainNormal(terrainPos, terrainT);
      terrainColor = getTerrainColor(terrainPos, terrainNor, rayDir, lightDirection, terrainT);
    }
  }

  // ============= SKY BACKGROUND =============
  vec3 background = vec3(0.0);
  if (uLightingMode == 0) {
    // Get sky colour and stars.
    // Offset mu with blue noise to get rid of bands in the haze gradient.
    background = getSkyColour(rayDir, 0.05 * offset + mu);

    if (mu > 0.85) {
      bool covered = false;
      vec3 moonColour = getMoon(vec3(0), rayDir, lightDirection, covered);
      if (covered) {
        background = moonColour;
      }
    }

    // Get the glow around the moon (without offsetting with blue noise).
    background += uLightColor * uSunGlowIntensity * saturate(getGlow(1.0 - mu, diskRadius, 2.0));
  } else {
    float t = saturate(rayDir.y * 0.5 + 0.5);
    t = pow(t, 0.35);
    background = mix(uDaySkyHorizonColor, uDaySkyZenithColor, t);

    float dist01 = 1.0 - mu;
    float disk = 1.0 - smoothstep(diskRadius, diskRadius * 1.15, dist01);
    background += uLightColor * uSunDiskIntensity * disk;
    background += uLightColor * uSunGlowIntensity * saturate(getGlow(1.0 - mu, diskRadius, 2.0));
  }
  
  // Use terrain as background if it was hit
  if (terrainT > 0.0) {
    background = terrainColor;
  }

  float totalTransmittance = 1.0;
  float depth = 0.0;

  vec3 colour = uExposure * mainRay(
                             cameraPos,
                             rayDir,
                             lightDirection,
                             totalTransmittance,
                             depth,
                             dot(rayDir, lightDirection),
                             uLightColor,
                             offset
                           );

  gHarnessDepth = depth > 0.0 ? depth : (terrainT > 0.0 ? terrainT : 0.0);

  colour += background * totalTransmittance;

  // Tonemapping
  colour = ACESFilm(colour);

  // Gamma correction 1.0/2.2 = 0.4545...
  colour = pow(colour, vec3(0.4545));

  // Output to screen
  fragColor = vec4(colour, totalTransmittance);
}

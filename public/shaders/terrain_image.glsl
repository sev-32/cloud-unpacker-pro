/*
 * Combined Volumetric Clouds + Procedural Terrain + Atmospheric Effects
 * Based on techniques from Inigo Quilez and al-ro
 */

#define PI 3.14159265359
#define SC 250.0  // Scale factor

// ============= UNIFORMS =============
// Camera (from harness)
uniform vec3 uHarnessCameraPos;
uniform vec3 uHarnessTargetDir;
uniform vec3 uHarnessCameraUp;
uniform float uHarnessFovDeg;

// Lighting
uniform int uLightingMode;  // 0 = night, 1 = day
uniform float uLightAzimuth;
uniform float uLightHeight;
uniform vec3 uLightColor;
uniform float uLightPower;
uniform float uExposure;
uniform float uStars;
uniform vec3 uNightSkyColor;
uniform vec3 uDaySkyZenithColor;
uniform vec3 uDaySkyHorizonColor;
uniform float uSunDiskIntensity;
uniform float uSunGlowIntensity;
uniform float uCelestialDistance;
uniform float uCelestialSize;

// Clouds
uniform float uCloudShapeSpeed;
uniform float uCloudDetailSpeed;
uniform float uCloudDensity;
uniform float uCloudShapeStrength;
uniform float uCloudDetailStrength;
uniform float uCloudBase01;
uniform float uCloudThickness01;
uniform float uCloudBottomFade01;
uniform float uCloudTopFade01;
uniform float uCloudEdgeFade01;

// Terrain
uniform float uTerrainEnabled;      // 0 = off, 1 = on
uniform float uTerrainScale;        // default: 1.0
uniform float uTerrainHeight;       // max height multiplier
uniform float uTerrainDetail;       // octave count
uniform float uWaterLevel;          // normalized 0-1
uniform float uSnowLevel;           // normalized 0-1
uniform vec3 uRockColor;
uniform vec3 uGrassColor;
uniform vec3 uSnowColor;
uniform vec3 uWaterColor;

// ============= CONSTANTS =============
#define CLOUD_EXTENT 1000.0

#ifdef FAST
#define STEPS_PRIMARY 32
#define STEPS_LIGHT 6
#define TERRAIN_STEPS 128
#else
#define STEPS_PRIMARY 64
#define STEPS_LIGHT 10
#define TERRAIN_STEPS 256
#endif

const float cloudStart = 0.0;
const float cloudEnd = CLOUD_EXTENT;
const vec3 cloudMinCorner = vec3(-CLOUD_EXTENT, cloudStart, -CLOUD_EXTENT);
const vec3 cloudMaxCorner = vec3(CLOUD_EXTENT, cloudEnd, CLOUD_EXTENT);

const mat2 m2 = mat2(0.8, -0.6, 0.6, 0.8);
const float goldenRatio = 1.61803398875;

// ============= UTILITY FUNCTIONS =============
float saturate(float x) { return clamp(x, 0.0, 1.0); }
float remap(float x, float low1, float high1, float low2, float high2) {
    return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
}

// Hash functions
float hash(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash(vec2 p) {
    p = 50.0 * fract(p * 0.3183099);
    return fract(p.x * p.y * (p.x + p.y));
}

// Noise with derivatives
vec3 noised(vec2 x) {
    vec2 f = fract(x);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 du = 6.0 * f * (1.0 - f);
    
    vec2 i = floor(x);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return vec3(
        a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y,
        du * (vec2(b - a, c - a) + (a - b - c + d) * u.yx)
    );
}

float noise(vec2 p) {
    return noised(p).x;
}

// FBM
float fbm(vec2 p) {
    float f = 0.0;
    float b = 0.5;
    for (int i = 0; i < 4; i++) {
        f += b * noise(p);
        b *= 0.5;
        p = m2 * p * 2.02;
    }
    return f / 0.9375;
}

// ============= TERRAIN =============
float terrainH(vec2 x, int octaves) {
    vec2 p = x * 0.003 / SC;
    float a = 0.0;
    float b = 1.0;
    vec2 d = vec2(0.0);
    
    for (int i = 0; i < 16; i++) {
        if (i >= octaves) break;
        vec3 n = noised(p);
        d += n.yz;
        a += b * n.x / (1.0 + dot(d, d));
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
    for (int i = 0; i < TERRAIN_STEPS; i++) {
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
    
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + t * rd;
        float h = p.y - terrainM(p.xz);
        res = min(res, 16.0 * h / t);
        t += max(minStep, h);
        if (res < 0.001 || p.y > SC * 200.0) break;
    }
    
    return clamp(res, 0.0, 1.0);
}

vec3 getTerrainColor(vec3 pos, vec3 nor, vec3 rd, vec3 sunDir, float dist) {
    vec3 col;
    
    float h = pos.y / (SC * 120.0 * uTerrainScale * uTerrainHeight);
    float waterLevel = uWaterLevel * 0.2;
    float snowLevel = uSnowLevel;
    
    // Water
    if (pos.y < waterLevel * SC * 120.0 * uTerrainScale * uTerrainHeight) {
        col = uWaterColor;
        vec3 hal = normalize(sunDir - rd);
        float spec = pow(max(dot(vec3(0,1,0), hal), 0.0), 64.0);
        col += spec * vec3(1.0, 0.9, 0.7) * 0.5;
        return col;
    }
    
    // Rock
    float r = hash(pos.xz * 0.01);
    col = (r * 0.25 + 0.75) * 0.9 * uRockColor;
    
    // Grass on slopes
    float grassMask = smoothstep(0.70, 0.9, nor.y);
    col = mix(col, uGrassColor * (0.5 + 0.5 * r), grassMask);
    
    // Snow
    float snowH = smoothstep(snowLevel - 0.1, snowLevel + 0.1, h + 0.25 * fbm(pos.xz * 0.01));
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
    
    // Fog
    float fo = 1.0 - exp(-pow(0.001 * dist / SC, 1.5));
    vec3 fogCol = 0.65 * vec3(0.4, 0.65, 1.0);
    col = mix(col, fogCol, fo);
    
    return col;
}

// ============= CLOUDS (from original) =============
vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
    vec2 xy = fragCoord - iResolution.xy / 2.0;
    float z = (0.5 * iResolution.y) / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

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
    return (p.x > cloudMinCorner.x - eps) && (p.y > cloudMinCorner.y - eps) && (p.z > cloudMinCorner.z - eps) &&
           (p.x < cloudMaxCorner.x + eps) && (p.y < cloudMaxCorner.y + eps) && (p.z < cloudMaxCorner.z + eps);
}

bool getCloudIntersection(vec3 org, vec3 dir, out float distToStart, out float totalDistance) {
    vec2 intersections = intersectAABB(org, dir, cloudMinCorner, cloudMaxCorner);
    if (insideAABB(org)) intersections.x = 1e-4;
    distToStart = intersections.x;
    totalDistance = intersections.y - intersections.x;
    return intersections.x > 0.0 && (intersections.x < intersections.y);
}

float getPerlinWorleyNoise(vec3 pos) {
    const float dataWidth = 204.0;
    const float tileRows = 6.0;
    const vec3 atlasDimensions = vec3(32.0, 32.0, 36.0);
    vec3 p = pos.xzy;
    vec3 coord = vec3(mod(p, atlasDimensions));
    float f = fract(coord.z);
    float level = floor(coord.z);
    float tileY = floor(level / tileRows);
    float tileX = level - tileY * tileRows;
    vec2 offset = atlasDimensions.x * vec2(tileX, tileY) + 2.0 * vec2(tileX, tileY) + 1.0;
    vec2 pixel = coord.xy + offset;
    vec2 data = texture(iChannel1, mod(pixel, dataWidth) / iChannelResolution[1].xy).rg;
    return mix(data.x, data.y, f);
}

float getCloudMap(vec3 p) {
    vec2 uv = 0.5 + 0.5 * (p.xz / (2.0 * CLOUD_EXTENT));
    return texture(iChannel1, uv).b;
}

float clouds(vec3 p, out float cloudHeight, bool sampleDetail) {
    if (!insideAABB(p)) return 0.0;
    
    float cloud = getCloudMap(p);
    float edge01 = max(abs(p.x), abs(p.z)) / CLOUD_EXTENT;
    float edgeFade = 1.0 - smoothstep(1.0 - uCloudEdgeFade01, 1.0, edge01);
    cloud *= edgeFade;
    
    if (cloud <= 0.0) return 0.0;
    
    float baseY = cloudStart + uCloudBase01 * (cloudEnd - cloudStart);
    float topY = baseY + (cloudEnd - cloudStart) * max(1e-3, uCloudThickness01) * cloud;
    if (p.y < baseY || p.y > topY) return 0.0;
    cloudHeight = saturate((p.y - baseY) / max(1e-3, (topY - baseY)));
    
    float bottomFade = smoothstep(0.0, uCloudBottomFade01, cloudHeight);
    float topFade = 1.0 - smoothstep(1.0 - uCloudTopFade01, 1.0, cloudHeight);
    cloud *= bottomFade * topFade;
    
    p += vec3(uCloudShapeSpeed * iTime);
    float shape = 1.0 - getPerlinWorleyNoise(0.05 * p);
    shape *= uCloudShapeStrength;
    cloud = saturate(remap(cloud, shape, 1.0, 0.0, 1.0));
    
    if (cloud <= 0.0) return 0.0;
    
    if (sampleDetail) {
        p += vec3(uCloudDetailSpeed * iTime, 0.0, 0.5 * uCloudDetailSpeed * iTime);
        float detail = getPerlinWorleyNoise(0.3 * p);
        detail *= uCloudDetailStrength;
        cloud = saturate(remap(cloud, detail, 1.0, 0.0, 1.0));
    }
    
    return uCloudDensity * cloud;
}

float HenyeyGreenstein(float g, float costh) {
    return (1.0 / (4.0 * PI)) * ((1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * costh, 1.5));
}

float multipleOctaves(float extinction, float mu, float stepL) {
    float luminance = 0.0;
    float a = 1.0, b = 1.0, c = 1.0;
    for (float i = 0.0; i < 4.0; i++) {
        float phase = mix(HenyeyGreenstein(-0.1 * c, mu), HenyeyGreenstein(0.3 * c, mu), 0.7);
        luminance += b * phase * exp(-stepL * extinction * a);
        a *= 0.25;
        b *= 0.5;
        c *= 0.5;
    }
    return luminance;
}

float lightRay(vec3 org, vec3 p, float mu, vec3 lightDirection) {
    float lightRayDistance = CLOUD_EXTENT * 1.5;
    float distToStart = 0.0;
    getCloudIntersection(p, lightDirection, distToStart, lightRayDistance);
    float stepL = lightRayDistance / float(STEPS_LIGHT);
    float lightRayDensity = 0.0;
    float cloudHeight = 0.0;
    
    for (int j = 0; j < STEPS_LIGHT; j++) {
        bool sampleDetail = lightRayDensity <= 0.3;
        lightRayDensity += mix(1.0, 0.75, mu) * clouds(p + lightDirection * float(j) * stepL, cloudHeight, sampleDetail);
    }
    
    float beersLaw = multipleOctaves(lightRayDensity, mu, stepL);
    return mix(beersLaw * 2.0 * (1.0 - exp(-stepL * lightRayDensity * 2.0)), beersLaw, 0.5 + 0.5 * mu);
}

vec3 mainRay(vec3 org, vec3 dir, vec3 lightDirection, out float totalTransmittance, out float depthOut, float mu, vec3 lightColour, float offset) {
    totalTransmittance = 1.0;
    depthOut = 0.0;
    vec3 colour = vec3(0.0);
    float depthSum = 0.0;
    float weightSum = 0.0;
    float distToStart = 0.0;
    float totalDistance = 0.0;
    
    if (!getCloudIntersection(org, dir, distToStart, totalDistance)) return colour;
    
    float stepS = totalDistance / float(STEPS_PRIMARY);
    distToStart += stepS * offset;
    float dist = distToStart;
    vec3 p = org + dist * dir;
    vec3 moonLight = lightColour * uLightPower;
    float phaseFunction = mix(HenyeyGreenstein(-0.3, mu), HenyeyGreenstein(0.3, mu), 0.7);
    
    for (int i = 0; i < STEPS_PRIMARY; i++) {
        float cloudHeight;
        float density = clouds(p, cloudHeight, true);
        float sigmaS = 1.0;
        float sigmaE = sigmaS;
        float sampleSigmaS = sigmaS * density;
        float sampleSigmaE = sigmaE * density;
        
        if (density > 0.0) {
            vec3 ambient = lightColour * mix(0.0, 0.2, cloudHeight);
            vec3 luminance = 0.2 * ambient + moonLight * phaseFunction * lightRay(org, p, mu, lightDirection);
            luminance *= sampleSigmaS;
            float transmittance = exp(-sampleSigmaE * stepS);
            float wDepth = totalTransmittance * (1.0 - transmittance);
            depthSum += wDepth * dist;
            weightSum += wDepth;
            colour += totalTransmittance * (luminance - luminance * transmittance) / sampleSigmaE;
            totalTransmittance *= transmittance;
            if (totalTransmittance <= 0.01) {
                totalTransmittance = 0.0;
                if (weightSum > 1e-6) depthOut = depthSum / weightSum;
                else depthOut = dist;
                return colour;
            }
        }
        dist += stepS;
        p = org + dir * dist;
    }
    
    if (weightSum > 1e-6) depthOut = depthSum / weightSum;
    else depthOut = 0.0;
    return colour;
}

// ============= SKY =============
vec3 getSkyColour(vec3 rayDir, float mu) {
    float stars = 0.0;
    if (uStars > 0.0 && rayDir.y > 0.0) {
        // Simple star rendering
        float starNoise = hash(rayDir.xz * 1000.0);
        stars = step(0.998, starNoise) * starNoise * 2.0;
    }
    stars *= uStars;
    return stars + mix(0.2 * uNightSkyColor, 0.5 * uNightSkyColor, pow(mu, 8.0));
}

vec3 ACESFilm(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// ============= MAIN =============
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec3 rayDir = rayDirection(uHarnessFovDeg, fragCoord);
    vec3 cameraPos = uHarnessCameraPos;
    vec3 targetDir = uHarnessTargetDir;
    vec3 up = uHarnessCameraUp;
    
    mat3 viewMatrix = lookAt(cameraPos, targetDir, up);
    rayDir = normalize(viewMatrix * rayDir);
    
    float lightAzimuth = uLightAzimuth;
    vec3 lightDirection = normalize(vec3(cos(lightAzimuth), uLightHeight, sin(lightAzimuth)));
    float mu = 0.5 + 0.5 * dot(rayDir, lightDirection);
    
    // Blue noise offset
    float offset = 0.0;
    if (iChannelResolution[2].x > 0.0) {
        float blueNoise = texture(iChannel2, fragCoord / iChannelResolution[2].xy).r;
        offset = fract(blueNoise + float(iFrame) * goldenRatio);
    }
    
    float diskRadius = 0.5 * (1.0 - cos(atan(uCelestialSize / uCelestialDistance)));
    
    // Background - terrain or sky
    vec3 background = vec3(0.0);
    float terrainT = -1.0;
    
    if (uTerrainEnabled > 0.5 && rayDir.y < 0.5) {
        // Raycast terrain
        float tmax = 5000.0 * SC;
        float maxh = 250.0 * SC * uTerrainScale * uTerrainHeight;
        float tmin = 1.0;
        
        float tp = (maxh - cameraPos.y) / rayDir.y;
        if (tp > 0.0) {
            if (cameraPos.y > maxh) tmin = max(tmin, tp);
            else tmax = min(tmax, tp);
        }
        
        terrainT = raycastTerrain(cameraPos, rayDir, tmin, tmax);
        
        if (terrainT < tmax) {
            vec3 terrainPos = cameraPos + terrainT * rayDir;
            vec3 terrainNor = calcTerrainNormal(terrainPos, terrainT);
            background = getTerrainColor(terrainPos, terrainNor, rayDir, lightDirection, terrainT);
        }
    }
    
    // Sky background if no terrain hit
    if (terrainT < 0.0 || terrainT > 4999.0 * SC) {
        if (uLightingMode == 0) {
            background = getSkyColour(rayDir, 0.05 * offset + mu);
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
    }
    
    // Clouds
    float totalTransmittance = 1.0;
    float depth = 0.0;
    vec3 colour = uExposure * mainRay(cameraPos, rayDir, lightDirection, totalTransmittance, depth, dot(rayDir, lightDirection), uLightColor, offset);
    
    gHarnessDepth = depth;
    colour += background * totalTransmittance;
    
    // Tonemapping
    colour = ACESFilm(colour);
    colour = pow(colour, vec3(0.4545));
    
    fragColor = vec4(colour, totalTransmittance);
}

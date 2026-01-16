/*
 * Procedural Terrain Shader with LOD - Based on techniques from Inigo Quilez
 * Combined FBM terrain with atmospheric scattering and multi-layer noise
 */

#define PI 3.14159265359

// Uniforms for terrain control
uniform float uTerrainScale;        // default: 250.0
uniform float uTerrainHeight;       // default: 120.0
uniform float uTerrainDetail;       // default: 16.0 (octaves for high quality)
uniform float uWaterLevel;          // default: 0.15 (normalized 0-1)
uniform float uSnowLevel;           // default: 0.7 (normalized 0-1)

uniform vec3 uSunDirection;         // normalized light direction
uniform vec3 uTerrainColor1;        // rock color
uniform vec3 uTerrainColor2;        // grass/vegetation color
uniform vec3 uSnowColor;            // snow color
uniform vec3 uWaterColor;           // water color

uniform float uFogDensity;          // fog density
uniform vec3 uFogColor;             // fog color

// Noise texture for value noise
// Falls back to hash-based noise if not available

const mat2 m2 = mat2(0.8, -0.6, 0.6, 0.8);

// Hash function for procedural noise
float hash(vec2 p) {
    p = 50.0 * fract(p * 0.3183099);
    return fract(p.x * p.y * (p.x + p.y));
}

// Smooth noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Value noise with analytical derivatives
vec3 noised(vec2 x) {
    vec2 f = fract(x);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 du = 6.0 * f * (1.0 - f);
    
    vec2 i = floor(x);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return vec3(
        a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y,
        du * (vec2(b - a, c - a) + (a - b - c + d) * u.yx)
    );
}

// Terrain height with erosion simulation (domain warping + derivative tracking)
float terrainH(vec2 x, float sc, float octaves) {
    vec2 p = x * 0.003 / sc;
    float a = 0.0;
    float b = 1.0;
    vec2 d = vec2(0.0);
    
    int maxOctaves = int(octaves);
    for (int i = 0; i < 16; i++) {
        if (i >= maxOctaves) break;
        vec3 n = noised(p);
        d += n.yz;
        // Erosion: reduce height contribution in steep areas
        a += b * n.x / (1.0 + dot(d, d));
        b *= 0.5;
        p = m2 * p * 2.0;
    }
    
    return sc * 120.0 * a;
}

// Medium quality terrain (for shadows/LOD)
float terrainM(vec2 x, float sc) {
    return terrainH(x, sc, 9.0);
}

// Low quality terrain (for distance/collision)
float terrainL(vec2 x, float sc) {
    return terrainH(x, sc, 3.0);
}

// Calculate terrain normal
vec3 calcTerrainNormal(vec3 pos, float t, float sc) {
    float eps = max(0.001 * t, 0.1);
    vec2 e = vec2(eps, 0.0);
    return normalize(vec3(
        terrainH(pos.xz - e.xy, sc, 9.0) - terrainH(pos.xz + e.xy, sc, 9.0),
        2.0 * eps,
        terrainH(pos.xz - e.yx, sc, 9.0) - terrainH(pos.xz + e.yx, sc, 9.0)
    ));
}

// Raycast against terrain
float raycastTerrain(vec3 ro, vec3 rd, float tmin, float tmax, float sc) {
    float t = tmin;
    for (int i = 0; i < 300; i++) {
        vec3 pos = ro + t * rd;
        float h = pos.y - terrainM(pos.xz, sc);
        if (abs(h) < 0.0015 * t || t > tmax) break;
        t += 0.4 * h;
    }
    return t;
}

// Soft shadow calculation
float terrainShadow(vec3 ro, vec3 rd, float sc) {
    float minStep = sc * 0.5;
    float res = 1.0;
    float t = 0.001;
    
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + t * rd;
        float h = p.y - terrainM(p.xz, sc);
        res = min(res, 16.0 * h / t);
        t += max(minStep, h);
        if (res < 0.001 || p.y > sc * 200.0) break;
    }
    
    return clamp(res, 0.0, 1.0);
}

// FBM for cloud/texture generation
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

// Atmospheric fog with distance
vec3 applyFog(vec3 col, float dist, vec3 rd, vec3 sunDir, float sc, vec3 fogCol) {
    float fogAmount = 1.0 - exp(-pow(0.001 * dist / sc, 1.5));
    float sunAmount = max(dot(rd, sunDir), 0.0);
    vec3 fogColor = mix(fogCol, vec3(1.0, 0.9, 0.7), pow(sunAmount, 8.0));
    return mix(col, fogColor, fogAmount);
}

// Main terrain color calculation
vec3 getTerrainColor(
    vec3 pos, 
    vec3 nor, 
    vec3 rd, 
    vec3 sunDir,
    float dist,
    float sc,
    float waterLevel,
    float snowLevel,
    vec3 rockColor,
    vec3 grassColor,
    vec3 snowColor,
    vec3 waterColor
) {
    vec3 col;
    
    // Normalized height
    float h = pos.y / (sc * 120.0);
    
    // Water
    if (h < waterLevel) {
        col = waterColor;
        // Specular on water
        vec3 hal = normalize(sunDir - rd);
        float spec = pow(max(dot(nor, hal), 0.0), 64.0);
        col += spec * vec3(1.0, 0.9, 0.7);
        return col;
    }
    
    // Base rock color with texture variation
    float r = hash(pos.xz * 0.01);
    col = (r * 0.25 + 0.75) * 0.9 * rockColor;
    
    // Grass on gentle slopes
    float grassMask = smoothstep(0.70, 0.9, nor.y);
    col = mix(col, grassColor * (0.5 + 0.5 * r), grassMask);
    
    // Snow at high altitude
    float snowH = smoothstep(snowLevel - 0.1, snowLevel + 0.1, h + 0.25 * fbm(pos.xz * 0.01));
    float snowSlope = smoothstep(1.0 - 0.5 * snowH, 1.0 - 0.1 * snowH, nor.y);
    float snow = snowH * snowSlope;
    col = mix(col, snowColor, smoothstep(0.1, 0.9, snow));
    
    // Lighting
    float amb = clamp(0.5 + 0.5 * nor.y, 0.0, 1.0);
    float dif = clamp(dot(sunDir, nor), 0.0, 1.0);
    float bac = clamp(0.2 + 0.8 * dot(normalize(vec3(-sunDir.x, 0.0, sunDir.z)), nor), 0.0, 1.0);
    
    vec3 lin = vec3(0.0);
    lin += dif * vec3(8.0, 5.0, 3.0) * 0.8;
    lin += amb * vec3(0.4, 0.6, 1.0) * 0.6;
    lin += bac * vec3(0.4, 0.5, 0.6) * 0.3;
    col *= lin;
    
    // Specular for snow
    vec3 hal = normalize(sunDir - rd);
    col += snow * 0.7 * pow(clamp(1.0 + dot(hal, rd), 0.0, 1.0), 5.0) *
           vec3(7.0, 5.0, 3.0) * dif * pow(clamp(dot(nor, hal), 0.0, 1.0), 16.0);
    
    return col;
}

// Sky color with atmospheric scattering
vec3 getSkyColor(vec3 rd, vec3 sunDir) {
    float sundot = clamp(dot(rd, sunDir), 0.0, 1.0);
    
    // Base sky gradient
    vec3 col = vec3(0.3, 0.5, 0.85) - rd.y * rd.y * 0.5;
    col = mix(col, 0.85 * vec3(0.7, 0.75, 0.85), pow(1.0 - max(rd.y, 0.0), 4.0));
    
    // Sun glow
    col += 0.25 * vec3(1.0, 0.7, 0.4) * pow(sundot, 5.0);
    col += 0.25 * vec3(1.0, 0.8, 0.6) * pow(sundot, 64.0);
    col += 0.2 * vec3(1.0, 0.8, 0.6) * pow(sundot, 512.0);
    
    // Horizon haze
    col = mix(col, 0.68 * vec3(0.4, 0.65, 1.0), pow(1.0 - max(rd.y, 0.0), 16.0));
    
    return col;
}

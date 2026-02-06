# Six-LOD Unified Atmospheric Rendering System – First Principles Design

**Purpose:** Definitive specification for a physically-principled, seamless atmospheric rendering system spanning 7 orders of magnitude (1 meter to 10,000 kilometers) with 6 discrete LOD bands that merge perfectly, enabling continuous fly-through from ground fog to outer space.

**Framework:** React Three Fiber (R3F) + Three.js + Custom GLSL  
**Status:** Authoritative first-principles architecture and implementation specification  
**Last Updated:** 2026-02-04  
**Related:** DEEP_WEATHER_TERRAIN_OPTICS_INTEGRATION.md, VOLUMETRICS_MASTER_PLAN.md, MASTER_VOLUMETRICS_LIGHTING_ENCYCLOPEDIA.md

---

## Table of Contents

1. [First Principles: The Physics of Atmosphere](#1-first-principles)
2. [The Six LOD Bands](#2-the-six-lod-bands)
3. [Mathematical Foundations](#3-mathematical-foundations)
4. [LOD 0: Ground-Level Near (1-50m)](#4-lod-0-ground-level-near)
5. [LOD 1: Mid-Distance Local (50m-5km)](#5-lod-1-mid-distance-local)
6. [LOD 2: Far Horizon (5km-100km)](#6-lod-2-far-horizon)
7. [LOD 3: Near Orbital (100-500km)](#7-lod-3-near-orbital)
8. [LOD 4: Far Orbital / Planetary (500km+)](#8-lod-4-far-orbital)
9. [LOD 5: Deep Space (10,000km+)](#9-lod-5-deep-space)
10. [Seamless Transition System](#10-seamless-transition-system)
11. [Unified Data Pipeline](#11-unified-data-pipeline)
12. [R3F Architecture](#12-r3f-architecture)
13. [Performance Budget](#13-performance-budget)
14. [Existing Asset Integration](#14-existing-asset-integration)
15. [Implementation Roadmap](#15-implementation-roadmap)

---

## 1. First Principles: The Physics of Atmosphere

### 1.1 What Are We Simulating?

Earth's atmosphere is a **participating medium** — a volume of gas and suspended particles that:

1. **Absorbs** light (photons are captured by molecules and particles)
2. **Scatters** light (photons change direction)
3. **Emits** light (thermal emission, negligible in visible range for atmosphere)

Every visual atmospheric phenomenon — fog, clouds, blue sky, red sunset, silver linings, god rays, halos — is a consequence of these three interactions at different scales.

### 1.2 The Radiative Transfer Equation (RTE)

**The fundamental equation governing light transport in participating media:**

```
dL(x, ω) / ds = -σ_t(x) · L(x, ω) + σ_s(x) · ∫ p(ω, ω') · L(x, ω') dω' + σ_a(x) · L_e(x, ω)
```

Where:
- `L(x, ω)` = radiance at point x in direction ω (what we see)
- `s` = distance along the ray
- `σ_t(x) = σ_a(x) + σ_s(x)` = **extinction coefficient** (absorption + scattering)
- `σ_s(x)` = **scattering coefficient** (how much light is redirected)
- `σ_a(x)` = **absorption coefficient** (how much light is absorbed)
- `p(ω, ω')` = **phase function** (probability of scattering from ω' to ω)
- `L_e(x, ω)` = **emission** (negligible for atmosphere in visible)

**In plain English:** As light travels through the atmosphere, it loses energy (extinction) and gains energy from other directions (in-scattering). The balance determines what we see.

### 1.3 Beer-Lambert Law (Transmittance)

**How much light survives traveling through a medium:**

```
T(a, b) = exp(-∫[a→b] σ_t(x) ds)
```

This is the foundation of ALL atmospheric rendering:
- **Fog:** σ_t is high near ground → light decays exponentially → visibility limited
- **Clouds:** σ_t varies with water droplet density → thick clouds are opaque, thin clouds are translucent
- **Clear sky:** σ_t is very low → light travels far → we see stars, distant mountains

### 1.4 Two Types of Scattering

#### Rayleigh Scattering (Molecules, λ << particle size)

**What:** Air molecules (N₂, O₂) scatter short wavelengths more than long wavelengths.

**Cross-section:** `σ_R(λ) ∝ 1/λ⁴`

- Blue (450nm) scatters **5.5× more** than red (700nm)
- This is why the sky is blue and sunsets are red
- **Dominates at:** Large distances (5km+), clear atmosphere
- **Scale height:** H_R ≈ 8.5 km (density halves every 8.5km altitude)

**Phase function (symmetric):**

```
p_R(θ) = (3/16π) · (1 + cos²θ)
```

Equal forward and backward scatter — symmetric around 90°.

#### Mie Scattering (Aerosols/Water Droplets, λ ≈ particle size)

**What:** Larger particles (aerosols 0.1-10μm, water droplets 5-100μm) scatter all wavelengths approximately equally, with strong forward peak.

**Cross-section:** `σ_M ∝ particle_concentration` (wavelength-independent for large particles)

- This is why fog/clouds are white (all wavelengths scattered equally)
- Strong forward scattering → silver linings, bright halos around sun
- **Dominates at:** Short distances (0-5km), near clouds, in fog
- **Scale height:** H_M ≈ 1.2 km (aerosols concentrate near ground)

**Phase function (Henyey-Greenstein, asymmetric):**

```
p_HG(θ, g) = (1 - g²) / (4π · (1 + g² - 2g·cosθ)^(3/2))
```

Where `g` = asymmetry parameter:
- `g = 0` → isotropic (same as Rayleigh symmetry)
- `g = 0.76` → typical aerosol (strong forward scatter)
- `g = 0.85` → cloud droplet (very strong forward scatter → silver lining)

### 1.5 Why Scale Matters: What Dominates at Each Distance

| Distance | Dominant Physics | Visual Character |
|----------|-----------------|------------------|
| **1-50m** | Mie scattering from water droplets, Beer-Lambert absorption | Individual fog wisps, visible particles, wet surfaces, volumetric light shafts |
| **50m-5km** | Mie + some Rayleigh, cloud scattering (multiple scattering events) | Cloud bases, cumulus detail, rain curtains, crepuscular rays |
| **5-100km** | Rayleigh starts dominating, aerial perspective, blue haze | Mountains fade to blue, cloud layers flatten, horizon glow |
| **100-500km** | Rayleigh dominates, limb darkening, cloud tops visible | Cloud systems as flat features, atmosphere as thin shell, curvature visible |
| **500km+** | Atmosphere is thin shell, single-scatter approximation valid | Entire cloud systems, weather fronts, planet edge glow |
| **10,000km+** | Entire planet is a point/disc, atmosphere negligible thickness | Marble effect, full Earth, no cloud detail |

**This is the key insight:** The physics CHANGES with distance. A single rendering technique cannot cover all scales. We need different approximations at each LOD, chosen to match the dominant physics.

### 1.6 Optical Depth and Why It Matters

**Optical depth** τ = integral of extinction along a path:

```
τ = ∫ σ_t(s) ds
```

- τ < 0.1: Nearly transparent (clear sky, thin haze)
- τ ≈ 1: Significant attenuation (moderate fog, thin cloud)
- τ > 3: Opaque (thick fog, cumulus)
- τ > 10: Completely opaque (storm cloud base)

**Why this matters for LOD:** At each scale, the optical depth of the atmospheric slice determines whether we need:
- Full volumetric raymarch (τ varies, need to integrate)
- Thin-shell approximation (τ ≈ known, can use analytical formula)
- Opaque surface (τ >> 1, treat as surface)

---

## 2. The Six LOD Bands

### 2.1 Band Definitions

```
Distance from camera (logarithmic scale):
                                                                  
 1m    10m    100m    1km    10km    100km    1000km    10000km
 |──────|──────|──────|──────|──────|──────|──────────|─────→
 │  LOD 0      │   LOD 1    │  LOD 2      │  LOD 3  │ LOD 4 │ LOD 5
 │ Ground Near │ Mid-Local  │ Far Horizon │ Near    │ Far   │ Deep
 │ 1-50m       │ 50m-5km    │ 5-100km     │ Orbital │Orbital│ Space
 │             │            │             │100-500km│500km+ │10Mm+
 │             │            │             │         │       │
 │ Fog, mist   │ Cumulus    │ Stratiform  │ Cloud   │Planet │Marble
 │ smoke, rain │ bases,     │ layers,     │ tops,   │shell, │Earth
 │ particles   │ rain walls │ 2D sheets   │ systems │limb   │
```

### 2.2 LOD Band Summary

| LOD | Name | Distance | Rendering Technique | Dominant Physics | Existing Assets |
|-----|------|----------|---------------------|-----------------|-----------------|
| **0** | Ground Near | 1-50m | High-density raymarch + particles | Mie, Beer-Lambert | `VolumetricFogVolume` (partial) |
| **1** | Mid-Local | 50m-5km | Volumetric raymarch (128 steps) | Mie + multi-scatter | `VolumetricCloudVolume` (good) |
| **2** | Far Horizon | 5-100km | Thin-slab raymarch (32 steps) + 2D sheets | Rayleigh + aerial perspective | Earth Engine 2D clouds (good) |
| **3** | Near Orbital | 100-500km | Shell raymarch (64 steps) | Rayleigh dominant, thin-shell | `VolumetricCloudShell` (good) |
| **4** | Far Orbital | 500km-10Mm | Shell with distance-adaptive steps | Single-scatter approx | `VolumetricCloudShell` (partial) |
| **5** | Deep Space | 10Mm+ | Texture-mapped sphere + atmosphere glow | No medium traversal | New (needed) |

### 2.3 What We Have vs. What We Need

**Existing (from GPTVolumetricMastery):**
- ✅ LOD 1 (Mid-Local): `VolumetricCloudVolume` — good, needs enhancement
- ✅ LOD 3-4 (Orbital): `VolumetricCloudShell` — good, needs refinement
- ⚠️ LOD 0 (Ground Near): `VolumetricFogVolume` — basic, needs major expansion
- ❌ LOD 2 (Far Horizon): Earth Engine 2D clouds exist but not integrated as LOD band
- ❌ LOD 5 (Deep Space): Nothing exists
- ❌ **Seamless transition system**: Only 2-band fade (volume↔shell at 120-260km)

**Critical Gaps:**
1. **LOD 0 (Ground Near)** needs: Particles, rain/snow, detailed fog, smoke, light shafts
2. **LOD 2 (Far Horizon)** needs: 2D sheet clouds, aerial perspective, horizon haze
3. **LOD 5 (Deep Space)** needs: Full-Earth texture, atmosphere rim
4. **Transition system** needs: 6-way blending, not just 2-way

---

## 3. Mathematical Foundations

### 3.1 Coordinate Systems

**Three coordinate systems in play:**

1. **Local Cartesian (LOD 0-2):** Camera-centered, Y-up, meters. Used for near/mid/far rendering where curvature is negligible.

2. **Geocentric Cartesian (LOD 3-4):** Earth-centered, Z-up (or Y-up, convention). Used for orbital views where curvature matters.

3. **Spherical (LOD 3-5):** (r, θ, φ) — radius, latitude, longitude. Used for weather texture mapping and atmospheric shell geometry.

**Transition between coordinate systems:**

```typescript
// Local → Geocentric (given camera position on globe)
function localToGeocentric(localPos: Vector3, cameraGlobePos: Vector3, earthRadius: number): Vector3 {
  const up = cameraGlobePos.clone().normalize();
  const east = new Vector3(0, 1, 0).cross(up).normalize();
  const north = up.clone().cross(east).normalize();
  
  return cameraGlobePos.clone()
    .add(east.multiplyScalar(localPos.x))
    .add(up.multiplyScalar(localPos.y))
    .add(north.multiplyScalar(localPos.z));
}

// Geocentric → Spherical
function geocentricToSpherical(pos: Vector3): { r: number, lat: number, lon: number } {
  const r = pos.length();
  const lat = Math.asin(pos.y / r);  // -π/2 to π/2
  const lon = Math.atan2(pos.z, pos.x);  // -π to π
  return { r, lat, lon };
}
```

### 3.2 Altitude-Dependent Density Model

**Atmosphere density decreases exponentially with altitude:**

```
ρ(h) = ρ_0 · exp(-h / H)
```

Where:
- `ρ_0` = sea-level density
- `h` = altitude above sea level
- `H` = scale height

**Scale heights for different components:**

| Component | Scale Height H | Sea-Level σ | Notes |
|-----------|---------------|-------------|-------|
| **Rayleigh (air molecules)** | 8,500 m | 5.8×10⁻⁶ m⁻¹ (at 550nm) | Dominates above ~5km |
| **Mie (aerosols)** | 1,200 m | 2.0×10⁻⁵ m⁻¹ | Dominates below ~2km |
| **Ozone absorption** | 25,000 m (peak at ~25km) | 3.6×10⁻⁷ m⁻¹ | Negligible for visuals (slight blue tint) |
| **Water vapor** | 2,000 m | Variable (0-4% by volume) | Drives fog, clouds, humidity |

**In the shader:**

```glsl
float rayleighDensity(float altitude) {
  return exp(-altitude / 8500.0);
}

float mieDensity(float altitude) {
  return exp(-altitude / 1200.0);
}

// Combined extinction at a point
float totalExtinction(float altitude, float cloudDensity) {
  float rayleigh = 5.8e-6 * rayleighDensity(altitude);  // per meter
  float mie = 2.0e-5 * mieDensity(altitude);
  float cloud = cloudDensity * 0.05;  // Cloud extinction (tunable)
  return rayleigh + mie + cloud;
}
```

### 3.3 Aerial Perspective (Key for LOD 2-3 Transitions)

**Aerial perspective** is the blue haze that makes distant objects look blue/gray. It's the accumulated Rayleigh in-scatter along the view path.

```
L_final = L_object · T(0, d) + L_inscatter · (1 - T(0, d))
```

Where:
- `L_object` = color of the distant object
- `T(0, d) = exp(-σ_R · d)` = transmittance over distance d
- `L_inscatter` = sky color (from Rayleigh scattering)

**In the shader (applied to all LODs for distant objects):**

```glsl
vec3 applyAerialPerspective(vec3 objectColor, float distance, vec3 skyColor) {
  float rayleighOpticalDepth = 5.8e-6 * distance;  // At sea level
  float transmittance = exp(-rayleighOpticalDepth);
  return mix(skyColor, objectColor, transmittance);
}
```

**At 10km:** transmittance ≈ 0.94 (6% blue tint — barely visible)
**At 50km:** transmittance ≈ 0.75 (25% blue tint — noticeable haze)
**At 100km:** transmittance ≈ 0.56 (44% — heavy haze, mountains very blue)

### 3.4 Phase Functions for Each LOD

| LOD | Dominant Phase | Parameters | Visual Effect |
|-----|---------------|------------|---------------|
| **LOD 0** | Mie (HG, g≈0.85) | Strong forward scatter | Bright halos around lights in fog, visible light shafts |
| **LOD 1** | Mie multi-scatter (powder approx) | g≈0.76, 4 octaves | Silver lining, dark bases, bright tops |
| **LOD 2** | Mie + Rayleigh blend | g reduces with distance | Softer scatter, aerial perspective dominates |
| **LOD 3-4** | Rayleigh dominant | Symmetric scatter | Blue atmosphere shell, limb brightening |
| **LOD 5** | N/A (texture-based) | Pre-computed | Full Earth appearance |

---

## 4. LOD 0: Ground-Level Near (1-50m)

### 4.1 What This Covers

**Phenomena:**
- Fog wisps and ground fog (0-20m altitude)
- Low cloud bases passing overhead
- Rain and snow (volumetric precipitation)
- Smoke from fires, chimneys, volcanic vents
- Steam and mist over water bodies
- Visible light shafts (volumetric god rays through trees, windows)
- Breath condensation (if character-scale)

**Physical Character:**
- Individual eddies and wisps are visible
- Turbulent structure at meter scale
- Particles have visible size (rain drops, snow flakes)
- Light shafts are sharply defined (penumbra < 1m)
- Shadows from fog/smoke are visible on surfaces

### 4.2 Rendering Technique: High-Density Raymarch + Particles

**Approach:** Camera-centered box volume with high-resolution raymarch (64-128 steps over short distance), plus GPU particle system for precipitation and debris.

**Volume Specification:**

```typescript
interface LOD0Config {
  // Volume
  volumeSize: [number, number, number];  // [100, 50, 100] meters (XYZ)
  maxSteps: number;           // 64-128 (short distance = fewer steps needed)
  stepSize: number;           // 0.5-1.0 meters
  
  // Fog
  fogDensity: number;         // 0-5 (sea-level extinction coefficient)
  fogBaseHeight: number;      // 0 meters (can be negative for valley fog)
  fogTopHeight: number;       // 20-50 meters
  fogFalloff: number;         // Exponential falloff rate
  fogNoiseScale: number;      // 0.01-0.1 (turbulent wisps)
  fogNoiseOctaves: number;    // 4-6 (fine detail)
  fogWindSpeed: Vector3;      // Advection velocity
  
  // Precipitation
  rainEnabled: boolean;
  rainDensity: number;        // Drops per cubic meter
  rainSpeed: number;          // Terminal velocity (6-9 m/s)
  rainAngle: number;          // Wind-driven angle from vertical
  snowEnabled: boolean;
  snowDensity: number;
  snowSpeed: number;          // 1-2 m/s (slower than rain)
  
  // Light shafts
  lightShaftsEnabled: boolean;
  lightShaftSteps: number;    // 16-32 (for shadow map sampling)
  lightShaftDensity: number;  // How visible shafts are
}
```

**Density Function (LOD 0):**

```glsl
// LOD 0: Ground-level fog with turbulent detail
float lod0Density(vec3 worldPos, float time) {
  float altitude = worldPos.y - uFogBaseHeight;
  
  // Height-based exponential falloff
  float heightDensity = uFogDensity * exp(-altitude / uFogFalloff);
  if (heightDensity < 0.001) return 0.0;  // Early out
  
  // Turbulent noise (high frequency for near detail)
  vec3 noisePos = worldPos * uFogNoiseScale + uFogWindSpeed * time;
  float noise = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  for (int i = 0; i < uFogNoiseOctaves; i++) {
    noise += amp * snoise3D(noisePos * freq);
    freq *= 2.3;  // Non-power-of-2 lacunarity for less regular patterns
    amp *= 0.45;
  }
  noise = noise * 0.5 + 0.5;  // [0, 1]
  
  // Wisp factor (creates visible eddies)
  float wispMask = smoothstep(0.3, 0.7, noise);
  
  return heightDensity * wispMask;
}
```

**Precipitation (GPU Particles):**

```glsl
// Rain particle vertex shader
attribute vec3 particlePosition;  // GPU-instanced
attribute float particleLife;

uniform vec3 uCameraPosition;
uniform float uTime;
uniform float uRainSpeed;
uniform vec3 uWindDirection;
uniform vec3 uVolumeSize;

varying float vAlpha;

void main() {
  // Animate: fall + wind + wrap within volume
  vec3 pos = particlePosition;
  pos.y -= uRainSpeed * (uTime + particleLife * 100.0);
  pos.xz += uWindDirection.xz * uTime;
  
  // Wrap within camera-centered volume
  pos = mod(pos - uCameraPosition + uVolumeSize * 0.5, uVolumeSize) 
        - uVolumeSize * 0.5 + uCameraPosition;
  
  // Streak: elongate in velocity direction (motion blur)
  vec3 velocity = vec3(uWindDirection.x, -uRainSpeed, uWindDirection.z);
  float streakLength = length(velocity) * 0.02;  // Proportional to speed
  
  // Billboard facing camera with streak
  // ... (standard billboard + stretch)
  
  vAlpha = smoothstep(0.0, 0.1, particleLife) * smoothstep(1.0, 0.9, particleLife);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Particle Count:** 10,000-50,000 for heavy rain (GPU instanced, < 1ms draw call)

### 4.3 Light Shaft Implementation

**Technique:** Sample shadow map along view ray, accumulate illuminated segments.

```glsl
// In fog raymarch loop
if (uLightShaftsEnabled) {
  // Project position into shadow map space
  vec4 shadowCoord = uShadowMatrix * vec4(pos, 1.0);
  shadowCoord.xyz /= shadowCoord.w;
  
  // Sample shadow map (is this point in light or shadow?)
  float shadow = texture(uShadowMap, shadowCoord.xy).r;
  float inLight = step(shadowCoord.z - 0.001, shadow);  // Bias
  
  // Accumulate in-scatter only where lit
  vec3 inscatter = uSunColor * inLight * fogDensity * phase;
  totalLight += transmittance * inscatter * stepSize;
}
```

This creates visible shafts of light through fog/smoke where the sun penetrates gaps in geometry (trees, buildings, windows).

---

## 5. LOD 1: Mid-Distance Local (50m-5km)

### 5.1 What This Covers

**Phenomena:**
- Cumulus cloud bases and tops (flat base, billowy top)
- Stratocumulus layers (overcast, broken)
- Rain curtains (virga — rain that evaporates before reaching ground)
- Crepuscular rays (god rays from cloud edges)
- Cloud shadows on ground
- Turbulent cloud edges (Kelvin-Helmholtz waves)

**Physical Character:**
- Clouds have 3D volumetric structure
- Multiple scattering is critical (clouds are NOT transparent)
- Silver lining and bright edges from forward scatter
- Dark bases from shadowing (optical depth ~5-20 through cumulus)
- Flat bottoms at condensation level (lifting condensation level, LCL)

### 5.2 Rendering Technique: Full Volumetric Raymarch

**This is the core of the system.** We already have `VolumetricCloudVolume` with 3 quality tiers.

**Enhancement Needed:**

1. **Weather-driven density** from FieldStack (DEEP_WEATHER_TERRAIN_OPTICS_INTEGRATION)
2. **3-layer vertical structure** (cumulus 1-3km, altocumulus 3-6km, cirrus 6-12km)
3. **Multiple scattering approximation** (powder effect, 4 octaves)
4. **Terrain interaction** (orographic enhancement, cloud shadows)

**Density Function (LOD 1):**

```glsl
// LOD 1: Full volumetric cloud density with weather driving
float lod1Density(vec3 worldPos, float time) {
  // Convert to weather texture UV (lat/lon or local XZ)
  vec2 weatherUV = worldToWeatherUV(worldPos);
  
  // Sample weather driver textures
  vec4 tex0 = texture(uTex0, weatherUV);  // cloudLow, cloudMid, cloudHigh, stormIntensity
  vec4 tex1 = texture(uTex1, weatherUV);  // frontIntensity, vorticity, humidity, wetness
  vec4 tex2 = texture(uTex2, weatherUV);  // windU, windV, lift, terrainHeight
  
  float altitude = worldPos.y;
  float terrainHeight = tex2.a * 8848.0;  // Unpack
  float altitudeAboveTerrain = altitude - terrainHeight;
  
  // Determine which cloud layer we're in
  float cloudLowBase = 1000.0;   // meters AGL
  float cloudLowTop = 2500.0;
  float cloudMidBase = 3000.0;
  float cloudMidTop = 5000.0;
  float cloudHighBase = 6000.0;
  float cloudHighTop = 12000.0;
  
  float density = 0.0;
  
  // Low clouds (cumulus)
  if (altitudeAboveTerrain > cloudLowBase && altitudeAboveTerrain < cloudLowTop) {
    float t = (altitudeAboveTerrain - cloudLowBase) / (cloudLowTop - cloudLowBase);
    float heightGradient = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.7, t);  // Flat base, round top
    
    // 3D noise for shape
    vec3 noisePos = worldPos * 0.0005 + vec3(time * 0.01, 0, 0);
    float shape = fbm3D(noisePos, 5);  // 5 octaves
    
    // Weather-driven coverage
    float coverage = tex0.r;  // cloudLow from weather
    float coverageMask = smoothstep(1.0 - coverage, 1.0, shape);
    
    // Erosion (high-freq detail at edges)
    float erosion = worley3D(noisePos * 3.0) * 0.3;
    
    density += (coverageMask - erosion) * heightGradient * tex0.r;
  }
  
  // Mid clouds (altocumulus)
  if (altitudeAboveTerrain > cloudMidBase && altitudeAboveTerrain < cloudMidTop) {
    float t = (altitudeAboveTerrain - cloudMidBase) / (cloudMidTop - cloudMidBase);
    float heightGradient = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.85, t);
    
    vec3 noisePos = worldPos * 0.0003 + vec3(time * 0.015, 0, 0);
    float shape = fbm3D(noisePos, 4);
    float coverage = tex0.g;  // cloudMid from weather
    float coverageMask = smoothstep(1.0 - coverage, 1.0, shape);
    
    density += coverageMask * heightGradient * tex0.g * 0.8;
  }
  
  // High clouds (cirrus)
  if (altitudeAboveTerrain > cloudHighBase && altitudeAboveTerrain < cloudHighTop) {
    float t = (altitudeAboveTerrain - cloudHighBase) / (cloudHighTop - cloudHighBase);
    float heightGradient = smoothstep(0.0, 0.2, t) * smoothstep(1.0, 0.8, t);
    
    vec3 noisePos = worldPos * 0.0001 + vec3(time * 0.02, 0, 0);  // Larger scale, faster
    float shape = fbm3D(noisePos, 3);
    float coverage = tex0.b;  // cloudHigh from weather
    float coverageMask = smoothstep(1.0 - coverage, 1.0, shape);
    
    density += coverageMask * heightGradient * tex0.b * 0.4;  // Thinner
  }
  
  // Storm enhancement
  density *= 1.0 + tex0.a * 2.0;  // stormIntensity boosts all layers
  
  return max(density, 0.0);
}
```

### 5.3 Multiple Scattering (Powder Effect)

**Why single-scatter fails for clouds:**

A cumulus cloud has optical depth τ ≈ 10-50. Single-scatter (one light-to-camera event) predicts clouds should be nearly black on the non-sun side. But real clouds are bright all around because light bounces 10-50 times inside.

**Approximation (energy-conserving powder, Schneider 2015):**

```glsl
float multiScatterApprox(float density, float cosAngle, float height01) {
  // "Powder sugar" effect: dense regions scatter more light
  float powder = 1.0 - exp(-density * 2.0);
  
  // Height-dependent darkening (bases are darker)
  float heightFactor = mix(0.3, 1.0, height01);
  
  // Beers-Powder: combines Beer's law with powder
  float beersPowder = exp(-density) * (1.0 - exp(-density * 2.0));
  
  return beersPowder * heightFactor;
}
```

---

## 6. LOD 2: Far Horizon (5km-100km)

### 6.1 What This Covers

**Phenomena:**
- Distant cloud layers visible as flat slabs (stratiform)
- Cumulus towers on the horizon (silhouette only)
- Aerial perspective (blue haze increasing with distance)
- Layered effect: low clouds in front, high clouds behind
- Atmospheric scattering creating horizon glow

**Physical Character:**
- Cloud detail is below pixel resolution — we see aggregate coverage
- Rayleigh scattering becomes significant (blue haze)
- Clouds look like flat sheets from ground level
- Only the tallest clouds (cumulonimbus) have visible vertical extent

### 6.2 Rendering Technique: 2D Sheet Clouds + Thin-Slab Raymarch

**This is where Earth Engine-style 2D clouds are PERFECT.** At 5-100km, cumulus look flat from ground. We intersect the ray with horizontal planes at cloud layer altitudes and sample 2D coverage.

**For cirrus and high clouds:** Use a separate sheet at higher altitude with different FBM.
**For cumulonimbus towers:** Extrude select cells into short 3D slabs (low step count).

**Implementation:**

```glsl
// LOD 2: Far horizon clouds (2D sheets with optional thin slab)
vec4 lod2Clouds(vec3 ro, vec3 rd, float distNear, float distFar) {
  vec3 totalLight = vec3(0.0);
  float totalTransmittance = 1.0;
  
  // For each cloud layer (low, mid, high)
  float layerAltitudes[3] = float[3](1500.0, 4000.0, 8000.0);
  float layerThickness[3] = float[3](1500.0, 2000.0, 4000.0);
  
  for (int layer = 0; layer < 3; layer++) {
    float altitude = layerAltitudes[layer];
    
    // Intersect ray with horizontal plane
    float t = (altitude - ro.y) / rd.y;
    if (t < distNear || t > distFar || rd.y <= 0.001) continue;
    
    vec3 hitPos = ro + rd * t;
    vec2 weatherUV = worldToWeatherUV(hitPos);
    
    // Sample weather for this layer
    float coverage;
    if (layer == 0) coverage = texture(uTex0, weatherUV).r;
    else if (layer == 1) coverage = texture(uTex0, weatherUV).g;
    else coverage = texture(uTex0, weatherUV).b;
    
    if (coverage < 0.01) continue;
    
    // 2D FBM for cloud shape (Earth Engine style)
    float shape = cloudBaseShape(hitPos.xz, uTime);
    float mask = smoothstep(1.0 - coverage, 1.0, shape) * coverage;
    
    if (mask < 0.01) continue;
    
    // Aerial perspective: fade cloud color toward sky with distance
    float dist = length(hitPos - ro);
    float aerialFade = exp(-dist * 5.8e-6);  // Rayleigh extinction
    
    // Cloud lighting (simplified: no light march at this distance)
    float sunDot = max(dot(rd, uSunDirection), 0.0);
    float silverLining = pow(sunDot, 8.0) * uSilverLining;
    float ambient = uAmbient;
    vec3 cloudColor = uSunColor * (ambient + silverLining);
    
    // Apply aerial perspective
    cloudColor = mix(uSkyColor, cloudColor, aerialFade);
    
    // Composite (front-to-back)
    float opacity = mask * aerialFade;
    totalLight += totalTransmittance * opacity * cloudColor;
    totalTransmittance *= (1.0 - opacity);
  }
  
  return vec4(totalLight, 1.0 - totalTransmittance);
}
```

**Key Insight:** This is very cheap (3 plane intersections, 3 texture samples) and produces the realistic "layered horizon" effect. The aerial perspective is what sells the distance — clouds fade to blue/gray with distance.

---

## 7. LOD 3: Near Orbital (100-500km)

### 7.1 What This Covers

**Phenomena:**
- Cloud tops visible from above (flat to slightly lumpy)
- Cloud systems as coherent weather patterns (fronts, spirals)
- Atmosphere limb (thin bright line at planet edge)
- Earth curvature clearly visible
- Clouds cast shadows on each other and on ground

**Physical Character:**
- Looking DOWN at clouds (opposite of LOD 0-2 which look UP)
- Cloud layers appear as textured surfaces from above
- Rayleigh atmosphere is a thin shell between viewer and surface
- Single-scatter approximation reasonable for atmosphere
- Multiple cloud layers visible as stacked surfaces

### 7.2 Rendering Technique: Spherical Shell Raymarch

**This is where `VolumetricCloudShell` operates.** The key enhancement needed is:
- Higher resolution weather textures for near-orbital
- Visible cloud-top texture detail
- Atmosphere (Rayleigh/Mie) shell between camera and clouds

**Why this LOD is special:** You're close enough that individual cumulus systems should be distinguishable (100-500km ≈ 100-500 pixels at 0.1° resolution), but far enough that full 3D raymarch per-pixel is unnecessary for most of the view.

**Approach:** Use spherical shell raymarch (existing) but with:
- Higher step count (64) for near-orbital
- Rayleigh atmosphere integrated along same ray
- Cloud-top normal estimation for lighting

```glsl
// LOD 3: Near-orbital shell with atmosphere
vec4 lod3Clouds(vec3 ro, vec3 rd) {
  // Ray-sphere intersection for cloud shell (inner + outer)
  float earthR = uEarthRadius;
  float cloudInner = earthR + 1000.0;   // Cloud base
  float cloudOuter = earthR + 12000.0;  // Cloud top
  float atmosOuter = earthR + 80000.0;  // Atmosphere top
  
  // Intersect atmosphere
  float tAtmNear, tAtmFar;
  if (!intersectSphere(ro, rd, vec3(0), atmosOuter, tAtmNear, tAtmFar)) return vec4(0);
  
  // Intersect cloud shell
  float tCloudNear, tCloudFar;
  bool hitsCloud = intersectSphere(ro, rd, vec3(0), cloudOuter, tCloudNear, tCloudFar);
  float tCloudInnerNear, tCloudInnerFar;
  bool hitsInner = intersectSphere(ro, rd, vec3(0), cloudInner, tCloudInnerNear, tCloudInnerFar);
  
  // Raymarch through atmosphere + cloud shell
  float t = max(tAtmNear, 0.0);
  float tEnd = tAtmFar;
  int steps = 64;
  float stepSize = (tEnd - t) / float(steps);
  
  vec3 totalRayleigh = vec3(0.0);
  vec3 totalMie = vec3(0.0);
  float totalCloudLight = 0.0;
  float transmittance = 1.0;
  
  for (int i = 0; i < steps; i++) {
    vec3 pos = ro + rd * (t + stepSize * 0.5);
    float altitude = length(pos) - earthR;
    
    // Rayleigh + Mie density
    float rDens = exp(-altitude / 8500.0);
    float mDens = exp(-altitude / 1200.0);
    
    // Cloud density (if within cloud shell)
    float cloudDens = 0.0;
    if (altitude > 1000.0 && altitude < 12000.0) {
      vec2 latLon = geocentricToLatLon(pos);
      vec2 weatherUV = latLonToUV(latLon);
      
      vec4 weather = texture(uTex0, weatherUV);
      
      // Determine sub-layer
      float t01 = (altitude - 1000.0) / 11000.0;
      if (t01 < 0.15) cloudDens = weather.r * smoothstep(0.0, 0.1, t01);  // Low
      else if (t01 < 0.5) cloudDens = weather.g * smoothstep(0.15, 0.2, t01) * smoothstep(0.5, 0.45, t01);
      else cloudDens = weather.b * smoothstep(0.5, 0.55, t01) * smoothstep(1.0, 0.9, t01);
      
      // Add 3D noise detail (spherical)
      float noise = fbm3D(pos * 0.00005, 3);
      cloudDens *= smoothstep(0.3, 0.7, noise);
    }
    
    // Extinction
    float rayleighExt = rDens * 5.8e-6 * stepSize;
    float mieExt = mDens * 2.0e-5 * stepSize;
    float cloudExt = cloudDens * 0.05 * stepSize;
    float totalExt = rayleighExt + mieExt + cloudExt;
    
    // In-scatter (sun light reaching this point)
    // ... (simplified: use pre-computed optical depth lookup or short light march)
    
    transmittance *= exp(-totalExt);
    t += stepSize;
    
    if (transmittance < 0.01) break;
  }
  
  // Composite
  return vec4(totalRayleigh + totalMie + totalCloudLight, 1.0 - transmittance);
}
```

---

## 8. LOD 4: Far Orbital / Planetary (500km+)

### 8.1 Rendering Technique: Shell with Reduced Detail

Same as LOD 3 but with distance-adaptive step reduction (existing in `VolumetricCloudShell`).

**Enhancements:**
- Reduce to 16-32 steps at extreme distance
- Switch to 2D weather texture sampling only (no 3D noise)
- Pre-computed atmosphere LUT (no per-pixel atmosphere raymarch)

---

## 9. LOD 5: Deep Space (10,000km+)

### 9.1 Rendering Technique: Textured Sphere + Atmosphere Rim

At extreme distance, the atmosphere is a single-pixel-wide rim. Clouds are baked into a texture.

```glsl
// LOD 5: Simple sphere with pre-baked cloud texture
void lod5Planet(vec3 ro, vec3 rd) {
  float t;
  if (!intersectSphere(ro, rd, uEarthCenter, uEarthRadius, t, _)) return;
  
  vec3 hitPos = ro + rd * t;
  vec2 uv = sphereToUV(normalize(hitPos - uEarthCenter));
  
  // Base terrain color
  vec3 surfaceColor = texture(uEarthTexture, uv).rgb;
  
  // Cloud overlay
  float cloudCoverage = texture(uCloudTexture, uv).r;  // From weather system
  vec3 cloudColor = vec3(1.0) * (0.7 + 0.3 * dot(normalize(hitPos - uEarthCenter), uSunDirection));
  surfaceColor = mix(surfaceColor, cloudColor, cloudCoverage * 0.8);
  
  // Atmosphere rim glow
  float rimDot = 1.0 - abs(dot(normalize(hitPos - uEarthCenter), rd));
  float atmosGlow = pow(rimDot, 4.0) * 0.5;
  surfaceColor += vec3(0.3, 0.5, 1.0) * atmosGlow;
  
  gl_FragColor = vec4(surfaceColor, 1.0);
}
```

---

## 10. Seamless Transition System

### 10.1 The Critical Problem

**How do you fly from inside fog (LOD 0) to outer space (LOD 5) without ANY visible pop, seam, or discontinuity?**

**Answer:** Overlapping bands with smooth crossfade, unified density source, and careful normalization.

### 10.2 Band Overlap and Blending

```
Camera Altitude (log scale):
  1m     10m     100m     1km     10km     100km    1Mm    10Mm
  |───────|───────|───────|────────|────────|───────|──────|
  ├─ LOD 0 ──┤                                              
         ├────── LOD 1 ─────┤                                
                    ├────── LOD 2 ──────┤                    
                                  ├───── LOD 3 ──────┤       
                                             ├── LOD 4 ──┤   
                                                    ├ LOD5┤  
                                                              
  Overlap zones (crossfade regions):                          
       ├0↔1┤                                                  
                ├1↔2┤                                         
                             ├2↔3┤                            
                                        ├3↔4┤                
                                                ├4↔5┤        
```

**Crossfade Function:**

```typescript
function computeLODWeights(cameraAltitude: number): LODWeights {
  // Band boundaries (meters above terrain)
  const bands = [
    { lod: 0, fadeIn: 0,     full: 0,      fadeOut: 30,      gone: 80 },
    { lod: 1, fadeIn: 20,    full: 80,     fadeOut: 3000,    gone: 8000 },
    { lod: 2, fadeIn: 2000,  full: 8000,   fadeOut: 50000,   gone: 150000 },
    { lod: 3, fadeIn: 80000, full: 150000, fadeOut: 400000,  gone: 600000 },
    { lod: 4, fadeIn: 400000,full: 600000, fadeOut: 5000000, gone: 10000000 },
    { lod: 5, fadeIn: 5000000,full:10000000,fadeOut: Infinity,gone: Infinity },
  ];
  
  const weights = new Float32Array(6);
  
  for (const band of bands) {
    const alt = cameraAltitude;
    let w = 0;
    
    if (alt < band.fadeIn) w = 0;
    else if (alt < band.full) w = smoothstep(band.fadeIn, band.full, alt);
    else if (alt < band.fadeOut) w = 1;
    else if (alt < band.gone) w = 1 - smoothstep(band.fadeOut, band.gone, alt);
    else w = 0;
    
    weights[band.lod] = w;
  }
  
  // Normalize so total = 1 (prevents over-brightening in overlap zones)
  const total = weights.reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (let i = 0; i < 6; i++) weights[i] /= total;
  }
  
  return weights;
}
```

### 10.3 R3F Implementation of Transitions

```tsx
// UnifiedAtmosphereManager.tsx
function UnifiedAtmosphereManager({ weatherData, terrainData }: Props) {
  const { camera } = useThree();
  const weightsRef = useRef(new Float32Array(6));
  
  useFrame(() => {
    // Compute camera altitude
    const altitude = computeAltitude(camera.position, earthCenter, earthRadius);
    
    // Compute LOD weights
    const weights = computeLODWeights(altitude);
    weightsRef.current = weights;
    
    // Update each LOD system's opacity/visibility
    if (lod0Ref.current) lod0Ref.current.material.uniforms.uOpacity.value = weights[0];
    if (lod1Ref.current) lod1Ref.current.material.uniforms.uOpacity.value = weights[1];
    if (lod2Ref.current) lod2Ref.current.material.uniforms.uOpacity.value = weights[2];
    if (lod3Ref.current) lod3Ref.current.material.uniforms.uOpacity.value = weights[3];
    if (lod4Ref.current) lod4Ref.current.material.uniforms.uOpacity.value = weights[4];
    if (lod5Ref.current) lod5Ref.current.material.uniforms.uOpacity.value = weights[5];
    
    // Disable rendering for LODs with weight = 0 (save GPU)
    if (lod0Ref.current) lod0Ref.current.visible = weights[0] > 0.001;
    if (lod1Ref.current) lod1Ref.current.visible = weights[1] > 0.001;
    // etc.
  });
  
  return (
    <group>
      {/* LOD 0: Ground fog + particles */}
      <LOD0GroundFog ref={lod0Ref} config={lod0Config} weatherData={weatherData} />
      
      {/* LOD 1: Volumetric cloud volume */}
      <LOD1CloudVolume ref={lod1Ref} config={lod1Config} weatherData={weatherData} />
      
      {/* LOD 2: 2D sheet clouds + aerial perspective */}
      <LOD2HorizonClouds ref={lod2Ref} config={lod2Config} weatherData={weatherData} />
      
      {/* LOD 3: Near-orbital shell */}
      <LOD3OrbitalShell ref={lod3Ref} config={lod3Config} weatherData={weatherData} />
      
      {/* LOD 4: Far-orbital shell (reduced detail) */}
      <LOD4PlanetaryShell ref={lod4Ref} config={lod4Config} weatherData={weatherData} />
      
      {/* LOD 5: Deep space sphere */}
      <LOD5DeepSpacePlanet ref={lod5Ref} config={lod5Config} weatherData={weatherData} />
    </group>
  );
}
```

### 10.4 Density Coherence Across LODs

**The key to seamless transitions:** ALL LODs sample from the SAME weather data (FieldStack → tex0/1/2), just at different resolutions and with different detail levels.

```
LOD 0: density = weatherCoverage × highFreqNoise × fogFalloff
LOD 1: density = weatherCoverage × midFreqNoise × heightGradient
LOD 2: density = weatherCoverage × lowFreqNoise (2D sheet)
LOD 3: density = weatherCoverage × minimalNoise (shell)
LOD 4: density = weatherCoverage (shell, no noise)
LOD 5: density = weatherCoverage (baked texture)
```

**As you transition between LODs, the COVERAGE is identical** (same tex0 sample). What changes is the noise detail level. This ensures the cloud pattern is coherent across all scales.

---

## 11. Unified Data Pipeline

### 11.1 Single FieldStack → All LODs

```
FieldStack (512×256 grid)
    │
    ├─→ encodeTextures() → tex0, tex1, tex2, texOptics, texPrecip
    │
    └─→ All 6 LODs sample these textures:
         LOD 0: tex1 (humidity/wetness for fog), texPrecip (rain/snow)
         LOD 1: tex0 (cloud layers), tex1 (humidity/wind), tex2 (wind/lift/terrain)
         LOD 2: tex0 (cloud layers), texOptics (aerial perspective)
         LOD 3: tex0 (cloud layers), texOptics (atmosphere)
         LOD 4: tex0 (cloud layers, low-res)
         LOD 5: Pre-baked from tex0 (snapshot)
```

---

## 12. R3F Architecture

### 12.1 Component Tree

```tsx
<Canvas>
  <WeatherSystemProvider>     {/* FieldStack + weather simulation */}
    <TerrainProvider>          {/* V6 terrain + height field */}
      <LightingProvider>       {/* Shared sun + sky */}
        
        <UnifiedAtmosphereManager>  {/* LOD weight calculation */}
          <LOD0GroundFog />         {/* Camera-centered box, particles */}
          <LOD1CloudVolume />       {/* Camera-centered box, full raymarch */}
          <LOD2HorizonClouds />     {/* 2D sheet intersections */}
          <LOD3OrbitalShell />      {/* Spherical shell, 64 steps */}
          <LOD4PlanetaryShell />    {/* Spherical shell, 16-32 steps */}
          <LOD5DeepSpacePlanet />   {/* Textured sphere */}
        </UnifiedAtmosphereManager>
        
        <Terrain />              {/* Ground mesh */}
        <Ocean />                {/* Water surface */}
        <PrecipitationParticles /> {/* Rain/snow GPU particles */}
        
      </LightingProvider>
    </TerrainProvider>
  </WeatherSystemProvider>
</Canvas>
```

---

## 13. Performance Budget

### 13.1 Per-LOD GPU Time (Target @ 1080p, RTX 3060)

| LOD | Technique | Steps | GPU Time | Active When |
|-----|-----------|-------|----------|-------------|
| LOD 0 | Fog raymarch + particles | 64 + 50k instances | 2 ms | On ground (0-80m) |
| LOD 1 | Cloud volume raymarch | 64-128 | 5 ms | Near (20m-8km) |
| LOD 2 | 2D sheet (3 layers) | 3 intersections | 0.5 ms | Mid (2-150km) |
| LOD 3 | Shell raymarch | 64 | 4 ms | Orbital (80-600km) |
| LOD 4 | Shell raymarch (reduced) | 16-32 | 2 ms | Far orbital (400km-10Mm) |
| LOD 5 | Textured sphere | 1 pass | 0.5 ms | Deep space (5Mm+) |

**At most 2-3 LODs active simultaneously** (overlap zones).

**Worst Case (ground level):** LOD 0 (2ms) + LOD 1 (5ms) = 7ms → 143 FPS overhead (acceptable)

**Worst Case (orbital transition):** LOD 2 (0.5ms) + LOD 3 (4ms) = 4.5ms → 222 FPS overhead (excellent)

**Total Frame Budget:** 16.7ms (60 FPS). Atmosphere: 7ms max. Remaining: 9.7ms for terrain, geometry, UI, post-process.

---

## 14. Existing Asset Integration

### 14.1 Mapping Existing Code to LODs

| Existing Asset | Current LOD | Target LOD | Changes Needed |
|----------------|-------------|------------|----------------|
| `VolumetricFogVolume` | Ground (basic) | **LOD 0** | Add particles, light shafts, higher detail noise |
| `VolumetricCloudVolume` (full) | Near (good) | **LOD 1** | Add weather driving, 3-layer vertical, multi-scatter |
| `VolumetricCloudVolume` (fast) | Near (simplified) | **LOD 1 fallback** | Use as low-quality mode |
| Earth Engine 2D clouds | N/A (separate app) | **LOD 2** | Port cloud shape function, add aerial perspective |
| `VolumetricCloudShell` | Far/orbital | **LOD 3-4** | Split into near/far orbital, add atmosphere |
| `CloudShellLayer` | Legacy | **Remove** | Superseded by LOD 4 |
| N/A | N/A | **LOD 5** | New: textured sphere + atmosphere rim |

### 14.2 Migration Strategy

**Phase 1:** Wrap existing assets in LOD manager with weight-based blending
**Phase 2:** Enhance each LOD to meet specifications above
**Phase 3:** Add missing LODs (LOD 2, LOD 5)
**Phase 4:** Tune transitions, performance, visual coherence

---

## 15. Implementation Roadmap

### Week 1-2: LOD Manager + Existing Integration

- [ ] Build `UnifiedAtmosphereManager` with weight calculation
- [ ] Wrap `VolumetricFogVolume` as LOD 0
- [ ] Wrap `VolumetricCloudVolume` as LOD 1
- [ ] Wrap `VolumetricCloudShell` as LOD 3-4
- [ ] Implement basic crossfade transitions
- [ ] Test: Fly from ground to orbit, verify no gaps

### Week 3-4: LOD 0 Enhancement

- [ ] Add GPU rain/snow particles
- [ ] Add volumetric light shafts
- [ ] Enhance fog noise (6 octaves, turbulent wisps)
- [ ] Add smoke/steam support
- [ ] Test: Walk through fog with visible detail

### Week 5-6: LOD 2 (Far Horizon) + LOD 5 (Deep Space)

- [ ] Implement 2D sheet cloud system (Earth Engine style)
- [ ] Add aerial perspective (Rayleigh)
- [ ] Implement deep space planet view (textured sphere + rim)
- [ ] Test: Full scale transition ground → space

### Week 7-8: Weather Integration + Polish

- [ ] Connect FieldStack to all LODs
- [ ] Ensure density coherence across transitions
- [ ] Tune crossfade curves for visual quality
- [ ] Performance optimization pass
- [ ] Final regression testing

---

## Revision History

| Date | Change |
|------|--------|
| 2026-02-04 | Initial specification: 6-LOD system from first principles. Radiative transfer theory, Beer-Lambert, Rayleigh/Mie scattering, altitude-dependent density, phase functions. Per-LOD rendering techniques, GLSL implementations, R3F architecture, performance budget, transition system, existing asset mapping, implementation roadmap. |

---

**END OF DOCUMENT**

**Status:** ✅ **FIRST-PRINCIPLES ATMOSPHERIC RENDERING SPECIFICATION**  
**Ready for:** Implementation starting with LOD manager and existing asset integration

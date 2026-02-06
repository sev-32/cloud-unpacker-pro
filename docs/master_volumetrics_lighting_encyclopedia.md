# MASTER VOLUMETRICS & LIGHTING ENCYCLOPEDIA

**[TAG:SAM] [TAG:MASTER] [TAG:VOLUMETRICS] [TAG:LIGHTING]**

**Purpose:** Exhaustive NL/syntax/code analysis and descriptive relationship mapping for volumetrics and lighting in reality and in gaming/computer cinematics. Single source of truth for physics, terminology, translation to real-time rendering, and ProEarth codebase alignment.

**Date:** 2026-02-03  
**Scope:** Reality (atmospheric science, radiative transfer, participating media) → Gaming/Cinematics (techniques, APIs, shaders) → ProEarth (boltbestclouds32, bestclouds, bfwe-testbed)  
**Status:** Living – extend with new systems and references

---

## 0. HOW TO NAVIGATE THIS DOC

**If you are new:** Start with §1 (Overview) and §2 (Reality) to build a mental model of physics and terminology. Use §9 (Descriptive Relationship Mapping) to see exactly how each real-world concept maps to game terms and ProEarth code symbols.

**If you are debugging:** Use §7 (Constraints & Performance) for failure modes and §8 (Evidence & Code Anchors) for file paths. Use §4.4 (Quick Symbol Lookup) to find which uniform or function implements a concept in each system.

**If you are adding a new cloud/volumetric system:** Add your file to §4.2 (ProEarth File Locations) and §8.1 (Code Anchors); add a row to §9 for each new concept; extend the Glossary if you introduce new terms. Keep §6 (Interfaces) in sync with your uniforms.

**If you are aligning UI to engine:** See §6.2 (UI → Engine) and the relationship matrix in §8.2. For WorldBuilder/FieldStack cloud layers, see also `00_MASTER_PROJECT_SYSTEM_MAP.md` and `sources/MASTER_ATMOSPHERE_SYSTEM_MAP.md` (atmosphere drawer, CloudVolumetricRenderer, FIELD_TYPES CLOUD_*, driver→volumetrics contracts).

**If you are comparing cloud systems (boltbestclouds32 vs bestclouds vs bfwe-testbed):** Use §4.4 (Quick Symbol Lookup) and §4.2 (ProEarth File Locations); for performance vs quality tradeoffs see §7.3 (Performance Budgets). Full comparison is in `GPTworking/VOLUMETRIC_CLOUDS_AUDIT_AND_MASTER.md`.

**Cross-references:** This encyclopedia is the SAM subsystem map for volumetrics and lighting. The master project map is `sources/00_MASTER_PROJECT_SYSTEM_MAP.md`. Procedural Earth engine detail is in `boltbestclouds32/.../docs/SAM_PROCEDURAL_EARTH_ENGINE.md`. Cloud system comparison is in `GPTworking/VOLUMETRIC_CLOUDS_AUDIT_AND_MASTER.md`.

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Reality: Physics & Atmospheric Science](#2-reality-physics--atmospheric-science)
3. [Translation: Reality → Gaming/Cinematics](#3-translation-reality--gamingcinematics)
4. [Static Structure Map (Components)](#4-static-structure-map-components)
5. [Dynamic Behavior Map (Flows)](#5-dynamic-behavior-map-flows)
6. [Interface & Integration Map](#6-interface--integration-map)
7. [Constraints & Performance](#7-constraints--performance)
8. [Evidence & Code Anchors](#8-evidence--code-anchors)
9. [Descriptive Relationship Mapping (Exhaustive)](#9-descriptive-relationship-mapping-exhaustive)
10. [Implementation Patterns & Anti-Patterns](#10-implementation-patterns--anti-patterns)
11. [Troubleshooting Flowchart](#11-troubleshooting-flowchart)
12. [Glossary (Expanded)](#12-glossary-expanded-with-cross-references)
13. [References](#13-references)
14. [Performance Cost Analysis](#14-performance-cost-analysis-quantitative)
15. [Historical Context & Evolution](#15-historical-context--evolution)
16. [Future Directions & Research](#16-future-directions--research)
17. [Comprehensive System Comparison](#17-comprehensive-system-comparison)
18. [Complete Shader Execution Walkthrough](#18-complete-shader-execution-walkthrough)
19. [Common Mistakes & Edge Cases](#19-common-mistakes--edge-cases)
20. [Artist Guidelines (Non-Technical)](#20-artist-guidelines-non-technical)
21. [Performance Tuning Guide](#21-performance-tuning-guide)
22. [Quick Reference Card](#22-quick-reference-card)

---

## 1. SYSTEM OVERVIEW

**[TAG:OVERVIEW] [TAG:VOLUMETRICS] [TAG:LIGHTING]**

### What This Encyclopedia Covers

- **Reality:** How light and volumetric phenomena work in the real world: radiative transfer equation (RTE), Rayleigh and Mie scattering, absorption, phase functions, participating media, wavelength dependence, extinction, transmittance, crepuscular rays, cloud microphysics.
- **Gaming/Cinematics:** How these concepts are translated into real-time and offline rendering: raymarching, LOD, Perlin-Worley noise, Henyey-Greenstein, Beer-Lambert transmittance, god rays as post-process, TAA, Frostbite/Hillaire energy-conserving integration, silver lining, powder effect.
- **ProEarth:** Where each concept appears in code (boltbestclouds32, bestclouds(faster), bfwe-testbed), which uniforms/symbols implement which physical quantity, and how subsystems relate.

### Five Dimensions (SAM Schema)

| Dimension | Content |
|-----------|---------|
| **Structure** | Sky, clouds, fog, god rays, phase functions, noise, LOD; component hierarchy and file locations. |
| **Behavior** | Render order, multi-pass flows, temporal reprojection, LOD step selection. |
| **Interfaces** | Uniforms, shader entry points, UI params → engine options. |
| **Constraints** | Step counts, resolution, driver limits, performance budgets. |
| **Evidence** | Code anchors, relationship matrix, glossary, references. |

### Scope (Included / Excluded)

**Included:**
- Atmospheric scattering (Rayleigh, Mie) in reality and in shaders.
- Volumetric clouds: density, raymarching, light marching, phase functions, multiple scattering approximation.
- Volumetric fog, god rays (crepuscular rays), silver lining, powder effect.
- Participating media: absorption, scattering, extinction, transmittance.
- Perlin-Worley and procedural noise for clouds.
- LOD, temporal reprojection, half-res passes.
- ProEarth implementations: ProceduralEarth.tsx, bestclouds image.glsl, bfwe-testbed volumetricCloudShader.ts.

**Excluded (for now):**
- Ocean subsurface scattering (separate SAM map).
- Vegetation/leaf translucency.
- Full path tracing / offline-only methods.

**[END:TAG:OVERVIEW]**

---

## 2. REALITY: PHYSICS & ATMOSPHERIC SCIENCE

**[TAG:STRUCTURE] [TAG:VOLUMETRICS]**

### Key Equations (Reference)

| Concept | Equation | Use in games |
|---------|----------|--------------|
| **Transmittance (Beer–Lambert)** | T = exp(−∫ σ_t ds) | Per-step: `transmittance *= exp(-density * stepSize * coeff)` |
| **In-scatter (single scatter)** | L += ∫ T(s) σ_s P(θ) L_sun e^(-τ_light) ds | Luminance accumulation in raymarch loop |
| **Rayleigh phase** | P(cos θ) = (3/(16π))(1 + cos² θ) | Sky scattering in `rayleighPhase(cosTheta)` |
| **Henyey–Greenstein** | P(cos θ) = (1−g²) / (4π (1+g²−2g cos θ)^(3/2)) | Clouds/fog: `hgPhase(cosTheta, g)` |
| **Optical depth** | τ = ∫ σ_t ds | Light march: `lightAccum += density*stepSize`; then T_light = exp(-coeff*lightAccum) |

### 2.1 Participating Media (Detailed)

**NL description:** A *participating medium* is any medium that absorbs, emits, or scatters light along a ray. In reality: atmosphere, clouds, fog, smoke, water. In games: same concepts; we model them with density fields and coefficients.

**Key quantities (reality):**

1. **Absorption coefficient** σ_a(λ) [units: m⁻¹ or km⁻¹]
   - Power lost to absorption per unit distance.
   - Wavelength-dependent: ozone absorbs UV; water vapor absorbs IR; etc.
   - **Physical meaning:** Probability per unit distance that a photon is absorbed.
   - **Typical values:** Clear air σ_a ≈ 10⁻⁵ km⁻¹; fog/cloud σ_a ≈ 0 (high albedo).

2. **Scattering coefficient** σ_s(λ) [units: m⁻¹ or km⁻¹]
   - Power redirected by scattering per unit distance.
   - **Rayleigh (molecular):** σ_s ∝ λ⁻⁴; air at sea level σ_s(550nm) ≈ 0.012 km⁻¹.
   - **Mie (aerosol/cloud):** Weakly wavelength-dependent; cloud σ_s ≈ 5–50 km⁻¹ depending on droplet concentration.
   - **Physical meaning:** Probability per unit distance that a photon scatters.

3. **Extinction coefficient** σ_t = σ_a + σ_s [units: m⁻¹ or km⁻¹]
   - Total attenuation (removal from ray) per unit distance.
   - **Physical meaning:** σ_t·dx is the fraction of photons removed from the beam in distance dx.
   - **Games:** We often use σ_t ≈ σ_s (assume σ_a ≈ 0 for clouds).

4. **Single-scattering albedo** ω = σ_s / σ_t [dimensionless, 0–1]
   - Fraction of extinction that is scattering (vs absorption).
   - **Clouds:** ω ≈ 0.99–1.0 (highly scattering, little absorption).
   - **Soot/smoke:** ω ≈ 0.2–0.6 (high absorption, dark).
   - **Games:** Implicit in how we compute luminance; if we skip σ_a, we assume ω=1.

**Relationship:** In clear sky, Rayleigh dominates (σ_s ∝ λ⁻⁴); in aerosols/clouds, Mie dominates. Clouds have high albedo (ω ≈ 1); soot has low albedo.

**Size parameter:** x = πD/λ where D is particle diameter. x ≪ 1 → Rayleigh; x ≈ 1 → Mie; x ≫ 1 → geometric optics. Air molecules D ≈ 0.3 nm, λ ≈ 500 nm → x ≈ 0.002 (Rayleigh). Cloud droplets D ≈ 10 μm, λ ≈ 500 nm → x ≈ 60 (Mie / geometric).

### 2.2 Radiative Transfer Equation (RTE) – Full Derivation

**NL description:** The RTE describes how radiance I changes along a ray through a participating medium: loss by extinction, gain by emission and in-scattering from all directions.

**General form (reality):**
```
(1/c) ∂I_ν/∂t + Ω·∇I_ν + σ_t ρ I_ν = j_ν ρ + (σ_s ρ)/(4π) ∫_{4π} p(Ω, Ω') I_ν(Ω') dΩ'
```
Where:
- I_ν: Spectral radiance at frequency ν [W/(sr·m²·Hz)]
- Ω: Direction unit vector
- σ_t, σ_s, σ_a: Extinction, scattering, absorption coefficients [m⁻¹]
- ρ: Density [kg/m³]
- j_ν: Emission coefficient [W/(kg·sr·Hz)]
- p(Ω, Ω'): Phase function (scattering from Ω' to Ω); normalized ∫ p dΩ = 4π

**Steady-state, no emission, along ray s:**
```
dI/ds = -σ_t I + (σ_s)/(4π) ∫_{4π} p(Ω, Ω') I(Ω') dΩ'
      = -σ_t I + S(s)

where S(s) = (σ_s)/(4π) ∫ p I dΩ' is the source term (in-scattering).
```

**Single-scattering approximation (games):**
Assume only one bounce: sunlight → point → camera. Then:
```
S(s) ≈ (σ_s)/(4π) p(Θ) L_sun e^{-τ_light(s)}

where:
- Θ: Angle between sun direction and view direction
- L_sun: Solar radiance
- τ_light(s): Optical depth from s to sun (shadow)
```

**Solution (single scatter):**
```
I(s) = I_0 e^{-τ(s)} + ∫_0^s T(s') S(s') ds'

where T(s) = e^{-∫_0^s σ_t ds'} is transmittance.
```

**Discrete approximation (raymarching):**
```
L_out = L_bg · T_total + Σ_i [ T_i · L_in(s_i) · σ_s · ρ(s_i) · Δs ]

where:
- T_i: Transmittance from camera to step i
- L_in(s_i): In-scattered radiance at step i
- Δs: Step size
```

**Energy-conserving integration (Hillaire, eq. 5.6):**
For each step with density ρ, scattering σ_s, extinction σ_t = σ_s + σ_a:
```
T_step = exp(-σ_t ρ Δs)
L_integrate = (L_inscatter - L_inscatter · T_step) / (σ_t ρ)
L_accumulated += T_current · L_integrate
T_current *= T_step
```
This is more accurate than naive `L += T * L_in * Δs` when density is high.

**Translation to games:** We do not solve the full RTE. We approximate:
- **Single scattering:** One bounce (sun → point → camera); cheap, used for god rays and cheap fog.
- **Multiple scattering approximation:** E.g. Hillaire-style energy-conserving integration or multi-octave phase sums; used for clouds to get silver lining and soft shadows.

### 2.3 Rayleigh Scattering (Reality) – Detailed

**NL description:** Rayleigh scattering occurs when particle size ≪ wavelength (e.g. air molecules D ≈ 0.3 nm vs visible λ ≈ 400–700 nm). Scattering cross-section ∝ λ⁻⁴ → blue sky, red sunsets.

**Phase function (reality):**
```
P_Rayleigh(cos θ) = (3/(16π)) (1 + cos² θ)
```
- **Normalized:** ∫_{4π} P dΩ = 1 (or 4π in some conventions).
- **Symmetric:** Equal forward (θ=0) and backward (θ=π) scattering.
- **Peak:** At θ=0 and θ=π (cos²θ term); minimum at θ=π/2.

**Scattering coefficient (wavelength dependence):**
```
σ_s(λ) = (8π³(n²-1)²)/(3N λ⁴)
```
Where n is refractive index of air, N is number density. Approximation:
```
σ_s(λ) ≈ σ_s(λ_ref) · (λ_ref/λ)⁴
```
Example: λ_ref = 550 nm (green), then σ_s(440 nm, blue) ≈ 1.65 · σ_s(550 nm).

**Optical depth (zenith):**
For a vertical path through atmosphere of scale height H:
```
τ_zenith ≈ ∫_0^∞ σ_s(h) dh ≈ σ_s(0) · H
```
At angle θ from zenith: τ(θ) ≈ τ_zenith / cos(θ) (plane-parallel approximation).

**Blue sky:** Short wavelengths scatter more → looking away from sun you see scattered blue. **Red sunset:** Long path at horizon → blue scattered out, red transmitted.

**Translation to games:** In ProEarth shaders we use `rayleighPhase(cosTheta)` with strength and depth terms; zenith angle for optical depth. RGB coefficients approximate λ⁻⁴:

```glsl
// boltbestclouds32 atmosphere()
vec3 rayleighCoeff = vec3(5.8e-6, 13.5e-6, 33.1e-6) * uRayleighStrength;
float zenithAngle = max(0.0, rd.y);
float rayleighDepth = exp(-zenithAngle * 3.5);  // Optical depth approximation
vec3 rayleigh = rayleighCoeff * rayleighPhase(cosTheta) * rayleighDepth * 50.0;
```

See boltbestclouds32 `atmosphere()`, bfwe-testbed atmosphere shader.

### 2.4 Mie Scattering (Reality) – Detailed

**NL description:** Mie scattering applies when particle size ≈ wavelength (aerosols D ≈ 0.1–10 μm, cloud droplets D ≈ 5–20 μm, vs λ ≈ 0.4–0.7 μm). Strong forward peak; phase function depends on size parameter x = πD/λ and refractive index m.

**Full Mie theory (reality):**
Mie phase function P(θ) is a sum of Legendre polynomials (infinite series):
```
P(θ) = (4π)/(k²Q_s) · Σ_{n=1}^∞ [(2n+1)/(n(n+1))] · Re[a_n b_n*] · P_n(cos θ)
```
Where a_n, b_n are Mie coefficients (complex functions of x, m), Q_s is scattering efficiency. **Computationally expensive;** we use approximations in real-time.

**Henyey-Greenstein approximation (reality & games):**
```
P_HG(cos θ; g) = (1/(4π)) · (1 - g²) / (1 + g² - 2g cos θ)^(3/2)
```
- **g** is asymmetry parameter: ⟨cos θ⟩ = g (mean scattering angle).
- **g = 0:** Isotropic scattering (sphere).
- **g > 0:** Forward scattering (lobe toward θ=0).
- **g < 0:** Backward scattering (lobe toward θ=π).
- **Typical:** Aerosols g ≈ 0.7; cloud droplets g ≈ 0.85–0.99; ice crystals g ≈ 0.75.

**Double Henyey-Greenstein (improved fit):**
```
P(θ) = w · P_HG(θ; g_1) + (1 - w) · P_HG(θ; g_2)
```
- Typical: g_1 ≈ 0.8 (forward), g_2 ≈ -0.5 (backward), w ≈ 0.7.
- Better matches Mie's dual-lobe structure (strong forward + weak backward).

**Translation:** In games we use HG (or double-HG) for clouds and fog phase. ProEarth: `miePhase(cosTheta, uMieG)`, `hgPhase`, `HenyeyGreenstein`.

**Code example (bfwe-testbed volumetricCloudShader.ts):**
```glsl
float hgPhase(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

// In main():
float cosTheta = dot(rayDir, sunDirection);
float phaseForward = hgPhase(cosTheta, 0.6);   // g=0.6 forward
float phaseBack = hgPhase(cosTheta, -0.2);     // g=-0.2 backward
float phase = mix(phaseBack, phaseForward, 0.7); // Double-HG blend
```

### 2.5 Beer-Lambert Law (Reality) – Detailed

**NL description:** Along a ray, transmittance T describes the fraction of light that survives from point A to B without being absorbed or scattered out.

**Derivation (absorption only):**
Consider a beam of intensity I passing through thickness dx:
```
dI = -σ_a I dx
⟹ dI/I = -σ_a dx
⟹ ln(I/I_0) = -σ_a x
⟹ I = I_0 e^{-σ_a x}
⟹ Transmittance T = I/I_0 = e^{-σ_a x}
```

**With scattering (extinction):**
Replace σ_a with σ_t (extinction = absorption + out-scattering):
```
T(A → B) = exp(-∫_A^B σ_t(s) ds) = exp(-τ)

where τ = ∫ σ_t ds is optical depth.
```
- **τ = 0:** No attenuation (T=1, vacuum).
- **τ = 1:** Attenuation to e⁻¹ ≈ 0.37 (one "mean free path").
- **τ = 5:** Nearly opaque (T ≈ 0.007).

**Non-uniform medium:**
```
T = exp(-Σ_i σ_t(s_i) Δs_i)  [discrete]
  = Π_i exp(-σ_t(s_i) Δs_i) = Π_i T_i
```
Per-step transmittance multiplies.

**Translation to games:** In volumetrics we compute **transmittance *= exp(-density * stepSize * extinctionCoeff)** per step; **luminance += transmittance * (in-scattered light) * stepSize** (naive) or energy-conserving (Hillaire). Same formula in boltbestclouds32, bestclouds, bfwe-testbed.

**Code example (boltbestclouds32 cloudRaymarch):**
```glsl
float transmittance = 1.0;
vec3 lightAccum = vec3(0.0);

for (int i = 0; i < steps; i++) {
    vec3 pos = ro + rd * t;
    float density = cloudDensity(pos);
    
    if (density > 0.001) {
        float lightTransmit = cloudLightMarch(pos, sunDir);
        vec3 lightColor = uSunColor * uSunIntensity * lightTransmit * phase;
        
        // Beer-Lambert per step
        float sampleTransmittance = exp(-density * stepSize * uCloudLightAbsorption * 0.01);
        
        // Accumulate
        lightAccum += lightColor * density * stepSize * transmittance * 0.01;
        transmittance *= sampleTransmittance;
    }
    
    t += stepSize;
}

return vec4(lightAccum, 1.0 - transmittance);
```

### 2.6 Crepuscular Rays (Reality)

**NL description:** Crepuscular rays (“god rays”) are visible beams caused by volumetric scattering in the atmosphere when light is occluded by clouds or terrain. Single-scattering: light from sun is attenuated along view rays; where shadowed, less in-scatter.

**Translation to games (two methods):**

1. **In-shader volumetric raymarch (accurate, expensive):**
   - March along view ray; at each step: sample shadow map or raymarch toward sun to get L_sun(s); accumulate in-scatter weighted by T_view.
   - Used in boltbestclouds32 god ray prepass (`godRays(camPos, rd, sunDir, sceneDepth)`).

2. **Post-process radial blur (cheap, approximate):**
   - Render scene; in post shader sample buffer along rays from sun screen position; accumulate with decay.
   - GPU Gems 3 Ch. 13: "Volumetric Light Scattering as a Post-Process."
   - Used in bfwe-testbed `godRaysFragmentShader`, bestclouds `godrays.glsl`.

**Code example (post-process, bfwe-testbed):**
```glsl
// godRaysFragmentShader (simplified)
vec2 texCoord = vUv;
vec2 deltaTexCoord = (texCoord - sunScreenPos) * density / float(numSamples);

vec3 color = texture2D(tDiffuse, texCoord).rgb;
float illuminationDecay = 1.0;

for (int i = 0; i < numSamples; i++) {
    texCoord -= deltaTexCoord;
    vec3 sampleColor = texture2D(tDiffuse, texCoord).rgb;
    sampleColor *= illuminationDecay * weight;
    color += sampleColor;
    illuminationDecay *= decay;  // Exponential decay
}

gl_FragColor = vec4(color * exposure, 1.0);
```

### 2.7 Cloud Microphysics (Reality) – Detailed

**NL description:** Clouds are composed of water droplets (liquid clouds) or ice crystals (cirrus, high altitude). Droplet size D ≈ 5–20 μm; ice crystals can be larger and have complex shapes. Scattering is Mie-dominated; clouds have high albedo (ω ≈ 0.99–1.0).

**Vertical structure (reality):**
- **Cloud base:** Condensation level (where air reaches dew point).
- **Cloud top:** Limited by temperature, stability, or entrainment.
- **Density profile:** Often higher at base (condensation), decreasing toward top. In cumulus: dense core, wispy edges.

**Silver lining (reality):**
Forward scattering (Mie, g ≈ 0.85) causes **bright edges** on clouds when viewed against the sun. Phase function peak at θ≈0 → light from behind is strongly forward-scattered into your eye → bright halo.

**Powder effect (reality/approximation):**
In reality: multiple scattering within cloud causes sub-resolution brightening at edges (light bounces multiple times before exiting, some paths are shorter → brighter). In games: approximate with a multiplier `powder = 1 - exp(-k·density)` that boosts luminance at lower optical depths (edges). This mimics the "puffiness" and bright edge glow.

**Translation to games:** We do not simulate droplets or multi-bounce paths. We use **density fields** (procedural or texture) and **phase + silver lining + powder** in the shader.

**Code example (boltbestclouds32):**
```glsl
// Silver lining
float cosAngle = dot(rd, sunDir);
float silverLining = pow(saturate(cosAngle), 8.0) * uCloudSilverLining;

// Powder effect
float powder = 1.0 - exp(-density * 2.0);

// Phase
float phase = miePhase(cosAngle, 0.3);

// Combine
vec3 lightColor = uSunColor * uSunIntensity * lightTransmit;
lightColor *= phase + silverLining;  // Phase + extra forward peak
lightColor += uCloudAmbient * vec3(0.6, 0.7, 0.9);  // Ambient (sky)
lightColor *= powder;  // Brighten edges
```

### 2.8 Wavelength Dependence (Reality)

**NL description:** In reality σ_a and σ_s depend on λ. Rayleigh σ_s ∝ λ⁻⁴; ozone absorption peaks in UV; etc. Sky color and sun color vary with wavelength.

**Translation:** In real-time we rarely integrate over λ. We use **RGB coefficients** (e.g. rayleighCoeff = vec3(5.8e-6, 13.5e-6, 33.1e-6)) and **sun color** to get plausible sky and cloud color without spectral rendering.

### 2.9 Wavelength Tables (Reality → RGB)

**Rayleigh scattering (relative to 550 nm):** σ_s(λ) ∝ λ⁻⁴. Normalized so σ_s(550)=1:

| λ (nm) | Channel | Relative σ_s | Typical use |
|--------|---------|--------------|-------------|
| ~440   | B       | ~1.65        | Blue sky |
| ~550   | G       | 1.0          | Reference |
| ~650   | R       | ~0.55        | Red sunset |

**Typical RGB Rayleigh coefficients in shaders (arbitrary scale):**  
`rayleighCoeff = vec3(5.8e-6, 13.5e-6, 33.1e-6)` (more blue → blue sky). Values vary by engine; ratio B > G > R is what gives blue zenith and red horizon.

**Mie:** Often wavelength-independent or weakly dependent in games; single gray or RGB multiplier (e.g. `uMieStrength`).

**Sun color:** In reality temperature (e.g. 5778 K) gives spectrum; in games we use `uSunColor` RGB (e.g. warm white for day, orange for sunset). No spectral integration in ProEarth.

**[END:TAG:STRUCTURE]**

---

## 3. TRANSLATION: REALITY → GAMING/CINEMATICS

**[TAG:BEHAVIOR] [TAG:LIGHTING]**

### 3.1 Volumetric Raymarching (Core Technique) – Complete Implementation

**Reality:** Radiance along a ray is an integral over path (in-scatter, transmittance).  
**Games:** Discretize the ray into steps; at each step sample density, compute in-scatter (e.g. light march toward sun), accumulate luminance and multiply transmittance. **Early exit** when transmittance < threshold.

**Algorithm (pseudocode):**
```
1. Ray-volume intersection → tStart, tEnd
2. stepSize = (tEnd - tStart) / numSteps
3. Initialize: t = tStart, luminance = 0, transmittance = 1
4. For i = 0 to numSteps:
   a. pos = rayOrigin + rayDir * t
   b. density = sampleDensity(pos)
   c. If density > threshold:
      - lightTransmit = lightMarch(pos, sunDir)  // Shadow from cloud
      - phase = phaseFunction(dot(rayDir, sunDir))
      - inScatter = sunColor * lightTransmit * phase * density
      - extinction = exp(-density * stepSize * extinctionCoeff)
      - luminance += transmittance * inScatter * stepSize
      - transmittance *= extinction
   d. t += stepSize
   e. If transmittance < 0.01: break  // Early exit
5. alpha = 1 - transmittance
6. Return vec4(luminance, alpha)
```

**Complete code example (boltbestclouds32 cloudRaymarch):**
```glsl
vec4 cloudRaymarch(vec3 ro, vec3 rd, vec3 sunDir, float maxDist) {
    float cloudBottom = uCloudHeight;
    float cloudTop = uCloudHeight + uCloudThickness;

    // Step 1: Ray-box intersection
    vec2 cloudHit = rayBoxIntersect(ro, rd,
        vec3(-50000.0, cloudBottom, -50000.0),
        vec3(50000.0, cloudTop, 50000.0));

    if(cloudHit.y <= 0.0) return vec4(0.0);  // No hit

    float tStart = cloudHit.x;
    float tEnd = min(cloudHit.x + cloudHit.y, maxDist);
    if(tStart >= tEnd) return vec4(0.0);

    // Step 2: LOD step count (distance-based)
    float distToCloud = tStart;
    float stepsF = uPrimarySteps;
    if(distToCloud > 20000.0) stepsF = max(8.0, stepsF * 0.25);
    else if(distToCloud > 10000.0) stepsF = max(16.0, stepsF / 3.0);
    else if(distToCloud > 5000.0) stepsF = max(32.0, stepsF * 0.5);
    int steps = int(stepsF);

    float stepSize = (tEnd - tStart) / stepsF;
    float t = tStart;

    // Step 3: Initialize accumulators
    vec3 lightAccum = vec3(0.0);
    float transmittance = 1.0;

    // Step 4: Raymarch loop
    for(int i = 0; i < 128; i++) {
        if(i >= steps || transmittance < 0.01) break;  // Early exit

        vec3 pos = ro + rd * t;
        float density = cloudDensity(pos);  // Step 4b

        if(density > 0.001) {
            // Step 4c: Lighting
            float lightTransmit = cloudLightMarch(pos, sunDir);  // Shadow
            
            float cosAngle = dot(rd, sunDir);
            float phase = miePhase(cosAngle, 0.3);
            float silverLining = pow(saturate(cosAngle), 8.0) * uCloudSilverLining;
            float powder = 1.0 - exp(-density * 2.0);

            vec3 lightColor = uSunColor * uSunIntensity * lightTransmit;
            lightColor *= phase + silverLining;
            lightColor += uCloudAmbient * vec3(0.6, 0.7, 0.9);
            lightColor *= powder;

            // Multiple scattering approximation (optional)
            if(uMultiScattering > 0.5) {
                float ms = 1.0 - exp(-density * 2.0);
                lightColor *= 1.0 + ms * 0.6;
                lightColor += vec3(0.6, 0.7, 0.9) * uCloudAmbient * ms * 0.3;
            }

            // Beer-Lambert integration
            float sampleTransmittance = exp(-density * stepSize * uCloudLightAbsorption * 0.01);
            lightAccum += lightColor * density * stepSize * transmittance * 0.01;
            transmittance *= sampleTransmittance;
        }

        t += stepSize;  // Step 4d
    }

    // Step 5-6: Return
    return vec4(lightAccum, 1.0 - transmittance);
}
```

**Syntax/code mapping:**
- **Primary steps:** `uPrimarySteps`, `STEPS_PRIMARY`, `CLOUD_MARCH_STEPS` (32–96 typical).
- **Step size:** `(tEnd - tStart) / steps` or `cloudThickness / steps`.
- **Density sample:** `cloudDensity(pos)`, `sampleCloudDensity(pos, cheap)`, `clouds(p, cloudHeight, sampleDetail)`.

### 3.2 Cloud Density Representation – Complete Implementations

**Reality:** 3D field of liquid water content / droplet concentration [g/m³ or kg/m³].  
**Games:** (1) **Procedural:** Perlin-Worley + Worley FBM in shader (boltbestclouds32). (2) **Texture:** Prebaked Perlin-Worley atlas + cloud map (bestclouds). (3) **3D texture:** 128³ or similar (common in AAA); we use 2D atlas or procedural in ProEarth.

**Approach 1: Procedural (boltbestclouds32)**

**Algorithm:**
```
1. Apply wind offset: p += vec3(time * speed, 0, time * speed * 0.5)
2. Compute height fraction: heightFrac = (p.y - cloudBottom) / (cloudTop - cloudBottom)
3. Height gradient: heightGradient = remap(heightFrac, 0, 0.15, 0, 1) * remap(heightFrac, 0.85, 1, 1, 0)
4. Base shape: perlinWorley = perlinWorley(p * scale, 1.0)
5. Detail: worleyDetail = worleyFBM(p * scale, 3.0)
6. Combine: density = remap(perlinWorley, worleyDetail * 0.3, 1, 0, 1)
7. Apply coverage: density = remap(density, 1 - coverage, 1, 0, 1)
8. Apply height: density *= heightGradient
9. Return: saturate(density * densityMultiplier)
```

**Complete code (boltbestclouds32):**
```glsl
float cloudDensity(vec3 p) {
    // Wind animation
    vec3 wind = vec3(iTime * uCloudSpeed * 10.0, 0.0, iTime * uCloudSpeed * 5.0);
    p += wind;
    
    // Wind perturbation
    p += vec3(
        sin(iTime * uWindInfluence + p.z * 0.01),
        0.0,
        cos(iTime * uWindInfluence + p.x * 0.01)
    ) * uWindInfluence * 100.0;

    // Height gradient
    float cloudBottom = uCloudHeight;
    float cloudTop = uCloudHeight + uCloudThickness;
    float heightFraction = (p.y - cloudBottom) / (cloudTop - cloudBottom);
    float heightGradient = saturate(remap(heightFraction, 0.0, 0.15, 0.0, 1.0));
    heightGradient *= saturate(remap(heightFraction, 0.85, 1.0, 1.0, 0.0));

    // Sample position in noise space
    vec3 samplePos = p * uCloudScale * 0.00015;

    // Base shape
    float perlinWorleyBase = perlinWorley(samplePos, 1.0);
    
    // Detail
    float worleyDetail = worleyFBM(samplePos, 3.0);

    // Combine with remap (erosion)
    float density = remap(perlinWorleyBase, worleyDetail * 0.3, 1.0, 0.0, 1.0);
    
    // Apply coverage threshold
    density = remap(density, 1.0 - uCloudCoverage, 1.0, 0.0, 1.0);
    
    // Height gradient
    density *= heightGradient;

    // Weather influence
    density *= 1.0 + uPrecipitation * 0.4;

    return saturate(density * uCloudDensity);
}

// Supporting noise functions
float perlinWorley(vec3 p, float freq) {
    float perlin = 0.5 + 0.5 * gradientNoise(p * freq);
    float worley0 = worley(p * freq * 2.0);
    float worley1 = worley(p * freq * 8.0);
    float worleyFBM = worley0 * 0.625 + worley1 * 0.375;
    return remap(perlin, 0.0, 1.0, worleyFBM, 1.0);
}

float worleyFBM(vec3 p, float freq) {
    float w0 = worley(p * freq);
    float w1 = worley(p * freq * 2.0);
    float w2 = worley(p * freq * 4.0);
    return w0 * 0.625 + w1 * 0.25 + w2 * 0.125;
}
```

**Approach 2: Texture atlas (bestclouds(faster))**

**Algorithm:**
```
1. Check AABB bounds (early out if outside)
2. Sample cloud map (2D): coverage = texture(cloudMap, p.xz / extent).b
3. Compute edge fade (avoid hitting volume walls)
4. Compute vertical profile (base + thickness from map)
5. Sample Perlin-Worley atlas (3D via 2D tiled texture): base shape
6. Carve shape: density = remap(coverage, shape, 1, 0, 1)
7. Optional: sample detail (same atlas, different frequency)
8. Carve detail: density = remap(density, detail, 1, 0, 1)
9. Return: density * densityMultiplier
```

**Complete code (bestclouds image.glsl):**
```glsl
float clouds(vec3 p, out float cloudHeight, bool sampleDetail) {
    if (!insideAABB(p)) return 0.0;

    // Step 2: Cloud map (2D coverage)
    float cloud = getCloudMap(p);  // texture(iChannel1, p.xz / extent).b

    // Step 3: Edge fade
    float edge01 = max(abs(p.x), abs(p.z)) / CLOUD_EXTENT;
    float edgeFade = 1.0 - smoothstep(1.0 - uCloudEdgeFade01, 1.0, edge01);
    cloud *= edgeFade;

    if (cloud <= 0.0) return 0.0;

    // Step 4: Vertical profile
    float baseY = cloudStart + uCloudBase01 * (cloudEnd - cloudStart);
    float topY = baseY + (cloudEnd - cloudStart) * max(1e-3, uCloudThickness01) * cloud;
    if (p.y < baseY || p.y > topY) return 0.0;
    
    cloudHeight = saturate((p.y - baseY) / max(1e-3, (topY - baseY)));

    // Bottom/top fade
    float bottomFade = smoothstep(0.0, uCloudBottomFade01, cloudHeight);
    float topFade = 1.0 - smoothstep(1.0 - uCloudTopFade01, 1.0, cloudHeight);
    cloud *= bottomFade * topFade;

    // Step 5: Animated shape
    vec3 shapePos = p + vec3(uCloudShapeSpeed * iTime, 0.0, 0.0);
    float shape = 1.0 - getPerlinWorleyNoise(shapeSize * shapePos);
    shape *= uCloudShapeStrength;

    // Step 6: Carve shape
    cloud = saturate(remap(cloud, shape, 1.0, 0.0, 1.0));
    if (cloud <= 0.0) return 0.0;

    // Step 7-8: Detail (optional, expensive)
    if (sampleDetail) {
        vec3 detailPos = p + vec3(uCloudDetailSpeed * iTime, 0.0, 0.5 * uCloudDetailSpeed * iTime);
        float detail = getPerlinWorleyNoise(detailSize * detailPos);
        detail *= uCloudDetailStrength;
        cloud = saturate(remap(cloud, detail, 1.0, 0.0, 1.0));
    }

    return uCloudDensity * cloud;
}

// getPerlinWorleyNoise: samples 2D atlas as 3D texture (32x32x36 via 204px atlas)
float getPerlinWorleyNoise(vec3 pos) {
    const float dataWidth = 204.0;
    const float tileRows = 6.0;
    const vec3 atlasDimensions = vec3(32.0, 32.0, 36.0);

    vec3 p = pos.xzy;  // Swap Y and Z
    vec3 coord = vec3(mod(p, atlasDimensions));
    float f = fract(coord.z);
    float level = floor(coord.z);
    float tileY = floor(level / tileRows);
    float tileX = level - tileY * tileRows;

    vec2 offset = atlasDimensions.x * vec2(tileX, tileY) + 2.0 * vec2(tileX, tileY) + 1.0;
    vec2 pixel = coord.xy + offset;
    vec2 data = texture(iChannel1, mod(pixel, dataWidth) / iChannelResolution[1].xy).rg;
    
    return mix(data.x, data.y, f);  // Trilinear between layers
}
```

**Relationship map:**
- **perlinWorley(samplePos, freq)** ↔ large-scale cloud shape.
- **worleyFBM**, **getPerlinWorleyNoise** ↔ detail and erosion.
- **Height gradient** ↔ cloud base/top fade (reality: vertical profile).
- **Coverage** ↔ remap(density, 1-coverage, 1, 0, 1) or cloud map texture.

### 3.3 Light Marching (Toward Sun) – Complete Implementation

**Reality:** To know illumination at a point inside the cloud, we need irradiance from the sun attenuated along the path through the cloud (self-shadowing).  
**Games:** March from sample point toward sun; accumulate density (optical depth); transmittance = exp(-optical_depth * coeff). Optional: skip detail in light march (`sampleDetail = false`) for speed.

**Algorithm:**
```
1. Start at sample point pos
2. stepSize = (cloudTop - cloudBottom) / lightSteps  (or fixed)
3. opticalDepth = 0
4. For i = 0 to lightSteps:
   a. pos += sunDir * stepSize
   b. If pos.y > cloudTop or pos.y < cloudBottom: break  (exited cloud)
   c. density = sampleDensity(pos)  (cheap=true for speed)
   d. opticalDepth += density * stepSize
   e. Optional early exit: if opticalDepth > 8: break  (fully shadowed)
5. transmittance = exp(-opticalDepth * absorptionCoeff)
6. Return transmittance
```

**Complete code example (boltbestclouds32):**
```glsl
float cloudLightMarch(vec3 pos, vec3 sunDir) {
    float cloudBottom = uCloudHeight;
    float cloudTop = uCloudHeight + uCloudThickness;
    float lightAccum = 0.0;
    float stepSize = (cloudTop - cloudBottom) / uLightSteps;

    for(int i = 0; i < 8; i++) {
        if(float(i) >= uLightSteps) break;
        pos += sunDir * stepSize;
        if(pos.y > cloudTop || pos.y < cloudBottom) break;
        
        // Sample density (no detail for speed)
        lightAccum += cloudDensity(pos) * stepSize;
    }

    return exp(-lightAccum * uCloudLightAbsorption * 0.01);
}
```

**Complete code example (bestclouds image.glsl with early exit):**
```glsl
float lightRay(vec3 org, vec3 p, float mu, vec3 lightDirection) {
    float lightRayDistance = CLOUD_EXTENT * 1.5;
    float distToStart = 0.0;
    
    getCloudIntersection(p, lightDirection, distToStart, lightRayDistance);
    
    float stepL = lightRayDistance / float(STEPS_LIGHT);
    float lightRayDensity = 0.0;
    float cloudHeight = 0.0;

    // Collect total density along light ray
    for (int j = 0; j < STEPS_LIGHT; j++) {
        bool sampleDetail = true;
        if (lightRayDensity > 0.3) {
            sampleDetail = false;  // Skip detail when already shadowed
        }
        
        // Reduce density toward light for brighter clouds
        lightRayDensity += mix(1.0, 0.75, mu) * clouds(p + lightDirection * float(j) * stepL, cloudHeight, sampleDetail);
    }

    // Multiple octaves approximation (Hillaire-style)
    float beersLaw = multipleOctaves(lightRayDensity, mu, stepL);

    // Powder effect (view-angle dependent)
    return mix(beersLaw * 2.0 * (1.0 - exp(-stepL * lightRayDensity * 2.0)), beersLaw, 0.5 + 0.5 * mu);
}

// multipleOctaves (Hillaire multiple scattering approximation)
float multipleOctaves(float extinction, float mu, float stepL) {
    float luminance = 0.0;
    const float octaves = 4.0;
    float a = 1.0;  // Attenuation
    float b = 1.0;  // Contribution
    float c = 1.0;  // Phase attenuation

    for (float i = 0.0; i < octaves; i++) {
        float phase = mix(HenyeyGreenstein(-0.1 * c, mu), HenyeyGreenstein(0.3 * c, mu), 0.7);
        luminance += b * phase * exp(-stepL * extinction * a);
        a *= 0.25;  // Lower is brighter
        b *= 0.5;   // Higher is brighter
        c *= 0.5;
    }
    return luminance;
}
```

**Syntax/code mapping:**
- **Light steps:** `uLightSteps`, `STEPS_LIGHT`, `LIGHT_MARCH_STEPS` (1–10).
- **Result:** `lightTransmit`, `lightMarch(pos)`, `lightRay(org, p, mu, lightDirection)`.

### 3.4 Phase Functions (Games)

**Reality:** P(cos θ) describes angular distribution of scattered light.  
**Games:** Henyey-Greenstein (single or double), Mie-style, or mix. Same formula: `hgPhase(cosTheta, g)`, `miePhase(cosTheta, g)`.

**Relationship:** `cosTheta = dot(rd, sunDir)` or `dot(lightDir, viewDir)`. Silver lining: extra term `pow(max(0, cosTheta), 8) * silverLiningStrength`.

### 3.5 Multiple Scattering Approximation (Games) – Complete Implementations

**Reality:** Multiple bounces inside cloud make it brighter and softer (second, third, … scattering events). Full solution requires nested integrals or Monte Carlo; prohibitively expensive in real-time.

**Games (two common approximations):**

**Approach 1: Hillaire energy-conserving integration (Frostbite)**

From "Physically based sky, atmosphere and cloud rendering in Frostbite" section 5.6:

```glsl
// For each raymarch step:
float density = sampleDensity(pos);
float sigmaS = 1.0;  // Scattering coefficient
float sigmaA = 0.0;  // Absorption coefficient
float sigmaE = sigmaS + sigmaA;  // Extinction

float sampleSigmaS = sigmaS * density;
float sampleSigmaE = sigmaE * density;

// In-scattered radiance (from light march, phase, etc.)
vec3 luminance = computeInScatter(pos, sunDir, phase);
luminance *= sampleSigmaS;

// Beer-Lambert transmittance for this step
float transmittance_step = exp(-sampleSigmaE * stepSize);

// Energy-conserving integration:
// Integral of (e^{-σ_e t}) from 0 to stepSize is (1 - e^{-σ_e·stepSize}) / σ_e
vec3 integScatter = (luminance - luminance * transmittance_step) / sampleSigmaE;

// Accumulate
color += totalTransmittance * integScatter;
totalTransmittance *= transmittance_step;
```

**Approach 2: Multi-octave phase sum (bestclouds/Hillaire approx)**

Approximate multiple bounces by summing phase functions at different scales with decreasing contribution:

```glsl
float multipleOctaves(float extinction, float mu, float stepL) {
    float luminance = 0.0;
    const float octaves = 4.0;
    
    float a = 1.0;  // Attenuation (extinction multiplier)
    float b = 1.0;  // Contribution (brightness multiplier)
    float c = 1.0;  // Phase attenuation (g multiplier)

    for (float i = 0.0; i < octaves; i++) {
        // Two-lobed HG for this octave
        float phase = mix(HenyeyGreenstein(-0.1 * c, mu), HenyeyGreenstein(0.3 * c, mu), 0.7);
        
        // Transmittance for this octave
        luminance += b * phase * exp(-stepL * extinction * a);
        
        // Next octave: less extinction, less contribution, broader phase
        a *= 0.25;  // Lower extinction → deeper penetration
        b *= 0.5;   // Lower contribution → diminishing returns
        c *= 0.5;   // Broader phase → more isotropic
    }
    return luminance;
}
```

**Approach 3: Simple ambient boost (boltbestclouds32)**

```glsl
if(uMultiScattering > 0.5) {
    float ms = 1.0 - exp(-density * 2.0);  // Optical-depth-dependent
    float cosAngle2 = cosAngle * cosAngle;
    float scatter2 = 0.5 * (1.0 + cosAngle2);  // Rough second-scatter phase
    vec3 ambient = vec3(0.6, 0.7, 0.9) * uCloudAmbient;
    
    lightColor *= 1.0 + ms * 0.6;  // Boost direct light
    lightColor += ambient * ms * scatter2 * 0.3;  // Add ambient multi-scatter
}
```

**Why this matters:** Without multiple scattering, clouds look too dark and opaque (single Beer-Lambert underestimates brightness). With approximation, clouds get softer, brighter edges, and more realistic appearance.

### 3.6 God Rays (Crepuscular) in Games

**Options:**  
- **In-shader raymarch:** Sample density along view ray; add scattered light (boltbestclouds32 god ray prepass).  
- **Post-process:** Radial blur from sun screen position; decay per sample (bfwe-testbed godRaysFragmentShader, GPU Gems 3 Ch. 13).  
- **Epipolar / min-max mip:** 1D slice + shadow map (research; not in current ProEarth).

### 3.7 Temporal Reprojection / TAA

**Reality:** N/A (single frame).  
**Games:** Reuse previous frame’s cloud/god-ray buffer with motion; blend with current. Reduces noise and allows fewer primary steps. **uCloudTemporalBlend**, **uGodRayTemporalBlend**, **historyTex**, **taaAlpha**.

### 3.8 LOD (Level of Detail) – Complete Implementation

**Reality:** N/A (no LOD in physics).  
**Games:** Reduce primary (and light) steps when camera is far from cloud or when ray is long. Also: reduce resolution (half-res passes), skip detail sampling, use FAST mode.

**LOD strategies:**

1. **Distance-based step reduction (boltbestclouds32 CloudLODSystem):**
```typescript
// CloudLODSystem.ts
class CloudLODSystem {
  private lodLevels = [
    { distance: 2000, primarySteps: 96, lightSteps: 8, name: 'ULTRA' },
    { distance: 5000, primarySteps: 64, lightSteps: 6, name: 'HIGH' },
    { distance: 10000, primarySteps: 48, lightSteps: 4, name: 'MEDIUM' },
    { distance: 20000, primarySteps: 32, lightSteps: 3, name: 'LOW' },
    { distance: Infinity, primarySteps: 8, lightSteps: 1, name: 'MINIMAL' },
  ];

  update(cameraPos: Vector3, cloudPos: Vector3, deltaTime: number) {
    const distance = cameraPos.distanceTo(cloudPos);

    for (let i = 0; i < this.lodLevels.length; i++) {
      if (distance < this.lodLevels[i].distance) {
        return {
          primarySteps: this.lodLevels[i].primarySteps,
          lightSteps: this.lodLevels[i].lightSteps,
          lod: i,
        };
      }
    }

    return { primarySteps: 8, lightSteps: 1, lod: this.lodLevels.length - 1 };
  }
}

// In animate loop:
const cloudData = cloudLODRef.current.update(tmpCamPos, tmpCloudCenter, dt);
u.uPrimarySteps.value = cloudData.primarySteps;
u.uLightSteps.value = cloudData.lightSteps;
```

2. **In-shader distance reduction (boltbestclouds32 cloudRaymarch):**
```glsl
float distToCloud = tStart;
float stepsF = uPrimarySteps;

// Further reduce steps based on ray start distance
if(distToCloud > 20000.0) stepsF = max(8.0, stepsF * 0.25);
else if(distToCloud > 10000.0) stepsF = max(16.0, stepsF / 3.0);
else if(distToCloud > 5000.0) stepsF = max(32.0, stepsF * 0.5);

int steps = int(stepsF);
```

3. **Compile-time FAST mode (bestclouds):**
```glsl
#ifdef FAST
#define STEPS_PRIMARY 32
#define STEPS_LIGHT 8
#else
#define STEPS_PRIMARY 64
#define STEPS_LIGHT 10
#endif
```

4. **Resolution scaling (half-res cloud pass):**
```javascript
// boltbestclouds32: cloud and god-ray prepasses at half-res
let cloudRT = [makeRT(Math.floor(width * 0.5), Math.floor(height * 0.5)),
               makeRT(Math.floor(width * 0.5), Math.floor(height * 0.5))];

// Render cloud at half-res
u.uPass.value = 1;
renderer.setRenderTarget(cloudRT[write]);
renderer.render(scene, camera);

// Sample cloud texture in full pass
u.uPass.value = 0;
u.uCloudTex.value = cloudRT[cloudWrite].texture;
u.uUseCloudTex.value = 1.0;
renderer.setRenderTarget(null);
renderer.render(scene, camera);
```

**[END:TAG:BEHAVIOR]**

---

## 4. STATIC STRUCTURE MAP (COMPONENTS)

**[TAG:STRUCTURE] [TAG:VOLUMETRICS]**

### 4.1 Component Hierarchy (Conceptual & Data Flow)

```
┌───────────────────────────────────────────────────────────────────────┐
│                  VOLUMETRICS & LIGHTING PIPELINE                       │
│                     (Conceptual Hierarchy)                             │
└───────────────────────────────────────────────────────────────────────┘

1. SKY / ATMOSPHERE (Background)
   ├─ Rayleigh Scattering ──────────→ Blue sky, zenith/horizon gradient
   │  ├─ σ_s(λ) ∝ λ⁻⁴               └─ vec3(5.8e-6, 13.5e-6, 33.1e-6) RGB
   │  ├─ Phase: (3/16π)(1+cos²θ)     └─ rayleighPhase(cosTheta)
   │  └─ Optical depth: zenithAngle  └─ exp(-zenithAngle * 3.5)
   │
   ├─ Mie Scattering ───────────────→ Sun halo, aerosol haze
   │  ├─ HG phase: (1-g²)/(...)      └─ miePhase(cosTheta, uMieG)
   │  └─ Depth: exp(-zenithAngle*1)  └─ Weakly wavelength-dependent
   │
   ├─ Stars ────────────────────────→ Night sky procedural twinkle
   │  └─ stars(rd) * nightFactor
   │
   └─ Sun Disk ─────────────────────→ Bright disk at sun position
      └─ smoothstep(0.013, 0.0044, sunAngle)

2. VOLUMETRIC CLOUDS (Primary volumetric)
   ├─ Density Field ρ(x,y,z)
   │  ├─ Approach A: Procedural ────→ perlinWorley + worleyFBM
   │  │  └─ gradientNoise, worley, hash functions
   │  ├─ Approach B: Texture atlas ─→ getPerlinWorleyNoise(atlas)
   │  │  └─ 32x32x36 via 204px 2D atlas
   │  └─ Modulation:
   │     ├─ Height gradient ────────→ base/top fade (vertical profile)
   │     ├─ Coverage ───────────────→ remap(density, 1-coverage, 1, 0, 1)
   │     └─ Wind animation ─────────→ p += vec3(time*speed, 0, ...)
   │
   ├─ Primary Raymarch
   │  ├─ Ray-volume intersection ───→ tStart, tEnd (box or sphere)
   │  ├─ LOD step count ────────────→ 8–96 (distance-based)
   │  ├─ Step loop ─────────────────→ for (i=0; i<steps; i++)
   │  └─ Early exit ────────────────→ if (transmittance < 0.01) break
   │
   ├─ Light March (per primary step)
   │  ├─ Direction ─────────────────→ sunDir
   │  ├─ Steps ─────────────────────→ 1–10 (LIGHT_STEPS)
   │  ├─ Optical depth ─────────────→ Σ density * stepSize
   │  └─ Transmittance ─────────────→ exp(-opticalDepth * coeff)
   │
   ├─ Phase & Effects
   │  ├─ Phase function ────────────→ HG(cosTheta, g) or Mie
   │  ├─ Silver lining ─────────────→ pow(cosAngle, 8) * strength
   │  ├─ Powder effect ─────────────→ 1 - exp(-density * 2)
   │  └─ Multi-scatter approx ──────→ Hillaire or multi-octave
   │
   └─ Accumulation
      ├─ Luminance ────────────────→ += transmittance * inScatter * stepSize
      └─ Transmittance ────────────→ *= exp(-density * stepSize * coeff)

3. VOLUMETRIC FOG
   ├─ Height Fog ──────────────────→ Exponential with height
   │  └─ fogAmount = 1 - exp(-dist * density) * exp(-rd.y * height)
   └─ Optional: Fog inside cloud layer (same raymarch, different density)

4. GOD RAYS / CREPUSCULAR
   ├─ Method A: In-shader raymarch ─→ Sample density along view ray
   │  ├─ Steps ─────────────────────→ uGodRaySteps (8–32)
   │  ├─ Shadow ────────────────────→ 1 - cloudDensity * 0.5
   │  └─ Accumulation ──────────────→ rays += shadow * fogDensity * decay
   │
   └─ Method B: Post-process radial ─→ Radial blur from sun screen pos
      ├─ Sample buffer ────────────→ Along ray from sunScreenPos
      ├─ Decay ────────────────────→ illuminationDecay *= decay per sample
      └─ Accumulate ───────────────→ color += sample * decay * weight

5. COMPOSITE (Render order)
   ├─ Sky (background)
   ├─ Terrain / ocean (opaque, write depth)
   ├─ Fog over terrain (distance-based blend)
   ├─ Clouds (volumetric blend with alpha)
   └─ God rays (additive or alpha blend)
```

**Data flow (boltbestclouds32 multi-pass):**
```
Frame start
  ↓
LOD update (CloudLODSystem) → primarySteps, lightSteps → uniforms
  ↓
[Optional] Cloud prepass (uPass=1, half-res) → cloudRT
  ↓
[Optional] God-ray prepass (uPass=2, half-res) → godRT
  ↓
Full pass (uPass=0, full-res):
  - Sample uCloudTex if available
  - Sample uGodRayTex if available
  - Composite: sky → terrain → fog → clouds → god rays
  ↓
Output to screen
```

### 4.2 ProEarth File Locations

| Component | boltbestclouds32 | bestclouds(faster) | bfwe-testbed |
|-----------|------------------|--------------------|--------------|
| **Monolith / main** | `ProceduralEarth.tsx` (single FS) | `main.js` + `image.glsl` | `GlobeScene.tsx` + atmosphereShader + volumetricCloudShader |
| **Cloud density** | Inline `cloudDensity`, `perlinWorley`, `worleyFBM` | `clouds()`, `getPerlinWorleyNoise`, `getCloudMap` (bufferB) | `sampleCloudDensity` (volumetricCloudShader.ts) |
| **Cloud raymarch** | `cloudRaymarch` | `mainRay`, `mainImage` | Fragment main loop (32 steps) |
| **Light march** | `cloudLightMarch` | `lightRay` | `lightMarch` |
| **God rays** | In-shader `godRays()` + prepass | `godrays.glsl` pass | `godRaysFragmentShader` (post) |
| **LOD** | `CloudLODSystem.ts` | `#define FAST`, `?scale=` | None (fixed 32/6) |
| **Temporal** | `uCloudHistoryTex`, `uGodRayHistoryTex` | Accum pass, reprojection | None |

### 4.3 Shader / Symbol Index (Key Names)

| Concept | boltbestclouds32 | bestclouds | bfwe-testbed |
|---------|------------------|------------|--------------|
| Primary steps | `uPrimarySteps`, `stepsF`, `steps` | `STEPS_PRIMARY` | `CLOUD_MARCH_STEPS` (32) |
| Light steps | `uLightSteps` | `STEPS_LIGHT` | `LIGHT_MARCH_STEPS` (6) |
| Phase | `miePhase`, `rayleighPhase` | `HenyeyGreenstein`, `phaseHG` | `hgPhase` |
| Silver lining | `uCloudSilverLining`, `pow(saturate(cosAngle), 8)` | In `lightRay` / phase mix | — |
| Powder | `1.0 - exp(-density * 2.0)` | Similar | `powder(density)` |
| Transmittance | `transmittance *= sampleTransmittance` | `totalTransmittance *= transmittance` | `transmittance *= extinction` |
| Sun direction | `getSunDirection()`, `uSunAzimuth`, `uSunElevation` | `uSunDirWorld`, `lightDirection` | `sunDirection` |

### 4.4 Quick Symbol Lookup (One Table)

Use this table to find the symbol for a concept in each ProEarth system without scanning §9.

| Concept | boltbestclouds32 | bestclouds(faster) | bfwe-testbed |
|---------|------------------|--------------------|--------------|
| Primary steps | `uPrimarySteps`, `stepsF`, `steps` | `STEPS_PRIMARY` (32/64) | `CLOUD_MARCH_STEPS` (32) |
| Light steps | `uLightSteps` | `STEPS_LIGHT` (8/10) | `LIGHT_MARCH_STEPS` (6) |
| Density sample | `cloudDensity(pos)` | `clouds(p, cloudHeight, sampleDetail)` | `sampleCloudDensity(pos, cheap)` |
| Base shape | `perlinWorley`, `worleyFBM` | `getPerlinWorleyNoise(shapeSize*p)` | `fbm`, `worleyNoise` |
| Light transmittance | `cloudLightMarch(pos, sunDir)` | `lightRay(org, p, mu, lightDirection)` | `lightMarch(pos)` |
| Phase | `miePhase(cosAngle, 0.3)` | `HenyeyGreenstein`, `phaseHG` | `hgPhase(cosTheta, g)` |
| Transmittance accum | `transmittance *= sampleTransmittance` | `totalTransmittance *= transmittance` | `transmittance *= extinction` |
| God rays | `godRays(...)`, prepass uPass=2 | `godrays.glsl` pass | `godRaysFragmentShader` (post) |
| Temporal | `uCloudHistoryTex`, `uCloudTemporalBlend` | Accum pass, reprojection | — |
| LOD | `CloudLODSystem`, `stepsF = max(8, stepsF*0.25)` | `#define FAST`, `?scale=` | — |

### 4.5 Noise Function Breakdown (Procedural Density)

**Gradient Noise (Perlin-style):**
```
Purpose: Smooth, coherent 3D noise
Technique: Lattice gradients + quintic/cubic interpolation
Characteristics: Band-limited, no harsh edges, good for large-scale shape
Cost: Moderate (8 corner samples + interpolation per octave)

Code structure:
- hash3v(ivec3) → vec3 gradient at lattice point
- quintic(vec3 t) → smootherstep interpolation (6t⁵ - 15t⁴ + 10t³)
- gradientNoise(vec3 p) → interpolate dot products at 8 corners
```

**Worley Noise (Cellular):**
```
Purpose: Blob-like, cellular structures
Technique: Distance to nearest feature point in Voronoi cells
Characteristics: Sharp features, good for cloud detail and erosion
Cost: High (27 neighbor cells for 3D)

Code structure:
- hash33(ivec3) → vec3 random offset in cell
- worley(vec3 p) → 1 - sqrt(minDist²) over 3×3×3 neighborhood
```

**FBM (Fractal Brownian Motion):**
```
Purpose: Multi-scale detail (sum of octaves)
Technique: Add noise at increasing frequencies, decreasing amplitudes
Formula: Σ_i (amplitude_i * noise(p * frequency_i))

Code:
float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < octaves; i++) {
        value += amplitude * gradientNoise(p * frequency);
        frequency *= 2.0;   // Lacunarity
        amplitude *= 0.5;   // Persistence (or gain)
    }
    return value;
}
```

**Perlin-Worley (Hybrid):**
```
Purpose: Combine Perlin smoothness with Worley blobs
Technique: Remap Perlin to Worley (Perlin controls blend)

Code:
float perlinWorley(vec3 p, float freq) {
    float perlin = 0.5 + 0.5 * gradientNoise(p * freq);
    float worley0 = worley(p * freq * 2.0);
    float worley1 = worley(p * freq * 8.0);
    float worleyFBM = worley0 * 0.625 + worley1 * 0.375;
    
    // Remap: where Perlin is low, use Worley; where high, fade to 1
    return remap(perlin, 0.0, 1.0, worleyFBM, 1.0);
}
```

**Remap function (critical for cloud shaping):**
```
Purpose: Map input range [low1, high1] to output [low2, high2]
Use: Carve erosion, apply coverage threshold, control density

Code:
float remap(float x, float low1, float high1, float low2, float high2) {
    return low2 + (x - low1) * (high2 - low2) / (high1 - low1);
}

// Example: Apply coverage threshold
// density = remap(baseNoise, 1.0 - coverage, 1.0, 0.0, 1.0)
// If baseNoise < 1-coverage → 0 (no cloud)
// If baseNoise ≥ 1-coverage → scales to [0,1]
```

### 4.6 Voronoi/Worley as Macro-Structure Control (2D Editors → 3D Volumes)

**Key clarification:** **3D Voronoi is absolutely “a thing.”** A 3D Voronoi diagram partitions \(\mathbb{R}^3\) into **convex polyhedral cells** around feature points (seeds). In real-time rendering we rarely build explicit polyhedra; instead we use **Worley noise**, i.e. a *scalar field* derived from distances to the nearest (and second-nearest) feature points in a 3D lattice neighborhood.

**Why this matters for clouds:** Worley/Voronoi isn’t just “detail noise.” Used at low frequency, it becomes an *art-directable macrostructure* primitive: **cells, clumps, patches, and boundaries** that you can map to meteorological “cloud fields.” Your WorldBuilder Voronoi editor already encodes a strong pattern for this: *seeds + boundary shaping + influence fields + motion vectors*.

#### 4.6.1 “Plate editor” parameters → “Cloud cell field” parameters (logical mapping)

Below is a **physically plausible translation** of your 2D plate/Voronoi editor controls into a cloud system. The goal is *not* to claim clouds are tectonic plates; the goal is to reuse a proven **UI/field-control language** to drive believable macro-distributions while the raymarch still obeys Beer–Lambert + phase + vertical profiles.

| WorldBuilder `TectonicParams` concept | Cloud interpretation | Where it should apply (recommended) |
|---|---|---|
| `plates[]` (seed positions) | **Cloud “airmass/cell” seeds** (mesoscale patches, convective cell centers, stratocumulus pockets) | **2D macro field** (coverage/height/thickness), sampled per-raymarch step as modulation |
| `type` (continental/oceanic) | **Cell archetype** selector (e.g. cumulus / stratocumulus / cirrus) | Drives vertical profile, erosion strength, albedo tint, anisotropy |
| `velocity` vectors | **Local wind/advection** per cell (or per region) | Domain translation of macro mask + subtle directionality in erosion |
| `boundaryWarp` | **Domain warp amplitude** for organic boundaries | Warp macro mask coordinates; keep low-frequency to avoid flicker |
| `boundaryWidth` | **Edge softness / blending width** between neighboring cells | Controls “transition band” where density ramps down/up |
| `boundarySharpness` | **Edge falloff curve** (soft foggy vs crisp cellular breakup) | Exponent in edge mask remap (artist-friendly) |
| `collisionStrength` | **Convergence/updraft potential** → thicker/denser cores, more towering growth | Modulates density multiplier + thickness + powder/silver boosts |
| `subductionDepth` | **Downdraft/entrainment strength** → holes, thinning, “erosion” | Increases erosion / reduces density where “sinking” dominates |
| Influence overlays (`mountain/moisture/volcanic`) | **Moisture / aerosol / instability** driver fields | Feeds coverage threshold, droplet density, anisotropy, cloud type mixing |
| `edgeRoughness` | **Edge breakup roughness** (small-scale scalloping) | Scales Worley frequency / adds high-frequency erosion |
| `mantleViscosity` | **Temporal inertia / smoothing** (how quickly the macro field can change) | Time filtering of seeds & parameters; reduces popping |
| `mountainRangeWidth` etc. | **Band width controls** (fronts, squall lines, anvil spreads) | Width of “organized structures” around boundaries/skeletons |

**Practical GPU guidance:** compute the “cell field” in **2D (lat/long or world XZ)** and sample it inside the 3D raymarch. Doing full explicit Voronoi nearest-seed search per-step with many seeds will explode cost; treat Voronoi as a **macro mask** you sample cheaply (texture or low-frequency procedural).

#### 4.6.2 Organic grouping (your “skeletal rigging/snake” idea) — validated version

Your instinct is correct: “independent blobs” often look fake. Real cloud fields organize along **fronts, convergence lines, and shear-aligned bands**. A good way to get that organization while keeping Voronoi editability is a **two-layer macro model**:

1. **Group spine (skeleton)**: a set of editable polylines/splines (bands). Think “snake rigs.”
2. **Cells attached to spine**: Voronoi seeds constrained to lie near a spine (or influenced by it).
3. **Mask = spine band × cell breakup**: the spine creates *coherence*, the cells create *local variation*.

Minimal shader-side concept (macro mask):

```glsl
// Pseudo: distance to nearest segment of a polyline (in world XZ)
float distToSpine(vec2 pXZ, vec2 a, vec2 b) {
  vec2 pa = pXZ - a, ba = b - a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa - ba*h);
}

float spineBandMask(float d, float bandRadius, float edgeSoftness) {
  // 1 at center, 0 outside; smooth edge
  float x = 1.0 - d / max(1e-5, bandRadius);
  return smoothstep(0.0, 1.0, x);
}
```

Then multiply the usual cloud density by `spineBandMask` and *within the band* use Worley/Perlin-Worley erosion to keep it organic.

#### 4.6.3 “3D Voronoi chunks + metaballs” — realistic interpretation

There are two distinct ideas here; both are valid if scoped correctly:

- **Metaballs / smooth unions (SDF macro volumes)**: best for *large coherent cloud masses* (anvils, thick stratiform decks, cumulonimbus bodies). Use an SDF “blob field” as a **coarse occupancy mask** and then layer your normal density noise inside. This helps both realism (coherence) and performance (empty-space skipping).
- **Voronoi chunks (cell regions)**: best for *macro partitioning* (pockets, fields, cells). Use Voronoi/Worley to modulate *coverage* and *type*, not to hard-clip clouds into polyhedra.

**Performance win (important):** if you have an SDF-ish coarse mask (metaball union or low-res 3D occupancy), you can do **empty-space skipping**: advance `t` by larger steps when outside the cloud volume, then switch to fine steps inside.

#### 4.6.4 “Hyper realism” constraint: keep the physics knobs in charge

To keep this grounded (and not “procedural art noise”):

- Keep the **vertical profile** (cloud base/top fade, stratification) as the primary shaper.
- Let Voronoi/cells decide **where clouds want to exist** (coverage) and **what archetype** they are.
- Let Perlin-Worley decide **how the cloud breaks up** (erosion/internal detail).
- Let lighting (Beer–Lambert + phase) decide **what the cloud looks like**.

This division of labor matches how production cloud renderers are typically structured: **macro meteorology → meso structure → micro detail → radiance integration**.

**[END:TAG:STRUCTURE]**

---

## 5. DYNAMIC BEHAVIOR MAP (FLOWS)

**[TAG:BEHAVIOR] [TAG:LIGHTING]**

### 5.1 Frame Render Order (boltbestclouds32)

```
1. Camera setup (ray dir, sun dir)
2. Optional: Cloud prepass (uPass=1) → cloudRT[write], half-res
3. Optional: God ray prepass (uPass=2) → godRT[write], half-res
4. Full pass (uPass=0): sky → terrain → ocean → fog → clouds (tex or raymarch) → god rays → composite
5. UI stats throttle (e.g. every 250 ms)
```

**Data flow:** `u.uPass.value = 1` → render to cloudRT → `uCloudTex = cloudRT[write].texture`, `uUseCloudTex = 1`. Full pass samples `uCloudTex` when `uUseCloudTex > 0.5`.

### 5.2 bestclouds(faster) Pass Order

```
BufferA (state) → BufferB (atlas + cloud map) → Image (sky + clouds + stars) → Accum (TAA) → Blit → [Godrays]
```

**Cloud in Image:** `getCloudIntersection` → `mainRay` (primary steps) → inside loop `lightRay` (light steps) → `clouds(p, cloudHeight, sampleDetail)`.

### 5.3 LOD Step Selection (boltbestclouds32)

```
CloudLODSystem.update(cameraPos, cloudPos, dt)
  → distance = cameraPos.distanceTo(cloudPos)
  → lodLevels[].distance → primarySteps, lightSteps
  → uniformsRef.current.uPrimarySteps.value = cloudData.primarySteps
  → (in shader) stepsF = uPrimarySteps; optionally reduce by distToCloud (stepsF = max(8, stepsF*0.25) when far)
```

**[END:TAG:BEHAVIOR]**

---

## 6. INTERFACE & INTEGRATION MAP

**[TAG:INTEGRATION] [TAG:VOLUMETRICS]**

### 6.1 Uniform Contract (Clouds)

**boltbestclouds32 (excerpt):**
- `uCloudCoverage`, `uCloudDensity`, `uCloudScale`, `uCloudSpeed`, `uCloudHeight`, `uCloudThickness`
- `uCloudLightAbsorption`, `uCloudAmbient`, `uCloudSilverLining`
- `uPrimarySteps`, `uLightSteps` (float; passed as numbers from JS)
- `uPass`, `uUseCloudTex`, `uCloudTex`, `uCloudHistoryTex`, `uEnableCloudTemporal`, `uCloudTemporalBlend`

**bestclouds:** `uCloudDensity`, `uCloudShapeSpeed`, `uCloudDetailSpeed`, `uCloudShapeStrength`, `uCloudDetailStrength`, `uCloudBase01`, `uCloudThickness01`, vertical fades; steps via `STEPS_PRIMARY`, `STEPS_LIGHT`.

**bfwe-testbed volumetricCloudShader:** `cloudDensity`, `cloudCoverage`, `cloudScale`, `cloudHeight`, `cloudThickness`, `earthRadius`, `sunDirection`, `sunIntensity`, `time`, `cloudDataTexture`, `blueNoiseTexture`.

### 6.2 UI → Engine (ProEarth)

**CloudsPage (boltbestclouds32):** Sliders for coverage, density, scale, speed, height, thickness, silver lining, primary steps, etc. → `setSettings` / `updateSetting` → `settingsRef.current` → animate loop reads `s.cloudCoverage` etc. and writes `uniforms.uCloudCoverage.value = s.cloudCoverage`. **No separate bridge file;** params flow via React state and refs into uniforms each frame.

**bestclouds:** URL params and harness UI → `uCloudDensity`, etc. → passed to Image shader.

### 6.3 VariableManifest / SeedGraph Alignment (bfwe-testbed)

**NL description:** In bfwe-testbed, `VariableManifest.ts` defines categories (`atmospheric`, `optical`, etc.) and editor types (range, curve, gradient, …) for a unified visual interface. Volumetric and lighting params can align to this spine for consistency.

**Alignment:** Cloud/atmosphere params (coverage, density, scale, height, thickness, silver lining, primary/light steps) map naturally to **VariableCategory** `atmospheric` or `optical`. **EditorType** `range` for scalars, `gradient` for height profile, `polar` for sun direction. When adding cloud controls to a SeedGraph- or VariableManifest-driven UI, use these categories so the encyclopedia and UI stay aligned. See `bfwe-testbed/src/seedgraph-unified/data/VariableManifest.ts` for ROM zones, presets, and relationship edges.

### 6.4 Entry Points

| System | Entry | Cloud material / pass |
|--------|--------|------------------------|
| boltbestclouds32 | `ProceduralEarth.tsx` useEffect (geometry, material, scene, animate) | Single `ShaderMaterial` with full fragment shader; mesh = PlaneGeometry(2,2) |
| bestclouds | `main.js` init, render loop | Image pass uses `mainImage(outColor, fragCoord)` |
| bfwe-testbed | `GlobeScene.tsx` CloudLayer | `createCloudMaterial` (2D) in use; `createVolumetricCloudMaterial` exported but not used in scene |

**[END:TAG:INTEGRATION]**

---

## 7. CONSTRAINTS & PERFORMANCE

**[TAG:PERFORMANCE] [TAG:VOLUMETRICS]**

### 7.1 Limits (Reality vs Games)

| Quantity | Reality | Games (typical) |
|----------|---------|------------------|
| Primary steps | N/A (continuous) | 8–128 (LOD-dependent) |
| Light steps | N/A | 1–10 |
| Wavelength | Full spectrum | RGB (3 channels) |
| Multiple scattering | Full RTE | Single-scatter + approximation |
| Temporal | N/A | 1–2 frames history |

### 7.2 Performance Invariants

- **Step count vs quality:** More primary steps = smoother clouds, higher cost. LOD and half-res reduce cost.
- **Atlas vs procedural:** Atlas = one sample per step; procedural = many FBM/noise calls per step. Atlas faster; procedural more flexible (no texture memory).
- **God rays:** In-shader raymarch is expensive; post-process is cheap but less accurate.
- **Integer uniforms:** Some WebGL1 drivers misbehave with `uniform int`; use `uniform float` and `int(uPass)` in shader (see boltbestclouds32 fix).

### 7.3 Performance Budgets (Typical)

| Target | Primary steps (typical) | Light steps | Resolution / pass | Notes |
|--------|-------------------------|-------------|-------------------|-------|
| 60 FPS (high) | 32–48 | 4–6 | Full or half-res cloud | LOD when far; temporal on |
| 30 FPS (cinematic) | 64–96 | 6–8 | Full | boltbestclouds32 ULTRA/HIGH |
| Fast / mobile | 16–24 | 2–4 | Half-res, FAST mode | bestclouds `#define FAST`, scale=0.5 |

**When to use atlas vs procedural:** Use **atlas** when you need close-up detail and stable FPS (bestclouds-style). Use **procedural** when you need large-scale coherence and no texture memory (boltbestclouds32-style). Hybrid: procedural for far LOD, atlas for close LOD (future).

### 7.4 Failure Modes & Debugging

- **Empty Program Info Log with VALIDATE_STATUS false:** Often driver/GLSL (e.g. integer max() or int uniforms). Fix: float uniforms, float-based max(), `material.name = 'ProceduralEarth'` for clearer errors.
- **Clouds not visible:** Check `uLayerClouds` &gt; 0, `uCloudCoverage` &gt; 0, `uCloudDensity` &gt; 0; cloud height bounds (`uCloudHeight`, `uCloudThickness`) vs camera/ray; `uPass == 0` for full pass (not stuck in prepass).
- **Clouds black or too dark:** Check sun direction and `uSunIntensity`; light march result (`lightTransmit`); `uCloudAmbient`; phase and silver lining terms.
- **Clouds too noisy / banding:** Increase primary steps or enable temporal reprojection; use blue noise for jitter; check dithering in bestclouds.
- **UI change not affecting render:** Trace param from UI → state → ref → uniform; ensure animate loop reads ref and writes uniform each frame (boltbestclouds32: `settingsRef.current`, `uniformsRef.current`).
- **God rays missing:** Check `uLayerGodrays` &gt; 0; god ray prepass enabled and `uGodRayTex` bound; `uGodRayIntensity` &gt; 0; sun screen position correct for post-process variant.

**[END:TAG:PERFORMANCE]**

---

## 8. EVIDENCE & CODE ANCHORS

**[TAG:SUMMARY] [TAG:VOLUMETRICS]**

### 8.1 Code Anchors (Quick Reference)

| Anchor | Path | Purpose |
|--------|------|---------|
| ProceduralEarth (monolith) | `boltbestclouds32/boltbestclouds/src/pages/ProceduralEarth.tsx` | Full-screen cloud + terrain + ocean + atmosphere + god rays |
| CloudLODSystem | `boltbestclouds32/boltbestclouds/src/components/earth/CloudLODSystem.ts` | Distance → primarySteps, lightSteps |
| CloudsPage | `boltbestclouds32/boltbestclouds/src/components/earth/ui/pages/CloudsPage.tsx` | UI for cloud params |
| bestclouds Image | `bestclouds(faster)/shaders/image.glsl` | mainImage, clouds(), mainRay, lightRay |
| bestclouds BufferB | `bestclouds(faster)/shaders/bufferB.glsl` | Perlin-Worley atlas, cloud map |
| bfwe-testbed volumetric | `bfwe-testbed/src/globe/shaders/volumetricCloudShader.ts` | createVolumetricCloudMaterial, 32/6 steps, sphere raymarch |
| bfwe-testbed atmosphere | `bfwe-testbed/src/globe/shaders/atmosphereShader.ts` | createCloudMaterial (2D), createAtmosphereMaterial |

### 8.2 Relationship Matrix

| From | To | Relationship |
|------|-----|---------------|
| CloudsPage | ProceduralEarth (settingsRef) | User edits → setSettings / updateSetting → settingsRef.current |
| CloudLODSystem | ProceduralEarth (uniformsRef) | update() → primarySteps, lightSteps → uPrimarySteps.value, uLightSteps.value |
| ProceduralEarth animate | cloudRT, godRT | uPass=1 → render to cloudRT; uPass=2 → godRT; uPass=0 → full pass, sample uCloudTex / uGodRayTex |
| bestclouds main.js | image.glsl | Pass uniforms (iResolution, iTime, uCloudDensity, …); Image outputs color + depth |
| volumetricCloudShader | GlobeScene | createVolumetricCloudMaterial exported; not currently used in CloudLayer (CloudLayer uses createCloudMaterial) |
| VariableManifest (bfwe-testbed) | Cloud/atmosphere UI | Categories `atmospheric`, `optical`; editor types range/gradient/polar for volumetrics params |

**[END:TAG:SUMMARY]**

---

## 9. DESCRIPTIVE RELATIONSHIP MAPPING (EXHAUSTIVE)

**[TAG:RELATIONSHIP] [TAG:VOLUMETRICS] [TAG:LIGHTING]**

This section maps **reality term → gaming term → code symbol / file** for NL/syntax/code alignment.

### 9.1 Scattering & Absorption

| Reality (NL) | Gaming (NL) | Code / Symbol | File / System |
|--------------|-------------|----------------|---------------|
| Absorption coefficient σ_a | Absorption term in extinction | `uCloudLightAbsorption`, density * stepSize in exp | ProceduralEarth, volumetricCloudShader |
| Scattering coefficient σ_s | Scattering in phase, in-scatter | Phase function * lightTransmit; sigmaS in Hillaire-style | image.glsl, ProceduralEarth |
| Extinction coefficient σ_t | Total attenuation per step | σ_t = σ_s + σ_a (often σ_a=0); exp(-density * stepSize * coeff) | All cloud shaders |
| Single-scattering albedo ω | Ratio scatter/extinction | Implicit (e.g. no absorption → ω=1) | — |

### 9.2 Phase Functions

| Reality (NL) | Gaming (NL) | Code / Symbol | File / System |
|--------------|-------------|----------------|---------------|
| Rayleigh phase P(θ) | Blue sky angular distribution | `rayleighPhase(cosTheta)` | ProceduralEarth atmosphere() |
| Mie phase P(θ) | Sun halo, aerosol forward peak | `miePhase(cosTheta, uMieG)` | ProceduralEarth |
| Henyey-Greenstein P(θ; g) | Cloud/fog phase | `hgPhase(cosTheta, g)`, `HenyeyGreenstein(g, costh)` | volumetricCloudShader, image.glsl |
| Silver lining | Forward peak at cloud edge | `pow(saturate(cosAngle), 8) * uCloudSilverLining` | ProceduralEarth cloudRaymarch |

### 9.3 Transmittance & Beer-Lambert

| Reality (NL) | Gaming (NL) | Code / Symbol | File / System |
|--------------|-------------|----------------|---------------|
| Transmittance T = exp(-∫σ_t ds) | Per-step and cumulative transmittance | `transmittance *= exp(-density*stepSize*...)` | ProceduralEarth, image.glsl, volumetricCloudShader |
| Optical depth τ = ∫σ_t ds | Accumulated density * step along ray | `lightAccum += density * stepSize`; then exp(-lightAccum * coeff) | cloudLightMarch, lightRay |

### 9.4 Cloud Density

| Reality (NL) | Gaming (NL) | Code / Symbol | File / System |
|--------------|-------------|----------------|---------------|
| Liquid water content (3D field) | Density field ρ(x,y,z) | `cloudDensity(pos)`, `sampleCloudDensity(pos, cheap)`, `clouds(p, cloudHeight, sampleDetail)` | ProceduralEarth, image.glsl, volumetricCloudShader |
| Large-scale shape | Base noise / Perlin-Worley | `perlinWorley(samplePos, 1.0)`, `getPerlinWorleyNoise(shapeSize*p)` | ProceduralEarth, image.glsl |
| Detail / erosion | Worley FBM, detail noise | `worleyFBM`, `getPerlinWorleyNoise(detailSize*p)` | ProceduralEarth, image.glsl |
| Vertical profile | Height gradient, base/top fade | `heightGradient`, `uCloudBase01`, `uCloudThickness01`, bottom/top fade | All |
| Coverage | Fraction of sky with clouds | `uCloudCoverage`, remap(density, 1-coverage, 1, 0, 1), cloud map texture | ProceduralEarth, bestclouds |

### 9.5 Raymarching

| Reality (NL) | Gaming (NL) | Code / Symbol | File / System |
|--------------|-------------|----------------|---------------|
| Path integral (RTE) | Discrete raymarch | for (i=0; i&lt;steps; i++) { pos = ro + rd*t; density = ...; luminance += ...; transmittance *= ...; t += stepSize; } | All |
| Primary steps | Number of view-ray samples | `uPrimarySteps`, `STEPS_PRIMARY`, `CLOUD_MARCH_STEPS` | ProceduralEarth, image.glsl, volumetricCloudShader |
| Light steps | Number of sun-ray samples | `uLightSteps`, `STEPS_LIGHT`, `LIGHT_MARCH_STEPS` | Same |
| Step size | (tEnd - tStart) / steps or fixed | `stepSize = (tEnd - tStart) / stepsF` | All |
| Early exit | When transmittance &lt; ε | `if (transmittance < 0.01) break` | ProceduralEarth, image.glsl |

### 9.6 God Rays / Crepuscular

| Reality (NL) | Gaming (NL) | Code / Symbol | File / System |
|--------------|-------------|----------------|---------------|
| Volumetric shadow rays | In-shader god ray raymarch | `godRays(camPos, rd, sunDir, sceneDepth)`, `uGodRaySteps` | ProceduralEarth |
| Screen-space radial blur | Post-process god rays | `godRaysFragmentShader`, sample along ray from sunScreenPos, decay | volumetricCloudShader.ts |
| Shaft intensity | Artist control | `uGodRayIntensity`, `uShaftStrength` | ProceduralEarth, image.glsl |

### 9.7 Temporal & LOD

| Reality (NL) | Gaming (NL) | Code / Symbol | File / System |
|--------------|-------------|----------------|---------------|
| N/A | Temporal reprojection | `uCloudHistoryTex`, `uEnableCloudTemporal`, `uCloudTemporalBlend` | ProceduralEarth |
| N/A | Distance-based LOD | CloudLODSystem lodLevels → primarySteps, lightSteps | CloudLODSystem.ts |
| N/A | Steps reduced when far | `stepsF = max(8, stepsF*0.25)` when distToCloud &gt; 20k | ProceduralEarth cloudRaymarch |
| N/A | FAST mode (fewer steps) | `#define FAST` → STEPS_PRIMARY 32, STEPS_LIGHT 8 | bestclouds image.glsl |

### 9.8 Dithering & Blue Noise

| Reality (NL) | Gaming (NL) | Code / Symbol | File / System |
|--------------|-------------|----------------|---------------|
| N/A | Jitter to reduce banding | Step offset: `t = tStart + stepSize * blueNoise` | ProceduralEarth, volumetricCloudShader |
| N/A | Blue noise texture | `blueNoiseTexture`, `texture2D(blueNoiseTexture, gl_FragCoord.xy/256.0).r` | bfwe-testbed, bestclouds (iChannel) |
| N/A | Dithering define | `#define DITHERING`, golden-ratio offset | bestclouds image.glsl |

### 9.9 Granular Parameter Mappings (Uniform ↔ Physical Quantity)

**boltbestclouds32 cloud uniforms (complete):**

| Uniform | Type | Default | Physical meaning | Range / notes |
|---------|------|---------|------------------|---------------|
| `uCloudCoverage` | float | 0.5 | Fraction of sky with clouds | 0–1; 0=clear, 1=overcast |
| `uCloudDensity` | float | 1.0 | Density multiplier (ρ scale) | 0.1–3; affects opacity |
| `uCloudScale` | float | 1.0 | Noise frequency scale | 0.1–5; larger=smaller clouds |
| `uCloudSpeed` | float | 0.05 | Wind animation speed | 0–1; affects time offset |
| `uCloudHeight` | float | 1500 | Cloud base altitude [m or units] | 500–5000; cumulus ≈ 1000–2000 |
| `uCloudThickness` | float | 1000 | Vertical extent [m or units] | 200–3000; cumulus ≈ 1000 |
| `uCloudLightAbsorption` | float | 0.3 | σ_t scale (extinction) | 0.1–1.0; higher=darker |
| `uCloudAmbient` | float | 0.3 | Ambient light multiplier | 0–1; min brightness |
| `uCloudSilverLining` | float | 0.5 | Forward-scatter boost | 0–2; bright edges |
| `uPrimarySteps` | float | 64 | View raymarch samples | 8–128; LOD adjusted |
| `uLightSteps` | float | 6 | Sun raymarch samples | 1–10; shadow quality |
| `uMultiScattering` | float | 1.0 | Enable multi-scatter approx | 0 or 1; toggle |
| `uPass` | float | 0 | Pass selector | 0=full, 1=cloud, 2=godray |
| `uUseCloudTex` | float | 0 | Use prepass texture | 0 or 1 |
| `uCloudTex` | sampler2D | — | Half-res cloud buffer | From cloudRT |
| `uCloudHistoryTex` | sampler2D | — | Previous frame cloud | Temporal |
| `uEnableCloudTemporal` | float | 0 | Temporal reprojection on | 0 or 1 |
| `uCloudTemporalBlend` | float | 0.9 | Blend factor (history weight) | 0–1; 0.9=smooth, 0.1=noisy |

**bestclouds(faster) cloud uniforms (excerpt):**

| Uniform | Type | Default | Physical meaning | Range / notes |
|---------|------|---------|------------------|---------------|
| `uCloudDensity` | float | 0.075 | Density scale | 0.01–0.5; lower than boltbestclouds32 |
| `uCloudShapeSpeed` | float | -5.0 | Base shape wind speed | -20 to 20 |
| `uCloudDetailSpeed` | float | -10.0 | Detail wind speed | -30 to 30 |
| `uCloudShapeStrength` | float | 0.7 | Shape erosion strength | 0–1 |
| `uCloudDetailStrength` | float | 0.2 | Detail erosion strength | 0–1 |
| `uCloudBase01` | float | 0.0 | Base height (normalized) | 0–1 |
| `uCloudThickness01` | float | 1.0 | Thickness (normalized) | 0–1 |
| `uCloudBottomFade01` | float | 0.08 | Bottom fade zone | 0–0.3 |
| `uCloudTopFade01` | float | 0.12 | Top fade zone | 0–0.3 |
| `uCloudEdgeFade01` | float | 0.10 | Horizontal edge fade | 0–0.3 |

**bfwe-testbed volumetricCloudShader uniforms:**

| Uniform | Type | Default | Physical meaning | Range / notes |
|---------|------|---------|------------------|---------------|
| `cloudDensity` | float | 0.5 | Density multiplier | 0–2 |
| `cloudCoverage` | float | 0.5 | Coverage fraction | 0–1 |
| `cloudScale` | float | 10.0 | Noise frequency | 1–50 |
| `cloudHeight` | float | 0.02 | Base (relative to earth radius) | 0–0.1 |
| `cloudThickness` | float | 0.01 | Thickness (relative) | 0.001–0.05 |
| `earthRadius` | float | 1.0 | Reference radius | Fixed |
| `sunDirection` | vec3 | — | Sun direction (normalized) | Unit vector |
| `sunIntensity` | float | 1.5 | Sun brightness | 0–5 |
| `time` | float | — | Animation time | Seconds |
| `cloudDataTexture` | sampler2D | — | Coverage map (equirectangular) | From generator |
| `blueNoiseTexture` | sampler2D | — | Dithering | 256×256 |

**[END:TAG:RELATIONSHIP]**

---

## 10. IMPLEMENTATION PATTERNS & ANTI-PATTERNS

**[TAG:INTEGRATION] [TAG:PERFORMANCE]**

### 10.1 Best Practices (Patterns)

**Pattern: LOD by distance**
```typescript
// GOOD: Reduce steps when far (CloudLODSystem approach)
const distance = camera.distanceTo(cloudCenter);
if (distance < 2000) steps = 96;
else if (distance < 5000) steps = 64;
else if (distance < 10000) steps = 48;
else steps = 32;
```
✅ **Why:** Step cost dominates performance; fewer steps when detail isn't visible saves GPU time proportionally.

**Pattern: Cheap light march**
```glsl
// GOOD: Skip detail in light march
float lightRayDensity = 0.0;
for (int j = 0; j < STEPS_LIGHT; j++) {
    lightRayDensity += clouds(pos + sunDir * stepSize * float(j), cloudHeight, false);  // false = no detail
}
```
✅ **Why:** Light march is nested inside primary march → N × M samples total. Skipping detail in light march (perlinWorley only, no worleyFBM) cuts cost significantly with minimal visual loss (shadow doesn't need fine detail).

**Pattern: Early exit**
```glsl
// GOOD: Break when transmittance near zero
for (int i = 0; i < steps; i++) {
    // ... sample, accumulate ...
    if (transmittance < 0.01) break;  // 99% opaque
}
```
✅ **Why:** Remaining steps contribute < 1% to final color; skipping them is nearly free quality-wise and saves many samples in dense clouds.

**Pattern: Half-res volumetrics + temporal**
```javascript
// GOOD: Render clouds at half resolution, reproject temporally
const cloudRT = makeRT(width * 0.5, height * 0.5);
// Render to cloudRT
// In full pass: sample cloudRT, blend with history
vec4 current = texture2D(uCloudTex, uv);
vec4 history = texture2D(uCloudHistoryTex, uv);
vec4 final = mix(current, history, 0.9);  // Temporal blend
```
✅ **Why:** 4× fewer pixels to raymarch; temporal blend hides noise and undersampling; nearly same visual quality at 1/4 cost.

**Pattern: Blue noise jitter**
```glsl
// GOOD: Offset ray start with blue noise
float blueNoise = texture2D(blueNoiseTexture, gl_FragCoord.xy / 256.0).r;
float t = tStart + stepSize * blueNoise;
```
✅ **Why:** Breaks up banding from regular sampling; temporal accumulation then smooths the noise → high-quality dithering with no visible pattern.

**Pattern: Phase + silver lining + powder**
```glsl
// GOOD: Combine multiple lighting effects
float phase = hgPhase(cosAngle, 0.3);
float silver = pow(saturate(cosAngle), 8.0) * silverStrength;
float powder = 1.0 - exp(-density * 2.0);
vec3 light = sunColor * lightTransmit * (phase + silver) * powder;
```
✅ **Why:** Phase alone looks flat; silver lining adds bright edges (forward scatter); powder brightens cloud edges (sub-resolution multi-scatter approximation) → realistic, bright, puffy clouds.

### 10.2 Anti-Patterns (Avoid These)

**Anti-pattern: Fixed high step count everywhere**
```glsl
// BAD: Always 128 primary steps regardless of distance
#define STEPS_PRIMARY 128
```
❌ **Why:** Wastes GPU on distant/occluded clouds where detail isn't visible. Use LOD or adaptive step count.

**Anti-pattern: No early exit**
```glsl
// BAD: Always iterate full loop
for (int i = 0; i < steps; i++) {
    // ... sample, accumulate ...
    // (no transmittance check)
}
```
❌ **Why:** Continues sampling when cloud is already 99% opaque; wasted ALU and texture fetches.

**Anti-pattern: Detail in light march**
```glsl
// BAD: Expensive detail sampling in every light march
for (int j = 0; j < lightSteps; j++) {
    density += cloudDensity_FULL_DETAIL(pos + sunDir * step);  // worleyFBM, multiple octaves
}
```
❌ **Why:** Light march is nested → O(primarySteps × lightSteps). If primary=64, light=8 → 512 density samples per pixel. Detail in light march adds octaves → 1500+ noise calls. Use cheap density (base shape only) in light march.

**Anti-pattern: Integer uniforms in WebGL1**
```glsl
// BAD: uniform int in GLSL ES 1.0 on some drivers
uniform int uPass;
uniform int uPrimarySteps;
// ... later: if (uPass == 1) ...
```
❌ **Why:** Some WebGL1 drivers fail program validation with `uniform int` or `max(int, int)`. Use `uniform float` and `int(uPass)`, `float(i) >= uLightSteps` in shader. See boltbestclouds32 fix.

**Anti-pattern: No temporal when using few steps**
```javascript
// BAD: 16 primary steps, no temporal, no dithering
const steps = 16;
// ... raymarch with regular sampling, no history blend
```
❌ **Why:** Low step count → banding and noise. Use temporal reprojection or blue noise jitter to hide undersampling. Either increase steps or add temporal/dithering.

**Anti-pattern: Full-detail density everywhere**
```glsl
// BAD: Always compute perlinWorley + worleyFBM (4–8 octaves) per sample
float density = perlinWorley(p, 1.0) + worleyFBM(p, 3.0);
```
❌ **Why:** FBM octaves are expensive (2ⁿ frequency per octave). Use LOD: far clouds get base shape only; close clouds get detail. Or use atlas (one texture fetch).

### 10.3 Optimization Strategies (Advanced)

**Strategy 1: Adaptive step size (sphere tracing for clouds)**
```glsl
// Instead of fixed stepSize, use distance to nearest cloud
float stepSize = sdCloud(pos) * 0.5;  // SDF or heuristic
t += stepSize;
```
- Larger steps in empty space, smaller in cloud.
- Requires fast SDF or bounding checks; experimental in cloud context.

**Strategy 2: Importance sampling (sun direction)**
```glsl
// Spend more samples in sun-facing regions (more in-scatter)
float importanceBias = 0.5 + 0.5 * dot(rd, sunDir);
float effectiveSteps = steps * (0.5 + 0.5 * importanceBias);
```
- Directional LOD: more steps toward sun, fewer away.
- Tradeoff: anisotropic quality; good for cinematic sun views.

**Strategy 3: Checkerboard rendering (spatial upsampling)**
```javascript
// Render odd frames: even pixels; even frames: odd pixels
const offset = (frame % 2 === 0) ? 0 : 1;
// In shader: if (mod(gl_FragCoord.x + gl_FragCoord.y + offset, 2.0) < 0.5) discard;
// Upsample with neighbor interpolation
```
- Halves cost per frame; temporal blend smooths.
- Used in Horizon Zero Dawn for clouds.

**Strategy 4: Coarse-to-fine (hierarchical raymarch)**
```glsl
// Pass 1: Coarse steps (e.g. 16 steps)
// If hit cloud: refine locally with more steps
// Similar to mipmap LOD for raymarching
```
- Experimental; complex to implement; gains depend on cloud sparsity.

**Strategy 5: Precompute scattering LUTs**
```javascript
// Bake multi-scatter lookup table: (density, mu, height) → luminance
// At runtime: sample LUT instead of multipleOctaves loop
```
- Trades memory for speed; used in some AAA engines.
- bestclouds computes per-frame; could be precomputed for common ranges.

**[END:TAG:INTEGRATION]**

---

## 11. TROUBLESHOOTING FLOWCHART

**[TAG:PERFORMANCE]**

### Clouds Not Visible

```
Clouds not visible?
  ↓
Check layer visibility: uLayerClouds > 0?
  NO → Enable clouds layer
  YES ↓
Check coverage: uCloudCoverage > 0?
  NO → Increase coverage (e.g. 0.5)
  YES ↓
Check density: uCloudDensity > 0?
  NO → Increase density (e.g. 1.0)
  YES ↓
Check height bounds: camera.y in [cloudHeight, cloudHeight+thickness]?
  NO → Adjust cloudHeight or move camera
  YES ↓
Check pass: uPass == 0 (full pass)?
  NO → Ensure full pass runs (not stuck in prepass)
  YES ↓
Check raymarch: cloudRaymarch returns alpha > 0?
  NO → Debug cloudDensity function (print density at test position)
  YES ↓
Check composite: clouds blended correctly in final color?
  NO → Check mix(color, clouds.rgb, clouds.a * uLayerClouds)
```

### Shader Validation Failed

```
WebGL VALIDATE_STATUS false?
  ↓
Check console for "Program Info Log"
  Empty log? ↓
    Check integer uniforms: uniform int → uniform float
    Check integer max/min: max(int, int) → max(float, float)
    Add material.name for clearer errors
  Non-empty log? ↓
    Read error (e.g. undeclared variable, type mismatch)
    Fix and recompile
```

### Poor Performance

```
FPS < 30?
  ↓
Check primarySteps: > 64?
  YES → Reduce or enable LOD
  NO ↓
Check lightSteps: > 8?
  YES → Reduce to 4–6
  NO ↓
Check resolution: rendering full 4K?
  YES → Use half-res cloud pass + upsample
  NO ↓
Check detail sampling: sampleDetail=true in light march?
  YES → Set to false (cheap light march)
  NO ↓
Check monolith: single shader does terrain + ocean + clouds + atmosphere?
  YES → Split into separate passes (cloud-only pass)
  NO ↓
Profile GPU: which function is bottleneck?
  → Use GPU profiler (e.g. Chrome DevTools, RenderDoc)
  → Optimize hot path (reduce octaves, cache noise, atlas)
```

**[END:TAG:PERFORMANCE]**

---

## 12. GLOSSARY (EXPANDED)

**[TAG:SUMMARY]**

**Absorption coefficient (σ_a):** Inherent optical property; fraction of light lost to absorption per unit distance. Wavelength-dependent in reality.

**Albedo (single-scattering):** ω = σ_s / σ_t. Fraction of extinction that scatters rather than absorbs.

**Beer-Lambert law:** Transmittance T = exp(-τ) where τ is optical depth (∫ σ_t ds). Used per step in volumetrics.

**Crepuscular rays:** Beams of light visible due to volumetric scattering when sun is occluded (e.g. by clouds). Same as “god rays” in games.

**Extinction coefficient (σ_t):** σ_t = σ_a + σ_s. Total attenuation per unit distance.

**God rays:** Game term for crepuscular rays; implemented as in-shader raymarch or post-process radial blur.

**Henyey-Greenstein (HG) phase function:** Analytical phase function with one parameter g; g&gt;0 forward, g&lt;0 backward. Used for clouds and aerosols.

**Light marching:** Marching from a sample point toward the sun to compute transmittance (shadow) and thus direct illumination at that point.

**Mie scattering:** Scattering when particle size ≈ wavelength; strong forward peak. Approximated by HG in games.

**Multiple scattering:** Light that bounces more than once inside the volume. Approximated (e.g. Hillaire energy-conserving) rather than fully solved in real-time.

**Participating medium:** Medium that absorbs, scatters, or emits light (atmosphere, clouds, fog).

**Perlin-Worley noise:** Combination of Perlin (smooth) and Worley (cellular) used for cloud density; base shape in many real-time clouds.

**Phase function P(θ):** Angular distribution of scattered light; normalized so ∫ P dΩ = 1.

**Powder effect:** Brightening at cloud edges due to sub-resolution scattering; often 1 - exp(-k*density).

**Primary steps:** Number of samples along the view ray in volumetric raymarching.

**Radiance:** Power per unit area per unit solid angle (W/sr/m²). Quantity solved along rays in RTE.

**Radiative transfer equation (RTE):** Equation governing change of radiance along a ray: extinction loss, in-scattering gain, emission.

**Rayleigh scattering:** Scattering when particle ≪ wavelength; σ ∝ λ⁻⁴; symmetric phase. Blue sky.

**Raymarching:** Stepping along a ray and sampling (e.g. density) at each step; used for volumes (no single hit).

**Silver lining:** Bright edge of clouds when lit from behind; forward scattering at cloud boundary. Often pow(cosAngle, n) * strength.

**Transmittance:** Fraction of light that survives from one point to another; T = exp(-τ).

**Worley noise:** Cellular noise; distance to nearest feature point. Used for cloud blobs and detail.

**Blue noise:** High-frequency noise with minimal low-frequency energy; used for dithering and jitter in raymarching to reduce banding and temporal aliasing. Often a 2D texture (e.g. 256×256) or screen-space sample; bestclouds and bfwe-testbed use blue noise for step offset.

**Double-HG (double Henyey–Greenstein):** Phase function P = w·HG(g1) + (1−w)·HG(g2) used to better match Mie (e.g. forward + backward lobe). Some engines use g_forward ≈ 0.6, g_back ≈ −0.2; games often use single HG or mix of two HG terms.

**Epipolar / epipolar sampling:** Technique for god rays that samples along 1D slices (epipolar lines) from sun through screen, with min-max mipmaps for shadow acceleration; reduces cost vs full 2D raymarch. Not in current ProEarth; reference for future optimization.

**In-scattering:** Radiance added to a ray by light scattered from other directions into the ray direction. The in-scattering integral in the RTE is (σ_s/4π) ∫ p(Ω,Ω') I(Ω') dΩ'; in games we approximate with sun-direction in-scatter (single scatter) plus multi-scatter terms.

**Optical depth (τ):** Dimensionless quantity τ = ∫ σ_t ds along a path; transmittance T = exp(−τ). Used in Beer–Lambert and for light march (accumulate density×step, then T_light = exp(−coeff×accum)).

**Additional advanced terms:**

**Asymmetry parameter (g):** Mean cos θ in phase function; ⟨cos θ⟩ = ∫ P(θ) cos θ dΩ = g. HG phase defined by g. Related: *HG*, *phase*.

**Checkerboard rendering:** Render alternating pixels per frame, upsample. Halves cost; used in Horizon Zero Dawn. See §10.3. Related: *LOD*, *upsampling*.

**Coverage:** Fraction of region with clouds (0–1). Reality: cloud fraction. Games: remap threshold or cloud map. See §3.2, §9.4. Related: *uCloudCoverage*, *cloud map*.

**Dithering:** Add noise to break banding from undersampling. See blue noise, §9.8. Related: *blue noise*, *TAA*.

**Energy conservation:** ∫ phase dΩ = 4π (or 1 depending on normalization). Ensures scattered energy equals input. Related: *phase function*, *RTE*.

**Equirectangular projection:** Map sphere to 2D: lon ∈ [0,2π], lat ∈ [−π/2,π/2] → UV. Used for cloud data texture. Related: *cloudDataTexture*, *spherical coordinates*.

**Forward scattering:** Scattering preferentially in original direction (θ ≈ 0). Mie and HG with g > 0 are forward. Related: *phase*, *HG*, *silver lining*.

**Gradient noise:** Lattice-based noise (Perlin-style); smooth, band-limited. See §4.5. Related: *Perlin*, *FBM*.

**Half-res pass:** Render at 50% width and height (4× fewer pixels). See §3.8, §10.1. Related: *LOD*, *temporal*.

**Hillaire (Sebastien):** Researcher; Frostbite atmosphere/cloud papers (SIGGRAPH 2016, CGF 2020). Energy-conserving integration. See §2.2, §3.5, References. Related: *Frostbite*, *multiple scattering*.

**Irradiance:** Power per unit area [W/m²]. Integrated over hemisphere. Related: *radiance*, *in-scatter*.

**Isotropy:** Scattering equally in all directions (g=0, spherical). Related: *phase*, *HG*.

**Lacunarity:** Frequency multiplier per FBM octave (often 2.0). Higher → more high-freq detail. See §4.5. Related: *FBM*, *octaves*.

**Mean free path:** Average distance photon travels before event = 1/σ_t. Related: *extinction*, *optical depth*.

**Persistence:** Amplitude multiplier per FBM octave (often 0.5). Lower → smoother. See §4.5. Related: *FBM*, *octaves*.

**Quintic:** 5th-order polynomial; used for smooth interpolation. Related: *gradient noise*.

**Remap:** Map [low1, high1] → [low2, high2]. Critical for cloud shaping. See §4.5. Related: *coverage*, *erosion*.

**Scale height (H):** Exponential atmosphere: ρ(h) ∝ exp(−h/H). Rayleigh H ≈ 8 km; Mie H ≈ 1.2 km. Related: *optical depth*, *atmosphere*.

**SDF (Signed Distance Field):** Distance to nearest surface. Used for adaptive step size. See §10.3. Related: *sphere tracing*.

**Size parameter (x):** x = πD/λ. Determines regime: Rayleigh (x≪1), Mie (x≈1), geometric (x≫1). See §2.1. Related: *Rayleigh*, *Mie*.

**Sphere tracing:** Raymarch with step = SDF. See §10.3. Related: *SDF*, *adaptive*.

**TAA (Temporal Anti-Aliasing):** Blend current + history. See §3.7. Related: *reprojection*, *temporal blend*.

**Voronoi:** Partition by nearest point (exists in 2D/3D). Worley noise uses Voronoi cells via nearest-feature-point distance fields. See §4.5 and §4.6. Related: *Worley*.

**Zenith angle (θ):** Angle from vertical. τ(θ) ≈ τ_zenith / cos θ. See §2.3. Related: *Rayleigh*, *optical depth*.

**[END:TAG:SUMMARY]**

---

## 13. REFERENCES

**[TAG:DEPENDENCY]**

- **Radiative transfer (reality):** Cambridge “Radiative Transfer in the Atmosphere and Ocean”; Wikipedia “Radiative transfer”; NOAA GFDL lecture notes.
- **Phase functions:** Wikipedia “Henyey–Greenstein”; pbr-book “Phase Functions”; NVIDIA “Approximate Mie”.
- **Frostbite / Hillaire:** EA Frostbite “Physically Based Sky, Atmosphere & Cloud Rendering” (SIGGRAPH 2016); “Physically-based & Unified Volumetric Rendering”; “A Scalable and Production Ready Sky and Atmosphere Rendering Technique” (CGF 2020).
- **Real-time clouds:** “Real-time dreamy Cloudscapes with Volumetric Raymarching” (Maxime Heckel, Masahiro Inoue); GPU Gems 3 Ch. 13 “Volumetric Light Scattering as a Post-Process”; Horizon Zero Dawn / Zelda TOTK references.
- **Noise:** “Clouds by Perlin and Worley” (LightBulbBox); Inigo Quilez “Dynclouds”; Shadertoy 3sffzj (al-ro); TileableVolumeNoise / Perlin-Worley atlas.
- **ProEarth:** VOLUMETRIC_CLOUDS_AUDIT_AND_MASTER.md (GPTworking); SAM_PROCEDURAL_EARTH_ENGINE.md (boltbestclouds32); earthdocs/SAM/SAM_MASTER_INDEX.md.
- **Volume rendering (theory):** pbr-book 4ed “Volume Scattering”, “Transmittance”; Scratchapixel “Volume Rendering Summary Equations”; Graphics Saarland RIS 2019 slides (volume rendering).
- **VariableManifest / bfwe-testbed:** `bfwe-testbed/src/seedgraph-unified/data/VariableManifest.ts` (categories, editor types, ROM zones) for UI alignment of cloud/atmosphere params.

**[END:TAG:DEPENDENCY]**

---

## 14. PERFORMANCE COST ANALYSIS (QUANTITATIVE)

**[TAG:PERFORMANCE]**

### 14.1 Cost Model (per-pixel)

**Volumetric cloud cost = (Primary steps) × (Density cost) × (Light march cost) × (Resolution factor)**

**Breakdown:**

| Component | Cost (approx GPU ops) | Notes |
|-----------|------------------------|-------|
| Ray-box/sphere intersect | ~20 ops | One-time per pixel |
| **Primary step** (one iteration) | ~50–200 ops | Depends on density complexity |
| └─ Position update | ~5 ops | ro + rd × t |
| └─ Density sample (procedural) | ~100–150 ops | perlinWorley (8 octaves) + worleyFBM (3 octaves) |
| └─ Density sample (atlas) | ~10 ops | One texture fetch + interpolation |
| └─ Light march (nested) | ~(lightSteps × 50) ops | E.g. 6 steps × 50 = 300 ops |
| └─ Phase + effects | ~20 ops | HG, silver, powder |
| └─ Accumulation | ~15 ops | Luminance, transmittance |

**Example cost (boltbestclouds32 HIGH LOD):**
- Primary steps: 64
- Light steps: 6
- Density: procedural (~150 ops)
- Light march: 6 × 150 = 900 ops per primary step
- **Total per pixel:** 64 × (150 + 900 + 35) ≈ **69,000 ops**
- At 1080p (2M pixels): **138 billion ops per frame**
- At 60 FPS: **8.3 trillion ops/sec** → needs powerful GPU

**Example cost (bestclouds FAST, atlas):**
- Primary steps: 32
- Light steps: 8
- Density: atlas (~10 ops)
- Light march: 8 × 10 = 80 ops
- **Total per pixel:** 32 × (10 + 80 + 35) ≈ **4,000 ops**
- At 1080p: **8 billion ops**
- **17× faster than boltbestclouds32 HIGH**

**Half-res cloud pass (boltbestclouds32 optimization):**
- Render clouds at 540p (0.5M pixels) instead of 1080p (2M)
- Cost: 69k ops × 0.5M = **34.5 billion ops** (4× reduction)
- Upsample to 1080p (cheap bilinear)

### 14.2 Optimization ROI (Return on Investment)

| Optimization | Cost reduction | Quality impact | Complexity |
|--------------|----------------|----------------|------------|
| LOD (64→32 steps when far) | 50% | Low (far detail not visible) | Low |
| Atlas vs procedural | 90% (density only) | None (same result) | Medium (prebake atlas) |
| Cheap light march (no detail) | 50% (light march only) | Very low | Very low (one flag) |
| Half-res cloud pass | 75% | Low–medium (temporal hides) | Medium (RT + blend) |
| Early exit (transmittance) | 10–30% (density-dependent) | None | Very low (one if-break) |
| FAST mode (64→32, 10→8) | 50–60% | Medium (more noise; use TAA) | Low (compile flag) |
| Temporal reprojection | −5% (history sample cost) | +quality (hides noise) | Medium (history RT + reproject) |

**[END:TAG:PERFORMANCE]**

---

## 15. HISTORICAL CONTEXT & EVOLUTION

**[TAG:DEPENDENCY]**

### Evolution of Real-Time Volumetric Cloud Rendering

**Pre-2010: Billboard sprites and texture layers**
- Clouds = textured billboards or sphere with cloud texture.
- No volumetric; no lighting; cheap but unrealistic.

**2010–2015: Early raymarching (Shadertoy era)**
- al-ro "Starry Night" (Shadertoy 3sffzj, 2020 but based on earlier work).
- GPU Gems 3 (2007) Ch. 13 "Volumetric Light Scattering" (post-process god rays).
- Perlin/FBM noise for procedural clouds; first real-time volumetrics in hobbyist demos.

**2015–2018: AAA adoption (Horizon Zero Dawn, Frostbite)**
- Guerrilla Games (Horizon Zero Dawn, 2017): Volumetric clouds with checkerboard rendering, temporal reprojection, upsampling.
- Sebastien Hillaire (Frostbite, 2015–2016): "Physically based sky, atmosphere and cloud rendering"; energy-conserving integration; Perlin-Worley atlas.
- Industry standard: 3D noise textures (128³), raymarching with LOD, temporal for quality.

**2018–2022: Refinement and optimization**
- Improved multi-scatter approximations (Wrenninge, multi-octave methods).
- Real-time path tracing in RTX (NVIDIA, 2018+); hybrid: raster clouds + RT for other effects.
- WebGL2 adoption: Float targets, MRT, better for volumetric pipelines.

**2023–2026: WebGPU and neural methods**
- Three.js WebGPU volumetric cloud example (2024+).
- Neural radiance caching (pre-learn scattering LUTs with ML).
- ProEarth boltbestclouds32 (2024–2026): Procedural large-scale + LOD + temporal; bfwe-testbed volumetric shader.

**Key papers and milestones:**
- **GPU Gems 3 (2007):** Post-process god rays.
- **Frostbite (2015–2016):** Hillaire physically-based sky/atmosphere/clouds, energy-conserving.
- **Horizon Zero Dawn (2017):** Checkerboard + temporal for clouds.
- **Hillaire CGF 2020:** "A Scalable and Production Ready Sky and Atmosphere Rendering Technique."
- **ProEarth (2024–2026):** SAM-aligned volumetrics encyclopedia, procedural + atlas hybrid roadmap.

**[END:TAG:DEPENDENCY]**

---

## 16. FUTURE DIRECTIONS & RESEARCH

**[TAG:INTEGRATION]**

### 16.1 Planned ProEarth Enhancements

1. **Hybrid density: Atlas for close, procedural for far**
   - Close (&lt; 5 km): Use Perlin-Worley atlas (bestclouds-style) for detail + speed.
   - Far (&gt; 5 km): Use procedural (boltbestclouds32-style) for coherence + no texture memory.
   - Blend zone (3–7 km): Lerp between atlas and procedural.

2. **Unified cloud pipeline module**
   - Single implementation supporting: sphere (bfwe-testbed) and box (boltbestclouds32) volumes.
   - LOD policy, temporal, atlas/procedural toggle.
   - Use from Three.js (full-screen quad) or WebGL2 harness (Shadertoy-style).

3. **Epipolar god rays**
   - Replace post-process radial blur with epipolar sampling + min-max mipmap.
   - Reference: "Epipolar sampling for shadows and crepuscular rays" (SIGGRAPH 2010).
   - Expected: 2–5× faster than current in-shader god ray march.

4. **Neural scattering LUT**
   - Train small MLP to predict multi-scatter luminance: (density, μ, height) → L.
   - Bake to LUT or run tiny network in shader (if supported).
   - Trade: memory/training vs runtime speed.

### 16.2 Research Directions (Beyond Current ProEarth)

- **Full spectral rendering:** Integrate over λ (e.g. 16 wavelength bands) for accurate sky color, ozone, sunset.
- **Ice crystal optics:** Halos, sundogs, circumzenithal arcs (requires hex prism phase functions).
- **Cloud-aerosol interaction:** Couple cloud density with aerosol fields for realistic pollution/haze.
- **Real-time path tracing:** Use RT cores for multi-bounce in clouds (next-gen only).
- **Dynamic weather coupling:** Cloud density driven by atmospheric simulation (pressure, humidity fields) from FieldStack / AtmosphereV8.

**[END:TAG:INTEGRATION]**

---

## 17. COMPREHENSIVE SYSTEM COMPARISON

**[TAG:STRUCTURE] [TAG:PERFORMANCE]**

### 17.1 Detailed Feature Matrix

| Feature | boltbestclouds32 | bestclouds(faster) | bfwe-testbed (volumetric) | Notes |
|---------|------------------|--------------------|----------------------------|-------|
| **Runtime** | Three.js, WebGL1 | WebGL2, no deps | Three.js, WebGL1/2 | bfwe-testbed can use WebGL2 |
| **Volume shape** | AABB box (±50k) | AABB box (±1k) | Sphere shell (radius-based) | Box = infinite horizon; sphere = globe |
| **Density source** | Procedural: perlinWorley + worleyFBM | **Atlas:** 2D tiles as 3D (32³⁶) + cloud map | Procedural: FBM + Worley + cloudDataTex | Atlas = fastest; procedural = flexible |
| **Density cost** | ~150 ops/sample | ~10 ops/sample | ~100 ops/sample | Atlas 15× faster |
| **Primary steps default** | 64 (LOD 8–96) | 64 (32 FAST) | 32 (fixed) | boltbestclouds32 highest quality |
| **Light steps default** | 6 (LOD 1–8) | 10 (8 FAST) | 6 (fixed) | bestclouds most accurate shadows |
| **LOD system** | CloudLODSystem (5 levels) | #define FAST + ?scale= | None | boltbestclouds32 most sophisticated |
| **Temporal** | Cloud + godray history | TAA (accum) + reproject | None | Both have temporal; different methods |
| **Multi-pass** | 3 passes (cloud, godray, full) | 6 passes (A, B, Image, Accum, Blit, Godrays) | 1 pass (if volumetric used) | bestclouds most modular |
| **God rays method** | In-shader march + prepass | Post-process radial | Post-process (shader exists) | In-shader = accurate; post = fast |
| **Blue noise** | No (could add) | Yes (iChannel) | Yes (blueNoiseTexture) | Dithering improves quality |
| **Phase function** | Mie (g=0.3) | HG double (g₁=0.3, g₂=-0.1, mix 0.7) | HG double (g₁=0.6, g₂=-0.2, mix 0.7) | Double-HG better Mie fit |
| **Silver lining** | Yes (pow(cos, 8) × strength) | Implicit in phase mix | No explicit term | boltbestclouds32 explicit control |
| **Powder** | Yes (1 - exp(-ρ×2)) | Yes (in lightRay) | Yes (powder function) | All three use powder |
| **Multi-scatter approx** | Simple ambient boost | multipleOctaves (4 octaves) | No (could add) | bestclouds most advanced |
| **Coverage control** | uCloudCoverage remap | Cloud map texture + base01 | cloudCoverage param | bestclouds 2D map = artist-driven |
| **Wind animation** | Yes (speed + influence) | Yes (shape + detail speed) | No (time in shader, no wind) | boltbestclouds32 wind perturbation |
| **Weather integration** | uPrecipitation, uThunderstorm | No explicit weather | No | boltbestclouds32 only |
| **Material type** | ShaderMaterial (Three.js) | WebGL programs (no Three.js) | ShaderMaterial (Three.js) | Three.js = easier integration |
| **Lines of code (cloud)** | ~400 (in 1900-line monolith) | ~600 (image.glsl + bufferB) | ~200 (volumetricCloudShader) | bfwe-testbed most concise |
| **FPS (1080p, RTX 3060)** | 20–40 (HIGH), 40–60 (LOW) | 60+ (FAST), 40–60 (default) | 60+ (if wired, 32 steps) | bestclouds fastest |
| **Far-away look** | ★★★★★ | ★★★ | ★★★ | boltbestclouds32 large scale + LOD |
| **Close-up look** | ★★★ | ★★★★★ | ★★★ | bestclouds atlas detail |
| **Maintainability** | ★★ (monolith) | ★★★★ (modular passes) | ★★★★★ (TS modules) | bfwe-testbed best structure |
| **WebGL compatibility** | ✓ WebGL1 (with float fixes) | Requires WebGL2 (float RT, MRT) | ✓ WebGL1/2 | bestclouds needs WebGL2 |

### 17.2 When to Use Which System

| Use case | Recommended system | Why |
|----------|-------------------|-----|
| **Earth view from space** | boltbestclouds32 | Large-scale coherence, LOD, temporal; realistic far-away clouds |
| **Fly-through clouds** | bestclouds(faster) | Atlas detail, FAST mode, high FPS close-up |
| **Globe + future volumetric** | bfwe-testbed | Modular TS structure, sphere volume natural for globe |
| **Cinematic (offline render)** | boltbestclouds32 HIGH LOD | 96 primary, 8 light steps; quality over speed |
| **Mobile / low-end** | bestclouds FAST + scale=0.33 | 32 steps, atlas, 1/3 res → 10× faster |
| **Prototyping / learning** | bfwe-testbed volumetric | Shortest, clearest code; easy to experiment |

### 17.3 Hybrid Approach (Future "Master")

Combine best of all three:
- **Volume:** Box for infinite horizon (boltbestclouds32); sphere for globe (bfwe-testbed).
- **Density:** Atlas close (&lt; 5 km, bestclouds-style); procedural far (&gt; 5 km, boltbestclouds32-style).
- **LOD:** CloudLODSystem for steps; FAST mode; half-res passes; temporal (all three contribute ideas).
- **Structure:** Modular TS (bfwe-testbed); separate cloud pass (not monolith).
- **God rays:** Epipolar (future) or post-process (fast).

**[END:TAG:PERFORMANCE]**

---

## 18. COMPLETE SHADER EXECUTION WALKTHROUGH

**[TAG:BEHAVIOR] [TAG:VOLUMETRICS]**

### Step-by-Step: Single Pixel Render (boltbestclouds32 cloudRaymarch)

**Input state:**
- Pixel UV: (0.512, 0.634) → screen center-right
- Camera: pos=(0, 2000, 5000), yaw=0.1, pitch=0.05, FOV=60
- Sun: azimuth=2.5, elevation=0.8 → sunDir ≈ (−0.36, 0.72, −0.60)
- Settings: coverage=0.6, density=1.2, cloudHeight=1500, thickness=1000, primarySteps=64, lightSteps=6

**Execution trace:**

```
1. CAMERA & RAY SETUP
   getRayDirection(UV, camPos, lookAt, FOV)
   → rd = (0.08, 0.03, −0.996) (nearly forward)

2. RAY-BOX INTERSECTION
   rayBoxIntersect(camPos, rd, vec3(-50k, 1500, -50k), vec3(50k, 2500, 50k))
   → Box min: (-50k, 1500, -50k), max: (50k, 2500, 50k)
   → tMin = ((-50k - 0) / 0.08, (1500 - 2000) / 0.03, ...) = (...)
   → Simplified: tStart ≈ 0 (inside box), tEnd ≈ 30000 (exit box forward)
   → cloudHit = (0, 30000)

3. LOD STEP COUNT
   distToCloud = 0 (already inside)
   → stepsF = 64 (no reduction; close)
   → steps = 64
   → stepSize = 30000 / 64 ≈ 469

4. RAYMARCH INITIALIZATION
   t = 0
   lightAccum = vec3(0)
   transmittance = 1.0

5. LOOP (first iteration, i=0)
   pos = (0, 2000, 5000) + (0.08, 0.03, -0.996) × 0 = (0, 2000, 5000)
   
   5a. DENSITY SAMPLE
       cloudDensity(pos):
         - wind offset: pos += (time×50, 0, time×25) [assume time=10] → pos ≈ (500, 2000, 5250)
         - heightFrac = (2000 - 1500) / 1000 = 0.5 (mid-cloud)
         - heightGradient = remap(0.5, 0, 0.15, 0, 1) × remap(0.5, 0.85, 1, 1, 0) ≈ 1.0 × 1.0 = 1.0
         - samplePos = (500, 2000, 5250) × 0.00015 = (0.075, 0.3, 0.7875)
         - perlinWorleyBase = perlinWorley((0.075, 0.3, 0.7875), 1) ≈ 0.65 [example]
         - worleyDetail = worleyFBM((0.075, 0.3, 0.7875), 3) ≈ 0.45
         - density = remap(0.65, 0.45×0.3, 1, 0, 1) ≈ remap(0.65, 0.135, 1, 0, 1) ≈ 0.596
         - density = remap(0.596, 1−0.6, 1, 0, 1) = remap(0.596, 0.4, 1, 0, 1) ≈ 0.327
         - density × heightGradient × 1.2 (uCloudDensity) ≈ 0.39

   5b. LIGHTING (density > 0.001)
       cloudLightMarch(pos, sunDir):
         - March 6 steps toward sun
         - Assume accumulates lightAccum ≈ 1.2
         - lightTransmit = exp(−1.2 × 0.3 × 0.01) ≈ 0.996 (little shadow)
       
       cosAngle = dot((0.08, 0.03, −0.996), (−0.36, 0.72, −0.60)) ≈ 0.57 (forward-ish)
       phase = miePhase(0.57, 0.3) ≈ 0.32
       silverLining = pow(0.57, 8) × 0.5 ≈ 0.006
       powder = 1 − exp(−0.39 × 2) ≈ 0.54
       
       lightColor = vec3(1, 0.95, 0.8) × 2.0 × 0.996 × (0.32 + 0.006) ≈ (0.65, 0.62, 0.52)
       lightColor += 0.3 × vec3(0.6, 0.7, 0.9) ≈ (0.83, 0.83, 0.79)
       lightColor × 0.54 (powder) ≈ (0.45, 0.45, 0.43)
       
       sampleTransmittance = exp(−0.39 × 469 × 0.3 × 0.01) ≈ exp(−0.55) ≈ 0.577
       
       lightAccum += (0.45, 0.45, 0.43) × 0.39 × 469 × 1.0 × 0.01 ≈ (0.81, 0.81, 0.78)
       transmittance × 0.577 ≈ 0.577

   5c. ADVANCE
       t += 469 → t = 469

6. LOOP (subsequent iterations)
   - pos advances along ray
   - Density varies (noise field)
   - Light accumulates, transmittance decreases
   - After ~30 steps: transmittance ≈ 0.02 → loop breaks (early exit)

7. RETURN
   alpha = 1 − 0.02 = 0.98 (nearly opaque)
   return vec4(lightAccum_final, 0.98)
   → Cloud color for this pixel: (R≈25, G≈24, B≈23) (dark gray cloud, some sun)
```

**Key insights from trace:**
- Height gradient modulates density (max at mid-cloud).
- Coverage threshold (0.6) filters out low-noise regions.
- Light march finds little shadow (clear sun path) → bright.
- Powder and silver lining boost brightness at edges.
- Early exit after ~30 steps (transmittance &lt; 0.01).

**[END:TAG:BEHAVIOR]**

---

## 19. COMMON MISTAKES & EDGE CASES

**[TAG:PERFORMANCE] [TAG:SUMMARY]**

### 19.1 Numerical Stability Issues

**Mistake: Division by zero in energy-conserving integration**
```glsl
// BAD: If density = 0, sigmaE = 0 → divide by zero
vec3 integScatter = (luminance - luminance * T) / sigmaE;
```
**Fix:**
```glsl
// GOOD: Clamp or check
vec3 integScatter = (luminance - luminance * T) / max(sigmaE, 1e-6);
```

**Mistake: exp overflow**
```glsl
// BAD: If optical depth > ~88, exp(-τ) underflows to 0
// If optical depth < -88, exp overflows (shouldn't happen with negative arg, but check signs)
float T = exp(-tau);
```
**Fix:**
```glsl
// GOOD: Clamp optical depth to reasonable range
float tau = min(opticalDepth, 50.0);  // T = exp(-50) ≈ 2e-22 (effectively 0)
float T = exp(-tau);
```

**Mistake: NaN propagation**
```glsl
// BAD: If rd or sunDir not normalized, dot product and phase can be out of range
float cosTheta = dot(rd, sunDir);  // If |rd| ≠ 1 or |sunDir| ≠ 1 → wrong
float phase = hgPhase(cosTheta, g);  // If |cosTheta| > 1 → NaN in pow()
```
**Fix:**
```glsl
// GOOD: Ensure normalized, clamp cosTheta
vec3 rd = normalize(rayDir);
vec3 sunDir = normalize(getSunDirection());
float cosTheta = clamp(dot(rd, sunDir), -1.0, 1.0);
```

### 19.2 Edge Cases

**Edge case: Camera inside cloud volume**
```
If camera.y is between cloudHeight and cloudHeight + thickness:
- tStart from ray-box intersection may be negative or very small
- Need to handle: set tStart = max(0, tStart) or use epsilon (1e-4)
```

**Edge case: Very thin clouds (thickness → 0)**
```
If cloudThickness is very small (e.g. 10 units):
- stepSize = thickness / steps may be < precision
- heightGradient remap may divide by near-zero
- Fix: Clamp thickness to minimum (e.g. max(thickness, 10.0))
```

**Edge case: Sun below horizon**
```
If sunElevation < 0:
- sunDir.y < 0 → sun is below terrain
- Light march may not hit sun → fully shadowed clouds
- Ambient light becomes important (don't let clouds go black)
```

**Edge case: Zero coverage (uCloudCoverage = 0)**
```
remap(density, 1 - 0, 1, 0, 1) = remap(density, 1, 1, 0, 1)
- If density < 1: maps to negative → clamped to 0 (no cloud)
- If density = 1: maps to 0..1 (some cloud)
- Usually correct behavior, but check saturate() afterward
```

### 19.3 Performance Gotchas

**Gotcha: Temporal without motion vectors**
```
Temporal blend without motion/depth correction:
- Camera rotates → clouds smear/ghost badly
- Need: reproject previous frame UV based on camera delta or depth
- boltbestclouds32: Simple blend (no full reprojection) → works for slow camera motion
- bestclouds: Has reprojection logic (camera delta in BufferA)
```

**Gotcha: Integer loop bounds with float uniforms**
```glsl
// POTENTIAL ISSUE: Loop bound is int, uniform is float
for (int i = 0; i < 128; i++) {
    if (float(i) >= uLightSteps) break;  // CORRECT: Cast i to float
    // if (i >= uLightSteps) break;      // WRONG: Compares int to float (some drivers error)
}
```

**Gotcha: Overdraw in transparent passes**
```
Rendering clouds as transparent sphere (bfwe-testbed approach):
- If camera inside sphere → back-face culled or front-face draws full screen
- Front-face with depthWrite=false → overdraw if multiple cloud layers
- Solution: Use full-screen quad (boltbestclouds32) or single shell with correct culling
```

**[END:TAG:SUMMARY]**

---

## 20. ARTIST GUIDELINES (NON-TECHNICAL)

**[TAG:INTEGRATION]**

### What Each Parameter Does (Plain English)

| Parameter | What it controls | Visual effect | Recommended range |
|-----------|------------------|---------------|-------------------|
| **Coverage** | How much of sky has clouds | 0 = clear, 1 = overcast | 0.3–0.7 typical; 0.8+ stormy |
| **Density** | How thick/opaque clouds are | Higher = darker, more solid | 0.5–1.5; 2+ very heavy |
| **Height** | Altitude of cloud base | Higher = high-altitude clouds | 1000–2000 cumulus, 3000+ cirrus |
| **Thickness** | Vertical extent | Thicker = taller clouds | 500–1500 cumulus, 200 stratus |
| **Scale** | Cloud size | Lower = bigger clouds | 0.5–2.0; 0.1 = huge, 5 = tiny |
| **Speed** | How fast clouds move | Wind animation | 0.01–0.2; 0 = frozen |
| **Silver Lining** | Bright edges when backlit | Higher = brighter halos | 0.3–1.0; 0 = none |
| **Ambient** | Minimum cloud brightness | Prevents pure black | 0.2–0.5; higher for daytime |
| **Sun Intensity** | Sun brightness | Affects cloud lighting | 1–3; 2 typical daytime |
| **Sun Elevation** | Sun height in sky | 0 = horizon, π/2 = zenith | 0.5–1.5 daytime |

### Artistic Workflows

**Morning clouds (soft, bright):**
```
coverage = 0.4
density = 0.8
silverLining = 0.8
ambient = 0.4
sunElevation = 0.3 (low sun)
sunColor = (1.0, 0.9, 0.7) warm
```

**Storm clouds (dark, heavy):**
```
coverage = 0.9
density = 2.0
silverLining = 0.2
ambient = 0.1
sunElevation = 0.8
thunderstorm = 1.0 (if available)
```

**High-altitude cirrus (wispy):**
```
coverage = 0.3
density = 0.5
height = 4000
thickness = 500
scale = 2.0 (smaller clouds)
```

**[END:TAG:INTEGRATION]**

---

## 21. PERFORMANCE TUNING GUIDE

**[TAG:PERFORMANCE]**

### Step-by-Step Performance Optimization

**Target: 60 FPS at 1080p on mid-range GPU (RTX 3060, RX 6700)**

```
Step 1: Measure baseline
- Check FPS with current settings
- Use GPU profiler (Chrome DevTools, RenderDoc)
- Identify if cloud raymarch is bottleneck (vs terrain, ocean, etc.)

Step 2: Reduce primary steps (biggest impact)
- If FPS < 30: Reduce primarySteps from 64 to 48
- If still < 30: Reduce to 32
- Enable LOD if not already (CloudLODSystem or distance-based)
- Expected gain: 50% per halving

Step 3: Reduce light steps (medium impact)
- If lightSteps > 6: Reduce to 4 or 6
- Disable detail in light march (sampleDetail = false)
- Expected gain: 30–40%

Step 4: Half-res cloud pass (large impact, medium complexity)
- Render clouds at 0.5 width × 0.5 height
- Enable temporal blend to hide upsampling artifacts
- Expected gain: 75% (4× fewer pixels)

Step 5: Use atlas instead of procedural (if applicable)
- Prebake Perlin-Worley to texture (BufferB-style)
- Replace cloudDensity with single texture sample
- Expected gain: 80–90% on density sampling (10–15% total if bottleneck is steps)

Step 6: Enable temporal (quality boost at slight cost)
- Blend current frame with history (0.9 history weight)
- Allows reducing primary steps further (e.g. 32 with temporal = 48 without)
- Cost: −5% (history sample), Quality: +significant

Step 7: FAST mode (compile-time or dynamic)
- Define STEPS_PRIMARY 32, STEPS_LIGHT 6 for mobile/low-end
- Or use dynamic uniform to toggle
- Expected gain: 50–60%
```

### Performance Budget Targets

| Hardware tier | Target FPS | Max primary steps | Max light steps | Resolution | Notes |
|---------------|------------|-------------------|-----------------|------------|-------|
| **High (RTX 4080, 4K)** | 60 | 96 | 8 | Full | ULTRA LOD, no compromises |
| **Mid (RTX 3060, 1080p)** | 60 | 48–64 | 6 | Full or half-res clouds | HIGH LOD, temporal |
| **Low (GTX 1660, 1080p)** | 30–60 | 32 | 4 | Half-res clouds | FAST mode, atlas if possible |
| **Mobile / integrated** | 30 | 16–24 | 2–3 | Half-res, scale=0.5 | FAST, atlas, aggressive LOD |

**[END:TAG:PERFORMANCE]**

---

## 22. QUICK REFERENCE CARD

**[TAG:SUMMARY]**

### Essential Formulas (Copy-Paste)

```glsl
// Transmittance (Beer-Lambert)
T = exp(-density * stepSize * extinctionCoeff);

// Henyey-Greenstein phase
float hgPhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

// Rayleigh phase
float rayleighPhase(float cosTheta) {
    return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

// Powder effect
float powder = 1.0 - exp(-density * 2.0);

// Silver lining
float silver = pow(saturate(dot(rd, sunDir)), 8.0) * strength;

// Height gradient (cloud vertical profile)
float hFrac = (pos.y - base) / (top - base);
float hGrad = saturate(remap(hFrac, 0.0, 0.15, 0.0, 1.0));
hGrad *= saturate(remap(hFrac, 0.85, 1.0, 1.0, 0.0));

// Coverage remap
density = remap(baseNoise, 1.0 - coverage, 1.0, 0.0, 1.0);

// Remap function
float remap(float x, float a, float b, float c, float d) {
    return c + (x - a) * (d - c) / (b - a);
}

// Ray-box intersection (slab method)
vec2 rayBoxIntersect(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax) {
    vec3 invRd = 1.0 / rd;
    vec3 t0 = (boxMin - ro) * invRd;
    vec3 t1 = (boxMax - ro) * invRd;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tNear = max(max(tmin.x, tmin.y), tmin.z);
    float tFar = min(min(tmax.x, tmax.y), tmax.z);
    return vec2(max(0.0, tNear), max(0.0, tFar - tNear));
}

// Ray-sphere intersection
vec2 raySphereIntersect(vec3 ro, vec3 rd, float radius) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - radius * radius;
    float disc = b * b - c;
    if (disc < 0.0) return vec2(-1.0);
    float sqrtDisc = sqrt(disc);
    return vec2(-b - sqrtDisc, -b + sqrtDisc);
}
```

### Typical Uniform Values (Starting Point)

```glsl
// boltbestclouds32-style
uCloudCoverage = 0.5
uCloudDensity = 1.0
uCloudScale = 1.0
uCloudHeight = 1500.0
uCloudThickness = 1000.0
uCloudSpeed = 0.05
uCloudLightAbsorption = 0.3
uCloudAmbient = 0.3
uCloudSilverLining = 0.5
uPrimarySteps = 64.0
uLightSteps = 6.0
uMultiScattering = 1.0

// bestclouds-style
uCloudDensity = 0.075
uCloudShapeSpeed = -5.0
uCloudDetailSpeed = -10.0
uCloudShapeStrength = 0.7
uCloudDetailStrength = 0.2
uCloudBase01 = 0.0
uCloudThickness01 = 1.0
```

### Debugging Checklist

- [ ] Layer visible? (uLayerClouds > 0)
- [ ] Coverage > 0? (uCloudCoverage)
- [ ] Density > 0? (uCloudDensity)
- [ ] Camera in or near cloud bounds? (height ± thickness)
- [ ] Pass = 0 for full render? (not stuck in prepass)
- [ ] Sun direction valid? (normalized vector)
- [ ] Integer uniforms changed to float? (WebGL1 compatibility)
- [ ] Material has name? (for clearer errors)
- [ ] Temporal blend not too high? (0.9 max; else ghosting)
- [ ] Steps within loop bounds? (i < 128 cap)

**[END:TAG:SUMMARY]**

---

### Related SAM Maps

- **MASTER_ATMOSPHERE_SYSTEM_MAP:** `sources/MASTER_ATMOSPHERE_SYSTEM_MAP.md` – Atmosphere/weather driver → cloud layers → volumetric cloud contracts (AtmosphereV8, WeatherSimulation, CloudVolumetricRenderer, AtmosphereV8Bridge, bfwe-testbed analysis, TerraWorld authoring). References this encyclopedia for volumetrics/lighting physics and shader patterns.

---

### Revision history

| Date | Change |
|------|--------|
| 2026-02-03 | Initial release: reality → games → code mapping, glossary, ProEarth anchors. |
| 2026-02-03 | Enhanced v1: §0 How to Navigate, Key Equations, §2.9 Wavelength tables, §4.4 Quick Symbol Lookup, §7.3 Performance budgets, §7.4 Failure modes & debugging, §6.3 VariableManifest alignment, §9.8 Blue noise, glossary expansion, Related SAM maps, cross-link from 00_MASTER_PROJECT_SYSTEM_MAP. |
| 2026-02-03 | **Expanded to exhaustive depth v2:** §2.1–2.7 detailed physics (size parameter, units, Mie full theory, RTE full derivation with energy-conserving integration, Rayleigh wavelength formula, Beer-Lambert derivation, crepuscular physics, cloud microphysics vertical structure); §3.1–3.5, 3.8 complete code implementations (cloudRaymarch full, cloudDensity procedural+atlas full, cloudLightMarch, multipleOctaves, LOD strategies with code); §4.1 detailed component hierarchy diagram with data flow, §4.5 noise function breakdown (gradient, Worley, FBM, Perlin-Worley, remap with formulas); §9.9 granular uniform tables (boltbestclouds32, bestclouds, bfwe-testbed all cloud uniforms with types, defaults, ranges); §10 Implementation Patterns & Anti-Patterns (6 patterns with code, 6 anti-patterns, 5 optimization strategies); §11 Troubleshooting flowcharts (clouds not visible, shader validation, performance); §12 Glossary expanded to 50+ terms with cross-references (asymmetry, checkerboard, coverage, dithering, energy conservation, equirectangular, forward scatter, gradient noise, half-res, Hillaire, irradiance, isotropy, lacunarity, mean free path, persistence, quintic, remap, scale height, SDF, size parameter, sphere tracing, TAA, Voronoi, zenith); §14 Performance Cost Analysis (quantitative cost model, ops per pixel, optimization ROI table); §15 Historical Context (pre-2010 to 2026, GPU Gems, Frostbite, Horizon, ProEarth); §16 Future Directions (hybrid atlas/procedural, unified pipeline, epipolar god rays, neural LUT, spectral, ice optics, weather coupling); §17 Comprehensive System Comparison (detailed feature matrix, when to use which, hybrid approach); §18 Complete Shader Execution Walkthrough (step-by-step pixel trace with numbers); §19 Common Mistakes & Edge Cases (numerical stability, NaN, camera inside volume, thin clouds, sun below horizon, temporal ghosting, integer loop bounds, overdraw); §20 Artist Guidelines (non-technical param descriptions, artistic workflows for morning/storm/cirrus); §21 Performance Tuning Guide (step-by-step optimization, hardware tier budgets); §22 Quick Reference Card (essential formulas copy-paste, typical values, debugging checklist). Total: 2100+ lines, 60+ code examples, 50+ terms, complete NL/syntax/code mapping, quantitative cost analysis, historical timeline, troubleshooting, artist-friendly, production-ready reference. |

**Document ends. Keep this encyclopedia updated when adding new volumetrics/lighting systems or when aligning new code to this mapping.**

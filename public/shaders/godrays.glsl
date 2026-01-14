#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform sampler2D uScene; // rgba, alpha = cloud transmittance (1 = clear, 0 = fully blocked)

uniform vec2 uLightUv; // screen-space [0..1]
uniform vec3 uLightColor; // rgb in [0..1]

uniform float uIntensity;
uniform float uDensity;
uniform float uDecay;
uniform float uWeight;
uniform int uSamples;
uniform float uSourceRadius; // uv radius of the sun/moon disk

out vec4 outColor;

vec3 toLinear(vec3 srgb) {
  return pow(max(srgb, vec3(0.0)), vec3(2.2));
}

vec3 toSrgb(vec3 linear) {
  return pow(max(linear, vec3(0.0)), vec3(1.0 / 2.2));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 base = texture(uScene, uv);

  vec3 colorLinear = toLinear(base.rgb);

  if (uIntensity <= 0.0 || uSamples <= 0) {
    outColor = vec4(toSrgb(colorLinear), 1.0);
    return;
  }

  // G1.2: Wide clamp - allows the sun/glow center to exist off-screen without pinning to the edge
  vec2 lightUv = clamp(uLightUv, vec2(-0.5), vec2(1.5));

  vec2 delta = (lightUv - uv) * (uDensity / float(uSamples));
  vec2 coord = uv;

  float illuminationDecay = 1.0;
  float sum = 0.0;

  const int MAX_SAMPLES = 128;
  for (int i = 0; i < MAX_SAMPLES; i++) {
    if (i >= uSamples) break;
    coord += delta;
    
    // G1.2: Clamp sampling coordinates to valid texture range
    vec2 coordClamped = clamp(coord, vec2(0.0), vec2(1.0));
    
    // Use unclamped coord for distance so source falloff doesn't 'stick' to the screen edge
    float distToLight = distance(coord, lightUv);
    
    // G1.2: Dual-source system (disk + halo)
    // Tight disk (preserves current look when sun visible)
    float disk = 1.0 - smoothstep(uSourceRadius, uSourceRadius * 1.25, distToLight);
    
    // Broad halo (seeds rays when disk is occluded) - reduced radius and weight
    float halo = 1.0 - smoothstep(0.20, 1.0, distToLight);
    
    // Combine: disk dominant, halo as fallback
    float source = max(disk, halo * 0.15);
    
    float transmittance = clamp(texture(uScene, coordClamped).a, 0.0, 1.0);
    
    // G1.2: Make rays live *in* cloud volume (reduces sky-edge glow)
    float scatter = transmittance * (1.0 - transmittance);
    scatter = sqrt(max(scatter, 0.0));
    sum += (source * scatter) * illuminationDecay;
    illuminationDecay *= uDecay;
  }

  float rays = sum * uWeight * uIntensity;
  colorLinear += uLightColor * rays;

  outColor = vec4(toSrgb(colorLinear), 1.0);
}

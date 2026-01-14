#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform sampler2D uCurrentDepth;
uniform sampler2D uPrevDepth;

uniform float uAlpha; // EMA blend factor in [0,1]
uniform int uReset; // 1 = reset history to current
uniform int uUseReprojection; // 1 = reprojection (depth-aware when available)

uniform vec3 uCameraPosCur;
uniform vec3 uCameraPosPrev;
uniform vec3 uCameraUpCur;
uniform vec3 uCameraUpPrev;

uniform vec3 uTargetDirCur;
uniform vec3 uTargetDirPrev;
uniform float uFovDeg;

out vec4 outColor;

vec3 rayDirection(float fieldOfViewDeg, vec2 fragCoord, vec2 resolution) {
  vec2 xy = fragCoord - resolution / 2.0;
  float z = (0.5 * resolution.y) / tan(radians(fieldOfViewDeg) / 2.0);
  return normalize(vec3(xy, -z));
}

// Matches the al-ro lookAt() (camera position does not matter for the returned basis).
mat3 lookAtDir(vec3 targetDir, vec3 up) {
  vec3 zaxis = normalize(targetDir);
  vec3 xaxis = normalize(cross(zaxis, up));
  vec3 yaxis = cross(xaxis, zaxis);
  return mat3(xaxis, yaxis, -zaxis);
}

vec2 dirToFragCoord(vec3 rayDirCam, float fieldOfViewDeg, vec2 resolution) {
  float z = (0.5 * resolution.y) / tan(radians(fieldOfViewDeg) / 2.0);
  // rayDirCam ~= normalize(vec3(xy, -z))
  // => xy = (-z / rayDirCam.z) * rayDirCam.xy
  float denom = rayDirCam.z;
  // In this camera convention, forward rays have negative z. Clamp away from 0 without flipping sign.
  float k = (-z) / min(-1e-6, denom);
  vec2 xy = k * rayDirCam.xy;
  return xy + resolution / 2.0;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / uResolution;

  vec4 current = texture(uCurrent, uv);

  if (uReset != 0) {
    outColor = current;
    return;
  }

  vec2 uvPrev = uv;
  bool validPrev = true;

  if (uUseReprojection != 0) {
    vec3 upCur = normalize(uCameraUpCur);
    vec3 upPrev = normalize(uCameraUpPrev);
    if (dot(upCur, upCur) < 1e-6) upCur = vec3(0.0, 1.0, 0.0);
    if (dot(upPrev, upPrev) < 1e-6) upPrev = vec3(0.0, 1.0, 0.0);

    vec3 rayCamCur = rayDirection(uFovDeg, fragCoord, uResolution);
    mat3 viewCur = lookAtDir(uTargetDirCur, upCur);
    vec3 rayWorld = normalize(viewCur * rayCamCur);

    mat3 viewPrev = lookAtDir(uTargetDirPrev, upPrev);

    float depthCur = texture(uCurrentDepth, uv).r;
    bool usedDepth = false;

    // Depth-aware reprojection (handles camera translation)
    if (depthCur > 1e-3) {
      vec3 worldPos = uCameraPosCur + rayWorld * depthCur;
      vec3 toPointWorld = worldPos - uCameraPosPrev;
      vec3 posCamPrev = transpose(viewPrev) * toPointWorld;

      // In this camera convention, forward rays have negative z.
      if (posCamPrev.z < -1e-4) {
        vec3 rayCamPrevDir = normalize(posCamPrev);
        vec2 fragPrev = dirToFragCoord(rayCamPrevDir, uFovDeg, uResolution);
        uvPrev = fragPrev / uResolution;
        usedDepth = true;

        if (any(lessThan(uvPrev, vec2(0.0))) || any(greaterThan(uvPrev, vec2(1.0)))) {
          validPrev = false;
        }

        // Disocclusion check: reject history if the reprojected depth doesn't match last frame.
        if (validPrev) {
          float prevDepth = texture(uPrevDepth, uvPrev).r;
          float depthPrevCandidate = length(posCamPrev);
          if (!(prevDepth > 1e-3)) {
            validPrev = false;
          } else {
            float rel = abs(prevDepth - depthPrevCandidate) / max(1e-3, max(prevDepth, depthPrevCandidate));
            if (rel > 0.25) validPrev = false;
          }
        }
      } else {
        validPrev = false;
      }
    }

    // D1: Rotation-only fallback (covers sky/infinite surfaces, and also recovers when depth reprojection fails)
    if (!usedDepth || !validPrev) {
      vec3 rayCamPrev = transpose(viewPrev) * rayWorld;
      if (rayCamPrev.z < -1e-4) {
        vec2 fragPrev = dirToFragCoord(rayCamPrev, uFovDeg, uResolution);
        vec2 uvRot = fragPrev / uResolution;
        if (all(greaterThanEqual(uvRot, vec2(0.0))) && all(lessThanEqual(uvRot, vec2(1.0)))) {
          uvPrev = uvRot;
          validPrev = true;
        } else {
          validPrev = false;
        }
      } else {
        validPrev = false;
      }
    }

    // If reprojection can't find valid history (newly revealed pixels), avoid sampling mismatched history.
    if (!validPrev) {
      outColor = current;
      return;
    }
  }

  vec4 history = texture(uHistory, uvPrev);

  // D1: History clamping (prevents ghost trails while allowing stronger temporal stability)
  vec2 texel = 1.0 / uResolution;
  vec4 c0 = current;
  vec4 c1 = texture(uCurrent, uv + vec2(texel.x, 0.0));
  vec4 c2 = texture(uCurrent, uv - vec2(texel.x, 0.0));
  vec4 c3 = texture(uCurrent, uv + vec2(0.0, texel.y));
  vec4 c4 = texture(uCurrent, uv - vec2(0.0, texel.y));
  vec4 cMin = min(c0, min(min(c1, c2), min(c3, c4)));
  vec4 cMax = max(c0, max(max(c1, c2), max(c3, c4)));
  vec4 pad = vec4(0.01) + (cMax - cMin) * 0.05;
  vec4 historyClamped = clamp(history, cMin - pad, cMax + pad);

  // Motion-aware blend: when reprojection moves a lot, trust the current frame more to reduce "laggy" chunks.
  float alpha = clamp(uAlpha, 0.0, 1.0);
  if (uUseReprojection != 0) {
    float motion = length(uvPrev - uv);
    float w = smoothstep(0.02, 0.18, motion);
    alpha = mix(alpha, 1.0, w);
  }

  // D1: Reactive mask (avoid ghosting at high-contrast edges / cloud silhouette changes)
  float lumCur = dot(current.rgb, vec3(0.299, 0.587, 0.114));
  float lumHist = dot(historyClamped.rgb, vec3(0.299, 0.587, 0.114));
  float lumDiff = abs(lumCur - lumHist);
  float aDiff = abs(current.a - historyClamped.a);
  float reactive = max(smoothstep(0.06, 0.18, lumDiff), smoothstep(0.02, 0.08, aDiff));
  alpha = mix(alpha, 1.0, reactive);

  outColor = mix(historyClamped, current, alpha);
}

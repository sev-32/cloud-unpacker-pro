#version 300 es
precision highp float;
precision highp sampler3D;

uniform float uTime;
uniform float uDeltaTime;

uniform float uSurfaceTemperature;
uniform float uSurfacePressure;
uniform float uSurfaceHumidity;
uniform float uLapseRate;
uniform float uInversionAltitude;
uniform float uInversionStrength;
uniform float uTropopauseAltitude;
uniform float uInstabilityIndex;

uniform float uWindSpeed;
uniform float uWindDirection;

uniform vec3 uGridResolution;
uniform vec4 uGridBounds;

uniform sampler3D uPreviousAtmosphere;

out vec4 outAtmosphere;

const float KELVIN_OFFSET = 273.15;
const float DRY_LAPSE_RATE = 9.8;
const float MOIST_LAPSE_RATE = 6.5;
const float GAS_CONSTANT = 287.05;
const float GRAVITY = 9.81;

float hash3D(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
}

float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash3D(i);
    float n001 = hash3D(i + vec3(0.0, 0.0, 1.0));
    float n010 = hash3D(i + vec3(0.0, 1.0, 0.0));
    float n011 = hash3D(i + vec3(0.0, 1.0, 1.0));
    float n100 = hash3D(i + vec3(1.0, 0.0, 0.0));
    float n101 = hash3D(i + vec3(1.0, 0.0, 1.0));
    float n110 = hash3D(i + vec3(1.0, 1.0, 0.0));
    float n111 = hash3D(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z);
}

float fbm3D(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        value += amplitude * noise3D(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}

float calculateTemperature(float altitude) {
    float temp = uSurfaceTemperature - (uLapseRate / 1000.0) * altitude;

    if (altitude > uInversionAltitude && uInversionStrength > 0.0) {
        float aboveInversion = altitude - uInversionAltitude;
        float inversionEffect = uInversionStrength * (1.0 - exp(-aboveInversion / 500.0));
        temp += inversionEffect;
    }

    if (altitude > uTropopauseAltitude) {
        float aboveTropo = altitude - uTropopauseAltitude;
        temp = max(temp, 216.65);
    }

    return max(temp, 180.0);
}

float calculatePressure(float altitude, float temperature) {
    float L = uLapseRate / 1000.0;

    if (abs(L) < 0.0001) {
        return uSurfacePressure * exp(-GRAVITY * altitude / (GAS_CONSTANT * uSurfaceTemperature));
    }

    float exponent = GRAVITY / (GAS_CONSTANT * L);
    return uSurfacePressure * pow(1.0 - (L * altitude) / uSurfaceTemperature, exponent);
}

float calculateHumidity(float altitude, float baseHumidity) {
    float decay = exp(-altitude / 8000.0);
    return baseHumidity * decay;
}

float calculateDewpoint(float temperature, float humidity) {
    float tempC = temperature - KELVIN_OFFSET;
    float a = 17.27;
    float b = 237.7;
    float gamma = (a * tempC) / (b + tempC) + log(max(0.01, humidity));
    float dewpointC = (b * gamma) / (a - gamma);
    return dewpointC + KELVIN_OFFSET;
}

float calculateLCL(float surfaceTemp, float humidity) {
    float dewpoint = calculateDewpoint(surfaceTemp, humidity);
    float tempDiff = surfaceTemp - dewpoint;
    return max(0.0, tempDiff * 125.0);
}

vec2 calculateWind(float altitude) {
    float shearFactor = 1.0 + altitude / 5000.0;
    float angleShift = (altitude / 10000.0) * 0.3;
    float windAngle = uWindDirection + angleShift;
    float windMag = uWindSpeed * shearFactor;

    return vec2(
        windMag * cos(windAngle),
        windMag * sin(windAngle)
    );
}

float calculateVerticalWind(vec3 worldPos, float instability) {
    float thermalNoise = fbm3D(worldPos / 5000.0 + vec3(uTime * 0.01, 0.0, 0.0), 4);
    return (thermalNoise * 2.0 - 1.0) * instability * 3.0;
}

float calculateInstability(float altitude, float humidity, float baseInstability) {
    float altFactor = 1.0 - min(1.0, altitude / 12000.0);
    float moistFactor = 1.0 + humidity * 0.5;
    return min(1.0, baseInstability * altFactor * moistFactor);
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;

    float gridX = mod(fragCoord.x, uGridResolution.x);
    float gridZ = floor(fragCoord.x / uGridResolution.x);
    float gridY = fragCoord.y;

    vec3 cellIndex = vec3(gridX, gridY, gridZ);
    vec3 normalizedPos = cellIndex / (uGridResolution - 1.0);

    float altitude = mix(uGridBounds.x, uGridBounds.y, normalizedPos.y);
    float worldX = (normalizedPos.x - 0.5) * 2.0 * uGridBounds.z;
    float worldZ = (normalizedPos.z - 0.5) * 2.0 * uGridBounds.w;
    vec3 worldPos = vec3(worldX, altitude, worldZ);

    float temperature = calculateTemperature(altitude);
    float pressure = calculatePressure(altitude, temperature);
    float humidity = calculateHumidity(altitude, uSurfaceHumidity);

    vec2 horizontalWind = calculateWind(altitude);
    float verticalWind = calculateVerticalWind(worldPos, uInstabilityIndex);

    float instability = calculateInstability(altitude, humidity, uInstabilityIndex);

    float lcl = calculateLCL(uSurfaceTemperature, uSurfaceHumidity);
    float condensation = 0.0;
    if (altitude > lcl) {
        float aboveLCL = (altitude - lcl) / 1000.0;
        condensation = smoothstep(0.0, 0.5, aboveLCL) * humidity;
    }

    float normalizedTemp = (temperature - 200.0) / 150.0;
    float windMagnitude = length(vec3(horizontalWind, verticalWind));
    float normalizedWind = min(1.0, windMagnitude / 50.0);

    outAtmosphere = vec4(
        normalizedTemp,
        humidity,
        normalizedWind,
        instability
    );
}

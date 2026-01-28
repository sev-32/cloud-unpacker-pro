import {
  AtmosphericProfile,
  WeatherState,
  celsiusToKelvin,
  ATMOSPHERIC_CONSTANTS,
  createDefaultAtmosphericProfile,
} from './atmosphericTypes';

export interface WeatherPreset {
  id: string;
  name: string;
  description: string;
  category: 'clear' | 'fair' | 'cloudy' | 'stormy' | 'custom';
  atmosphericProfile: AtmosphericProfile;
  cloudSettings: {
    coverage: number;
    typeBlend: number;
    density: number;
  };
  visualSettings: {
    precipitation: number;
    lightning: number;
    stormDarkness: number;
    visibility: number;
  };
}

export const WEATHER_PRESETS: Record<string, WeatherPreset> = {
  clearDay: {
    id: 'clearDay',
    name: 'Clear Day',
    description: 'Bright sunny day with minimal cloud cover',
    category: 'clear',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(25),
        pressure: 1020,
        humidity: 0.35,
        windSpeed: 3,
        windDirection: Math.PI / 6,
      },
      lapseRate: 8.5,
      inversionAltitude: 2000,
      inversionStrength: 2,
      tropopauseAltitude: 12000,
      instabilityIndex: 0.15,
      moistureProfile: 'dry',
    },
    cloudSettings: {
      coverage: 0.1,
      typeBlend: 0.0,
      density: 0.05,
    },
    visualSettings: {
      precipitation: 0,
      lightning: 0,
      stormDarkness: 0,
      visibility: 50000,
    },
  },

  fairWeatherCumulus: {
    id: 'fairWeatherCumulus',
    name: 'Fair Weather Cumulus',
    description: 'Beautiful puffy cumulus clouds on a pleasant day',
    category: 'fair',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(22),
        pressure: 1015,
        humidity: 0.55,
        windSpeed: 5,
        windDirection: Math.PI / 4,
      },
      lapseRate: 7.5,
      inversionAltitude: 2500,
      inversionStrength: 3,
      tropopauseAltitude: 11500,
      instabilityIndex: 0.35,
      moistureProfile: 'moderate',
    },
    cloudSettings: {
      coverage: 0.35,
      typeBlend: 0.15,
      density: 0.075,
    },
    visualSettings: {
      precipitation: 0,
      lightning: 0,
      stormDarkness: 0,
      visibility: 35000,
    },
  },

  overcastStratus: {
    id: 'overcastStratus',
    name: 'Overcast Stratus',
    description: 'Gray overcast sky with flat stratus layer',
    category: 'cloudy',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(15),
        pressure: 1008,
        humidity: 0.85,
        windSpeed: 8,
        windDirection: Math.PI / 2,
      },
      lapseRate: 6.0,
      inversionAltitude: 800,
      inversionStrength: 5,
      tropopauseAltitude: 10000,
      instabilityIndex: 0.1,
      moistureProfile: 'moist',
    },
    cloudSettings: {
      coverage: 0.9,
      typeBlend: 0.5,
      density: 0.06,
    },
    visualSettings: {
      precipitation: 0.1,
      lightning: 0,
      stormDarkness: 0.3,
      visibility: 8000,
    },
  },

  highCirrus: {
    id: 'highCirrus',
    name: 'High Cirrus',
    description: 'Wispy ice crystal clouds at high altitude',
    category: 'fair',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(18),
        pressure: 1018,
        humidity: 0.4,
        windSpeed: 4,
        windDirection: 0,
      },
      lapseRate: 7.0,
      inversionAltitude: 3000,
      inversionStrength: 1,
      tropopauseAltitude: 11000,
      instabilityIndex: 0.2,
      moistureProfile: 'dry',
    },
    cloudSettings: {
      coverage: 0.4,
      typeBlend: 1.0,
      density: 0.03,
    },
    visualSettings: {
      precipitation: 0,
      lightning: 0,
      stormDarkness: 0,
      visibility: 40000,
    },
  },

  buildingCumulus: {
    id: 'buildingCumulus',
    name: 'Building Cumulus',
    description: 'Towering cumulus developing on a hot afternoon',
    category: 'cloudy',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(30),
        pressure: 1010,
        humidity: 0.65,
        windSpeed: 6,
        windDirection: Math.PI / 3,
      },
      lapseRate: 9.0,
      inversionAltitude: 5000,
      inversionStrength: 0,
      tropopauseAltitude: 12000,
      instabilityIndex: 0.6,
      moistureProfile: 'moderate',
    },
    cloudSettings: {
      coverage: 0.5,
      typeBlend: 0.1,
      density: 0.09,
    },
    visualSettings: {
      precipitation: 0,
      lightning: 0,
      stormDarkness: 0.1,
      visibility: 25000,
    },
  },

  approachingStorm: {
    id: 'approachingStorm',
    name: 'Approaching Storm',
    description: 'Dark storm clouds building on the horizon',
    category: 'stormy',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(28),
        pressure: 1002,
        humidity: 0.75,
        windSpeed: 12,
        windDirection: Math.PI * 0.7,
      },
      lapseRate: 9.5,
      inversionAltitude: 8000,
      inversionStrength: 0,
      tropopauseAltitude: 13000,
      instabilityIndex: 0.75,
      moistureProfile: 'moist',
    },
    cloudSettings: {
      coverage: 0.7,
      typeBlend: 0.2,
      density: 0.1,
    },
    visualSettings: {
      precipitation: 0.2,
      lightning: 0.3,
      stormDarkness: 0.4,
      visibility: 15000,
    },
  },

  activeThunderstorm: {
    id: 'activeThunderstorm',
    name: 'Active Thunderstorm',
    description: 'Mature thunderstorm with lightning and heavy rain',
    category: 'stormy',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(24),
        pressure: 995,
        humidity: 0.9,
        windSpeed: 20,
        windDirection: Math.PI,
      },
      lapseRate: 10.0,
      inversionAltitude: 10000,
      inversionStrength: 0,
      tropopauseAltitude: 14000,
      instabilityIndex: 0.95,
      moistureProfile: 'saturated',
    },
    cloudSettings: {
      coverage: 0.95,
      typeBlend: 0.15,
      density: 0.12,
    },
    visualSettings: {
      precipitation: 0.8,
      lightning: 0.8,
      stormDarkness: 0.7,
      visibility: 3000,
    },
  },

  foggyMorning: {
    id: 'foggyMorning',
    name: 'Foggy Morning',
    description: 'Dense morning fog with low visibility',
    category: 'cloudy',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(10),
        pressure: 1022,
        humidity: 0.98,
        windSpeed: 1,
        windDirection: 0,
      },
      lapseRate: 4.0,
      inversionAltitude: 200,
      inversionStrength: 8,
      tropopauseAltitude: 10000,
      instabilityIndex: 0.05,
      moistureProfile: 'saturated',
    },
    cloudSettings: {
      coverage: 1.0,
      typeBlend: 0.5,
      density: 0.04,
    },
    visualSettings: {
      precipitation: 0,
      lightning: 0,
      stormDarkness: 0.2,
      visibility: 500,
    },
  },

  winterCold: {
    id: 'winterCold',
    name: 'Winter Cold',
    description: 'Cold winter day with mixed clouds',
    category: 'cloudy',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(-5),
        pressure: 1030,
        humidity: 0.6,
        windSpeed: 10,
        windDirection: Math.PI * 1.5,
      },
      lapseRate: 6.5,
      inversionAltitude: 1000,
      inversionStrength: 4,
      tropopauseAltitude: 9000,
      instabilityIndex: 0.2,
      moistureProfile: 'moderate',
    },
    cloudSettings: {
      coverage: 0.6,
      typeBlend: 0.6,
      density: 0.05,
    },
    visualSettings: {
      precipitation: 0.15,
      lightning: 0,
      stormDarkness: 0.15,
      visibility: 20000,
    },
  },

  tropicalHumid: {
    id: 'tropicalHumid',
    name: 'Tropical Humid',
    description: 'Hot and humid tropical atmosphere',
    category: 'fair',
    atmosphericProfile: {
      surfaceConditions: {
        temperature: celsiusToKelvin(32),
        pressure: 1008,
        humidity: 0.8,
        windSpeed: 4,
        windDirection: Math.PI / 8,
      },
      lapseRate: 6.0,
      inversionAltitude: 1500,
      inversionStrength: 2,
      tropopauseAltitude: 16000,
      instabilityIndex: 0.5,
      moistureProfile: 'moist',
    },
    cloudSettings: {
      coverage: 0.45,
      typeBlend: 0.2,
      density: 0.08,
    },
    visualSettings: {
      precipitation: 0.05,
      lightning: 0,
      stormDarkness: 0.05,
      visibility: 20000,
    },
  },
};

export function getPresetById(id: string): WeatherPreset | null {
  return WEATHER_PRESETS[id] || null;
}

export function getPresetsByCategory(category: WeatherPreset['category']): WeatherPreset[] {
  return Object.values(WEATHER_PRESETS).filter(p => p.category === category);
}

export function getAllPresets(): WeatherPreset[] {
  return Object.values(WEATHER_PRESETS);
}

export function interpolateProfiles(
  from: AtmosphericProfile,
  to: AtmosphericProfile,
  t: number
): AtmosphericProfile {
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const lerpAngle = (a: number, b: number) => {
    let diff = b - a;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return a + diff * t;
  };

  return {
    surfaceConditions: {
      temperature: lerp(from.surfaceConditions.temperature, to.surfaceConditions.temperature),
      pressure: lerp(from.surfaceConditions.pressure, to.surfaceConditions.pressure),
      humidity: lerp(from.surfaceConditions.humidity, to.surfaceConditions.humidity),
      windSpeed: lerp(from.surfaceConditions.windSpeed, to.surfaceConditions.windSpeed),
      windDirection: lerpAngle(from.surfaceConditions.windDirection, to.surfaceConditions.windDirection),
    },
    lapseRate: lerp(from.lapseRate, to.lapseRate),
    inversionAltitude: lerp(from.inversionAltitude, to.inversionAltitude),
    inversionStrength: lerp(from.inversionStrength, to.inversionStrength),
    tropopauseAltitude: lerp(from.tropopauseAltitude, to.tropopauseAltitude),
    instabilityIndex: lerp(from.instabilityIndex, to.instabilityIndex),
    moistureProfile: t < 0.5 ? from.moistureProfile : to.moistureProfile,
  };
}

export function interpolatePresets(
  from: WeatherPreset,
  to: WeatherPreset,
  t: number
): { profile: AtmosphericProfile; clouds: WeatherPreset['cloudSettings']; visual: WeatherPreset['visualSettings'] } {
  const lerp = (a: number, b: number) => a + (b - a) * t;

  return {
    profile: interpolateProfiles(from.atmosphericProfile, to.atmosphericProfile, t),
    clouds: {
      coverage: lerp(from.cloudSettings.coverage, to.cloudSettings.coverage),
      typeBlend: lerp(from.cloudSettings.typeBlend, to.cloudSettings.typeBlend),
      density: lerp(from.cloudSettings.density, to.cloudSettings.density),
    },
    visual: {
      precipitation: lerp(from.visualSettings.precipitation, to.visualSettings.precipitation),
      lightning: lerp(from.visualSettings.lightning, to.visualSettings.lightning),
      stormDarkness: lerp(from.visualSettings.stormDarkness, to.visualSettings.stormDarkness),
      visibility: lerp(from.visualSettings.visibility, to.visualSettings.visibility),
    },
  };
}

export function createCustomPreset(
  name: string,
  profile: AtmosphericProfile,
  clouds: WeatherPreset['cloudSettings'],
  visual: WeatherPreset['visualSettings']
): WeatherPreset {
  return {
    id: `custom_${Date.now()}`,
    name,
    description: 'Custom weather preset',
    category: 'custom',
    atmosphericProfile: profile,
    cloudSettings: clouds,
    visualSettings: visual,
  };
}

export function serializePreset(preset: WeatherPreset): string {
  return JSON.stringify(preset);
}

export function deserializePreset(json: string): WeatherPreset | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.id && parsed.atmosphericProfile && parsed.cloudSettings) {
      return parsed as WeatherPreset;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePresetToStorage(preset: WeatherPreset): void {
  const key = `weather_preset_${preset.id}`;
  localStorage.setItem(key, serializePreset(preset));
}

export function loadPresetFromStorage(id: string): WeatherPreset | null {
  const key = `weather_preset_${id}`;
  const json = localStorage.getItem(key);
  return json ? deserializePreset(json) : null;
}

export function listSavedPresets(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('weather_preset_custom_')) {
      keys.push(key.replace('weather_preset_', ''));
    }
  }
  return keys;
}

export function deletePresetFromStorage(id: string): void {
  const key = `weather_preset_${id}`;
  localStorage.removeItem(key);
}

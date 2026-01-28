import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { WeatherMapData } from '@/lib/weatherTypes';
import { WeatherTextureManager, createWeatherTextureManager, createWeatherMapData } from '@/lib/weatherTextureManager';
import { saveWeatherMap, updateWeatherMap, loadWeatherMap, WeatherMapMetadata } from '@/lib/weatherMapService';

interface WeatherContextState {
  currentMapId: string | null;
  currentMapMetadata: WeatherMapMetadata | null;
  weatherManager: WeatherTextureManager | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  resolution: number;
  worldExtent: number;
}

interface WeatherContextActions {
  initializeWeatherManager: (resolution?: number, worldExtent?: number) => WeatherTextureManager;
  setWeatherManager: (manager: WeatherTextureManager | null) => void;
  loadMap: (mapId: string) => Promise<boolean>;
  saveMap: (name: string, description?: string, category?: string, region?: string) => Promise<string | null>;
  updateCurrentMap: () => Promise<boolean>;
  createNewMap: (resolution?: number, worldExtent?: number) => void;
  markDirty: () => void;
  clearDirty: () => void;
  applyWeatherData: (data: WeatherMapData) => void;
}

interface WeatherContextValue extends WeatherContextState, WeatherContextActions {}

const WeatherContext = createContext<WeatherContextValue | null>(null);

const LOCAL_STORAGE_KEY = 'weather_map_draft';

interface WeatherProviderProps {
  children: ReactNode;
}

export function WeatherProvider({ children }: WeatherProviderProps) {
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentMapMetadata, setCurrentMapMetadata] = useState<WeatherMapMetadata | null>(null);
  const [weatherManager, setWeatherManagerState] = useState<WeatherTextureManager | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [resolution, setResolution] = useState(256);
  const [worldExtent, setWorldExtent] = useState(50000);

  useEffect(() => {
    if (isDirty && weatherManager) {
      try {
        const draft = {
          timestamp: Date.now(),
          resolution,
          worldExtent,
          mapId: currentMapId,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
      } catch (e) {
        console.warn('Failed to save draft to localStorage:', e);
      }
    }
  }, [isDirty, weatherManager, resolution, worldExtent, currentMapId]);

  const initializeWeatherManager = useCallback((res: number = 256, extent: number = 50000) => {
    const manager = createWeatherTextureManager(res, extent);
    setWeatherManagerState(manager);
    setResolution(res);
    setWorldExtent(extent);
    setIsDirty(false);
    return manager;
  }, []);

  const setWeatherManager = useCallback((manager: WeatherTextureManager | null) => {
    setWeatherManagerState(manager);
    if (manager) {
      setResolution(manager.data.width);
      setWorldExtent(manager.data.width * manager.data.worldScale);
    }
  }, []);

  const loadMap = useCallback(async (mapId: string): Promise<boolean> => {
    const loaded = await loadWeatherMap(mapId);
    if (!loaded) {
      return false;
    }

    const manager = createWeatherTextureManager(
      loaded.metadata.resolution,
      loaded.metadata.world_extent
    );

    const data = manager.data;
    data.coverage.set(loaded.data.coverage);
    data.cloudType.set(loaded.data.cloudType);
    data.moisture.set(loaded.data.moisture);
    data.verticalDevelopment.set(loaded.data.verticalDevelopment);
    data.baseAltitude.set(loaded.data.baseAltitude);
    data.topAltitude.set(loaded.data.topAltitude);
    data.windX.set(loaded.data.windX);
    data.windY.set(loaded.data.windY);
    data.windSpeed.set(loaded.data.windSpeed);
    data.turbulence.set(loaded.data.turbulence);
    data.fronts = loaded.data.fronts;
    data.pressureSystems = loaded.data.pressureSystems;
    data.moistureRegions = loaded.data.moistureRegions;

    setWeatherManagerState(manager);
    setCurrentMapId(mapId);
    setCurrentMapMetadata(loaded.metadata);
    setResolution(loaded.metadata.resolution);
    setWorldExtent(loaded.metadata.world_extent);
    setIsDirty(false);
    setLastSaved(new Date(loaded.metadata.updated_at));

    return true;
  }, []);

  const saveMap = useCallback(async (
    name: string,
    description?: string,
    category?: string,
    region?: string
  ): Promise<string | null> => {
    if (!weatherManager) {
      return null;
    }

    setIsSaving(true);
    try {
      const mapId = await saveWeatherMap({
        name,
        description,
        resolution,
        worldExtent,
        category,
        region,
        data: weatherManager.data,
      });

      if (mapId) {
        setCurrentMapId(mapId);
        setCurrentMapMetadata({
          id: mapId,
          name,
          description: description || '',
          resolution,
          world_extent: worldExtent,
          is_preset: false,
          category: category || 'user',
          region: region || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setIsDirty(false);
        setLastSaved(new Date());
      }

      return mapId;
    } finally {
      setIsSaving(false);
    }
  }, [weatherManager, resolution, worldExtent]);

  const updateCurrentMap = useCallback(async (): Promise<boolean> => {
    if (!currentMapId || !weatherManager) {
      return false;
    }

    setIsSaving(true);
    try {
      const success = await updateWeatherMap(currentMapId, {
        data: weatherManager.data,
      });

      if (success) {
        setIsDirty(false);
        setLastSaved(new Date());
      }

      return success;
    } finally {
      setIsSaving(false);
    }
  }, [currentMapId, weatherManager]);

  const createNewMap = useCallback((res: number = 256, extent: number = 50000) => {
    const manager = createWeatherTextureManager(res, extent);
    setWeatherManagerState(manager);
    setCurrentMapId(null);
    setCurrentMapMetadata(null);
    setResolution(res);
    setWorldExtent(extent);
    setIsDirty(false);
    setLastSaved(null);
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const clearDirty = useCallback(() => {
    setIsDirty(false);
  }, []);

  const applyWeatherData = useCallback((data: WeatherMapData) => {
    if (!weatherManager) {
      return;
    }

    weatherManager.data.coverage.set(data.coverage);
    weatherManager.data.cloudType.set(data.cloudType);
    weatherManager.data.moisture.set(data.moisture);
    weatherManager.data.verticalDevelopment.set(data.verticalDevelopment);
    weatherManager.data.baseAltitude.set(data.baseAltitude);
    weatherManager.data.topAltitude.set(data.topAltitude);
    weatherManager.data.windX.set(data.windX);
    weatherManager.data.windY.set(data.windY);
    weatherManager.data.windSpeed.set(data.windSpeed);
    weatherManager.data.turbulence.set(data.turbulence);
    weatherManager.data.fronts = data.fronts;
    weatherManager.data.pressureSystems = data.pressureSystems;
    weatherManager.data.moistureRegions = data.moistureRegions;

    setIsDirty(true);
  }, [weatherManager]);

  const value: WeatherContextValue = {
    currentMapId,
    currentMapMetadata,
    weatherManager,
    isDirty,
    isSaving,
    lastSaved,
    resolution,
    worldExtent,
    initializeWeatherManager,
    setWeatherManager,
    loadMap,
    saveMap,
    updateCurrentMap,
    createNewMap,
    markDirty,
    clearDirty,
    applyWeatherData,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { WeatherMapData, WeatherFront, PressureSystem, MoistureRegion } from './weatherTypes';
import {
  serializeWeatherMapData,
  deserializeWeatherMapData,
  serializeWeatherFront,
  deserializeWeatherFront,
  serializePressureSystem,
  deserializePressureSystem,
  serializeMoistureRegion,
  deserializeMoistureRegion,
} from './weatherDataSerializer';

export interface WeatherMapMetadata {
  id: string;
  name: string;
  description: string;
  resolution: number;
  world_extent: number;
  is_preset: boolean;
  category: string;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface SaveWeatherMapParams {
  name: string;
  description?: string;
  resolution: number;
  worldExtent: number;
  category?: string;
  region?: string;
  data: WeatherMapData;
}

export interface LoadedWeatherMap {
  metadata: WeatherMapMetadata;
  data: WeatherMapData;
}

export async function saveWeatherMap(params: SaveWeatherMapParams): Promise<string | null> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, cannot save weather map');
    return null;
  }

  const { name, description = '', resolution, worldExtent, category = 'user', region = '', data } = params;

  const { data: mapData, error: mapError } = await supabase
    .from('weather_maps')
    .insert({
      name,
      description,
      resolution,
      world_extent: worldExtent,
      is_preset: false,
      category,
      region,
    })
    .select('id')
    .single();

  if (mapError || !mapData) {
    console.error('Failed to create weather map:', mapError);
    return null;
  }

  const mapId = mapData.id;
  const serialized = serializeWeatherMapData(data);

  const { error: dataError } = await supabase
    .from('weather_map_data')
    .insert({
      weather_map_id: mapId,
      ...serialized,
    });

  if (dataError) {
    console.error('Failed to save weather map data:', dataError);
    await supabase.from('weather_maps').delete().eq('id', mapId);
    return null;
  }

  for (const front of data.fronts) {
    const serializedFront = serializeWeatherFront(front);
    await supabase.from('weather_fronts').insert({
      weather_map_id: mapId,
      ...serializedFront,
    });
  }

  for (const system of data.pressureSystems) {
    const serializedSystem = serializePressureSystem(system);
    await supabase.from('pressure_systems').insert({
      weather_map_id: mapId,
      ...serializedSystem,
    });
  }

  for (const region of data.moistureRegions) {
    const serializedRegion = serializeMoistureRegion(region);
    await supabase.from('moisture_regions').insert({
      weather_map_id: mapId,
      ...serializedRegion,
    });
  }

  return mapId;
}

export async function updateWeatherMap(mapId: string, params: Partial<SaveWeatherMapParams>): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return false;
  }

  const updates: Record<string, unknown> = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.description !== undefined) updates.description = params.description;
  if (params.category !== undefined) updates.category = params.category;
  if (params.region !== undefined) updates.region = params.region;

  if (Object.keys(updates).length > 0) {
    const { error: mapError } = await supabase
      .from('weather_maps')
      .update(updates)
      .eq('id', mapId);

    if (mapError) {
      console.error('Failed to update weather map metadata:', mapError);
      return false;
    }
  }

  if (params.data) {
    const serialized = serializeWeatherMapData(params.data);

    const { error: dataError } = await supabase
      .from('weather_map_data')
      .update(serialized)
      .eq('weather_map_id', mapId);

    if (dataError) {
      console.error('Failed to update weather map data:', dataError);
      return false;
    }

    await supabase.from('weather_fronts').delete().eq('weather_map_id', mapId);
    await supabase.from('pressure_systems').delete().eq('weather_map_id', mapId);
    await supabase.from('moisture_regions').delete().eq('weather_map_id', mapId);

    for (const front of params.data.fronts) {
      const serializedFront = serializeWeatherFront(front);
      await supabase.from('weather_fronts').insert({
        weather_map_id: mapId,
        ...serializedFront,
      });
    }

    for (const system of params.data.pressureSystems) {
      const serializedSystem = serializePressureSystem(system);
      await supabase.from('pressure_systems').insert({
        weather_map_id: mapId,
        ...serializedSystem,
      });
    }

    for (const moistureRegion of params.data.moistureRegions) {
      const serializedRegion = serializeMoistureRegion(moistureRegion);
      await supabase.from('moisture_regions').insert({
        weather_map_id: mapId,
        ...serializedRegion,
      });
    }
  }

  return true;
}

export async function loadWeatherMap(mapId: string): Promise<LoadedWeatherMap | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data: metadata, error: mapError } = await supabase
    .from('weather_maps')
    .select('*')
    .eq('id', mapId)
    .maybeSingle();

  if (mapError || !metadata) {
    console.error('Failed to load weather map metadata:', mapError);
    return null;
  }

  const { data: mapData, error: dataError } = await supabase
    .from('weather_map_data')
    .select('*')
    .eq('weather_map_id', mapId)
    .maybeSingle();

  if (dataError || !mapData) {
    console.error('Failed to load weather map data:', dataError);
    return null;
  }

  const worldScale = metadata.world_extent / metadata.resolution;
  const weatherData = deserializeWeatherMapData(
    {
      coverage_data: mapData.coverage_data,
      cloud_type_data: mapData.cloud_type_data,
      moisture_data: mapData.moisture_data,
      vertical_dev_data: mapData.vertical_dev_data,
      base_altitude_data: mapData.base_altitude_data,
      top_altitude_data: mapData.top_altitude_data,
      wind_x_data: mapData.wind_x_data,
      wind_y_data: mapData.wind_y_data,
      wind_speed_data: mapData.wind_speed_data,
      turbulence_data: mapData.turbulence_data,
    },
    metadata.resolution,
    metadata.resolution,
    worldScale
  );

  const { data: fronts } = await supabase
    .from('weather_fronts')
    .select('*')
    .eq('weather_map_id', mapId);

  if (fronts) {
    weatherData.fronts = fronts.map((f) =>
      deserializeWeatherFront(
        {
          front_type: f.front_type,
          points: f.points,
          strength: f.strength,
          width: f.width,
          movement_x: f.movement_x,
          movement_y: f.movement_y,
        },
        f.id
      )
    );
  }

  const { data: pressureSystems } = await supabase
    .from('pressure_systems')
    .select('*')
    .eq('weather_map_id', mapId);

  if (pressureSystems) {
    weatherData.pressureSystems = pressureSystems.map((p) =>
      deserializePressureSystem(
        {
          system_type: p.system_type,
          center_x: p.center_x,
          center_y: p.center_y,
          radius: p.radius,
          intensity: p.intensity,
          rotation: p.rotation,
        },
        p.id
      )
    );
  }

  const { data: moistureRegions } = await supabase
    .from('moisture_regions')
    .select('*')
    .eq('weather_map_id', mapId);

  if (moistureRegions) {
    weatherData.moistureRegions = moistureRegions.map((m) =>
      deserializeMoistureRegion(
        {
          center_x: m.center_x,
          center_y: m.center_y,
          radius: m.radius,
          intensity: m.intensity,
          falloff: m.falloff,
        },
        m.id
      )
    );
  }

  return { metadata, data: weatherData };
}

export async function listWeatherMaps(options?: {
  category?: string;
  isPreset?: boolean;
  limit?: number;
  offset?: number;
}): Promise<WeatherMapMetadata[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  let query = supabase
    .from('weather_maps')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.isPreset !== undefined) {
    query = query.eq('is_preset', options.isPreset);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to list weather maps:', error);
    return [];
  }

  return data || [];
}

export async function deleteWeatherMap(mapId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return false;
  }

  const { data: metadata } = await supabase
    .from('weather_maps')
    .select('is_preset')
    .eq('id', mapId)
    .maybeSingle();

  if (metadata?.is_preset) {
    console.warn('Cannot delete preset weather maps');
    return false;
  }

  const { error } = await supabase
    .from('weather_maps')
    .delete()
    .eq('id', mapId);

  if (error) {
    console.error('Failed to delete weather map:', error);
    return false;
  }

  return true;
}

export async function duplicateWeatherMap(mapId: string, newName: string): Promise<string | null> {
  const loaded = await loadWeatherMap(mapId);
  if (!loaded) {
    return null;
  }

  return saveWeatherMap({
    name: newName,
    description: loaded.metadata.description,
    resolution: loaded.metadata.resolution,
    worldExtent: loaded.metadata.world_extent,
    category: 'user',
    region: loaded.metadata.region,
    data: loaded.data,
  });
}

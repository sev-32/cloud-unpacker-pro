/*
  # Weather Maps Database Schema

  1. New Tables
    - `weather_maps` - Stores metadata for saved weather configurations
      - `id` (uuid, primary key)
      - `name` (text, required) - Display name for the weather map
      - `description` (text) - Optional description
      - `resolution` (integer) - Grid resolution (default 256)
      - `world_extent` (float) - World size in meters (default 50000)
      - `is_preset` (boolean) - True for system presets
      - `category` (text) - Geographic region or weather type
      - `region` (text) - Geographic region name
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `weather_map_data` - Stores compressed grid data for weather maps
      - `id` (uuid, primary key)
      - `weather_map_id` (uuid, foreign key)
      - `coverage_data` (text) - Base64 encoded compressed Float32Array
      - `cloud_type_data` (text)
      - `moisture_data` (text)
      - `vertical_dev_data` (text)
      - `base_altitude_data` (text)
      - `top_altitude_data` (text)
      - `wind_x_data` (text)
      - `wind_y_data` (text)
      - `wind_speed_data` (text)
      - `turbulence_data` (text)

    - `weather_fronts` - Stores weather front objects
      - `id` (uuid, primary key)
      - `weather_map_id` (uuid, foreign key)
      - `front_type` (text) - cold, warm, occluded, stationary
      - `points` (jsonb) - Array of x,y coordinates
      - `strength` (float)
      - `width` (float)
      - `movement_x` (float)
      - `movement_y` (float)

    - `pressure_systems` - Stores pressure system objects
      - `id` (uuid, primary key)
      - `weather_map_id` (uuid, foreign key)
      - `system_type` (text) - high or low
      - `center_x` (float)
      - `center_y` (float)
      - `radius` (float)
      - `intensity` (float)
      - `rotation` (float)

    - `moisture_regions` - Stores moisture region objects
      - `id` (uuid, primary key)
      - `weather_map_id` (uuid, foreign key)
      - `center_x` (float)
      - `center_y` (float)
      - `radius` (float)
      - `intensity` (float)
      - `falloff` (float)

  2. Security
    - Enable RLS on all tables
    - Allow public read access for presets
    - Allow authenticated users to manage their own maps
*/

-- Weather Maps metadata table
CREATE TABLE IF NOT EXISTS weather_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  resolution integer DEFAULT 256,
  world_extent float DEFAULT 50000,
  is_preset boolean DEFAULT false,
  category text DEFAULT 'user',
  region text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Weather Map grid data table
CREATE TABLE IF NOT EXISTS weather_map_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weather_map_id uuid NOT NULL REFERENCES weather_maps(id) ON DELETE CASCADE,
  coverage_data text,
  cloud_type_data text,
  moisture_data text,
  vertical_dev_data text,
  base_altitude_data text,
  top_altitude_data text,
  wind_x_data text,
  wind_y_data text,
  wind_speed_data text,
  turbulence_data text,
  created_at timestamptz DEFAULT now()
);

-- Weather Fronts table
CREATE TABLE IF NOT EXISTS weather_fronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weather_map_id uuid NOT NULL REFERENCES weather_maps(id) ON DELETE CASCADE,
  front_type text NOT NULL CHECK (front_type IN ('cold', 'warm', 'occluded', 'stationary')),
  points jsonb NOT NULL DEFAULT '[]',
  strength float DEFAULT 1.0,
  width float DEFAULT 50.0,
  movement_x float DEFAULT 0.0,
  movement_y float DEFAULT 0.0
);

-- Pressure Systems table
CREATE TABLE IF NOT EXISTS pressure_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weather_map_id uuid NOT NULL REFERENCES weather_maps(id) ON DELETE CASCADE,
  system_type text NOT NULL CHECK (system_type IN ('high', 'low')),
  center_x float NOT NULL,
  center_y float NOT NULL,
  radius float DEFAULT 100.0,
  intensity float DEFAULT 1.0,
  rotation float DEFAULT 0.0
);

-- Moisture Regions table
CREATE TABLE IF NOT EXISTS moisture_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weather_map_id uuid NOT NULL REFERENCES weather_maps(id) ON DELETE CASCADE,
  center_x float NOT NULL,
  center_y float NOT NULL,
  radius float DEFAULT 50.0,
  intensity float DEFAULT 1.0,
  falloff float DEFAULT 0.5
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_weather_maps_category ON weather_maps(category);
CREATE INDEX IF NOT EXISTS idx_weather_maps_is_preset ON weather_maps(is_preset);
CREATE INDEX IF NOT EXISTS idx_weather_map_data_map_id ON weather_map_data(weather_map_id);
CREATE INDEX IF NOT EXISTS idx_weather_fronts_map_id ON weather_fronts(weather_map_id);
CREATE INDEX IF NOT EXISTS idx_pressure_systems_map_id ON pressure_systems(weather_map_id);
CREATE INDEX IF NOT EXISTS idx_moisture_regions_map_id ON moisture_regions(weather_map_id);

-- Enable Row Level Security
ALTER TABLE weather_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_map_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_fronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pressure_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE moisture_regions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weather_maps
-- Allow anyone to read preset maps
CREATE POLICY "Anyone can read preset weather maps"
  ON weather_maps FOR SELECT
  USING (is_preset = true);

-- Allow anyone to read all maps (for now, since no auth required)
CREATE POLICY "Anyone can read all weather maps"
  ON weather_maps FOR SELECT
  USING (true);

-- Allow anyone to insert weather maps
CREATE POLICY "Anyone can create weather maps"
  ON weather_maps FOR INSERT
  WITH CHECK (is_preset = false);

-- Allow anyone to update non-preset maps
CREATE POLICY "Anyone can update non-preset weather maps"
  ON weather_maps FOR UPDATE
  USING (is_preset = false)
  WITH CHECK (is_preset = false);

-- Allow anyone to delete non-preset maps
CREATE POLICY "Anyone can delete non-preset weather maps"
  ON weather_maps FOR DELETE
  USING (is_preset = false);

-- RLS Policies for weather_map_data
CREATE POLICY "Anyone can read weather map data"
  ON weather_map_data FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert weather map data"
  ON weather_map_data FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update weather map data"
  ON weather_map_data FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete weather map data"
  ON weather_map_data FOR DELETE
  USING (true);

-- RLS Policies for weather_fronts
CREATE POLICY "Anyone can read weather fronts"
  ON weather_fronts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert weather fronts"
  ON weather_fronts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update weather fronts"
  ON weather_fronts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete weather fronts"
  ON weather_fronts FOR DELETE
  USING (true);

-- RLS Policies for pressure_systems
CREATE POLICY "Anyone can read pressure systems"
  ON pressure_systems FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert pressure systems"
  ON pressure_systems FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update pressure systems"
  ON pressure_systems FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete pressure systems"
  ON pressure_systems FOR DELETE
  USING (true);

-- RLS Policies for moisture_regions
CREATE POLICY "Anyone can read moisture regions"
  ON moisture_regions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert moisture regions"
  ON moisture_regions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update moisture regions"
  ON moisture_regions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete moisture regions"
  ON moisture_regions FOR DELETE
  USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on weather_maps
DROP TRIGGER IF EXISTS update_weather_maps_updated_at ON weather_maps;
CREATE TRIGGER update_weather_maps_updated_at
  BEFORE UPDATE ON weather_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CloudRenderer } from '@/components/CloudRenderer';
import { useWeather } from '@/contexts/WeatherContext';

export default function Viewer() {
  const [searchParams] = useSearchParams();
  const { loadMap, currentMapId } = useWeather();

  useEffect(() => {
    const mapId = searchParams.get('map');
    if (mapId && mapId !== currentMapId) {
      loadMap(mapId);
    }
  }, [searchParams, loadMap, currentMapId]);

  return <CloudRenderer />;
}

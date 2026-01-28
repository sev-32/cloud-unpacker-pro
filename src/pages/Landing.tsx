import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Cloud, Map, Clock, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listWeatherMaps, WeatherMapMetadata } from '@/lib/weatherMapService';

export default function Landing() {
  const navigate = useNavigate();
  const [recentMaps, setRecentMaps] = useState<WeatherMapMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecentMaps() {
      const maps = await listWeatherMaps({ limit: 5 });
      setRecentMaps(maps);
      setIsLoading(false);
    }
    loadRecentMaps();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-transparent" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Cloud Weather System
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Create, edit, and visualize realistic weather patterns with an advanced cloud rendering engine
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card
            className="bg-slate-800/50 border-slate-700 hover:border-sky-500/50 transition-all cursor-pointer group"
            onClick={() => navigate('/viewer')}
          >
            <CardHeader>
              <div className="w-14 h-14 rounded-xl bg-sky-500/10 flex items-center justify-center mb-4 group-hover:bg-sky-500/20 transition-colors">
                <Cloud className="w-7 h-7 text-sky-400" />
              </div>
              <CardTitle className="text-white text-2xl">Cloud Viewer</CardTitle>
              <CardDescription className="text-slate-400">
                Explore the 3D cloud simulation with flight controls and real-time rendering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-500 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Real-time volumetric cloud rendering
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Multiple camera modes including jet flight
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Dynamic atmospheric effects
                </li>
              </ul>
              <Button className="w-full bg-sky-600 hover:bg-sky-500 text-white">
                Launch Viewer
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card
            className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer group"
            onClick={() => navigate('/editor')}
          >
            <CardHeader>
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <Map className="w-7 h-7 text-emerald-400" />
              </div>
              <CardTitle className="text-white text-2xl">Weather Editor</CardTitle>
              <CardDescription className="text-slate-400">
                Design custom weather patterns with fronts, pressure systems, and cloud formations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-500 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Paint cloud coverage and types
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Place weather fronts and pressure systems
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Historical weather presets
                </li>
              </ul>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                Open Editor
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {recentMaps.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Recent Weather Maps
              </h2>
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={() => navigate('/editor')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New
              </Button>
            </div>

            <div className="grid gap-3">
              {recentMaps.map((map) => (
                <Card
                  key={map.id}
                  className="bg-slate-800/30 border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer"
                  onClick={() => navigate(`/editor/${map.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{map.name}</h3>
                      <p className="text-sm text-slate-500">
                        {map.category} {map.region && `- ${map.region}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">
                        {formatDate(map.updated_at)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!isLoading && recentMaps.length === 0 && (
          <div className="text-center text-slate-500">
            <p>No saved weather maps yet. Create your first one in the editor!</p>
          </div>
        )}
      </div>
    </div>
  );
}

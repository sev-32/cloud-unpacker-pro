import { useState, useEffect, useCallback } from 'react';
import { listWeatherMaps, deleteWeatherMap, duplicateWeatherMap, WeatherMapMetadata } from '@/lib/weatherMapService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  Loader2,
  MoreHorizontal,
  Trash2,
  Copy,
  Clock,
  Cloud,
  MapPin,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface WeatherMapBrowserProps {
  onLoad: (mapId: string) => void;
  onClose: () => void;
  currentMapId: string | null;
}

export function WeatherMapBrowser({ onLoad, onClose, currentMapId }: WeatherMapBrowserProps) {
  const [maps, setMaps] = useState<WeatherMapMetadata[]>([]);
  const [presets, setPresets] = useState<WeatherMapMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadMaps = useCallback(async () => {
    setIsLoading(true);
    const [userMaps, presetMaps] = await Promise.all([
      listWeatherMaps({ isPreset: false, limit: 50 }),
      listWeatherMaps({ isPreset: true, limit: 50 }),
    ]);
    setMaps(userMaps);
    setPresets(presetMaps);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  const handleDelete = useCallback(async (mapId: string) => {
    const success = await deleteWeatherMap(mapId);
    if (success) {
      toast.success('Weather map deleted');
      setMaps((prev) => prev.filter((m) => m.id !== mapId));
    } else {
      toast.error('Failed to delete weather map');
    }
    setDeleteConfirm(null);
  }, []);

  const handleDuplicate = useCallback(async (mapId: string, name: string) => {
    const newId = await duplicateWeatherMap(mapId, `${name} (Copy)`);
    if (newId) {
      toast.success('Weather map duplicated');
      loadMaps();
    } else {
      toast.error('Failed to duplicate weather map');
    }
  }, [loadMaps]);

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tropical':
        return <Cloud className="w-3 h-3" />;
      case 'regional':
        return <MapPin className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const filteredMaps = maps.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPresets = presets.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMapItem = (map: WeatherMapMetadata, isPreset: boolean = false) => (
    <div
      key={map.id}
      className={`
        p-3 rounded-lg cursor-pointer transition-all
        ${currentMapId === map.id ? 'bg-sky-600/20 border border-sky-500/50' : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'}
      `}
      onClick={() => onLoad(map.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">{map.name}</h4>
          {map.description && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{map.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              {getCategoryIcon(map.category)}
              {map.category}
            </span>
            {!isPreset && (
              <span className="text-xs text-slate-500">
                {formatDate(map.updated_at)}
              </span>
            )}
          </div>
        </div>

        {!isPreset && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem
                className="text-slate-300 focus:text-white focus:bg-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(map.id, map.name);
                }}
              >
                <Copy className="w-3 h-3 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                className="text-red-400 focus:text-red-300 focus:bg-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(map.id);
                }}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Weather Maps</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search maps..."
            className="pl-9 bg-slate-900 border-slate-600 text-white text-sm h-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-3 bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="flex-1 m-0 p-3 pt-3">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredMaps.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                {searchQuery ? 'No maps found' : 'No saved maps yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMaps.map((map) => renderMapItem(map))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="presets" className="flex-1 m-0 p-3 pt-3">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredPresets.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                {searchQuery ? 'No presets found' : 'No presets available'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPresets.map((map) => renderMapItem(map, true))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Weather Map?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. The weather map will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-300 border-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

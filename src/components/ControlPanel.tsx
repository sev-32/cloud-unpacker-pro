import { useState } from 'react';
import { CloudSettings } from '@/hooks/useCloudRenderer';
import { 
  ChevronDown, ChevronUp, Settings, Sun, Moon, Cloud, 
  Sparkles, Mountain, Plane, Eye, EyeOff, Droplets, Wind
} from 'lucide-react';

interface ControlPanelProps {
  settings: CloudSettings;
  onUpdate: (settings: Partial<CloudSettings>) => void;
  fps: number;
  onToggleHUD?: () => void;
  showHUD?: boolean;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

function Slider({ label, value, min, max, step = 0.01, onChange, format }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50 font-mono">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white 
          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs text-white/70">{label}</span>
      <div 
        className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-blue-500' : 'bg-white/20'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute w-3 h-3 rounded-full bg-white top-0.5 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/70">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 rounded cursor-pointer border border-white/20"
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-1 text-sm font-medium text-white/90 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {isOpen && (
        <div className="pb-3 px-1 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function ControlPanel({ settings, onUpdate, fps, onToggleHUD, showHUD }: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 text-white/70 hover:text-white transition-colors"
        >
          <Settings size={18} />
        </button>
        {settings.cameraMode === 'jet' && onToggleHUD && (
          <button
            onClick={onToggleHUD}
            className="p-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 text-white/70 hover:text-white transition-colors"
          >
            {showHUD ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="w-80 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Flight Simulator</h2>
            <span className="text-xs text-white/50 font-mono">{fps.toFixed(0)} FPS</span>
          </div>

          {/* Scrollable content */}
          <div className="max-h-[75vh] overflow-y-auto p-3 space-y-1">
            {/* Camera Mode */}
            <Section title="Camera Mode" icon={<Plane size={14} />} defaultOpen={true}>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => onUpdate({ cameraMode: 'orbit' })}
                  className={`flex-1 py-1.5 px-2 text-xs rounded-lg transition-colors ${
                    settings.cameraMode === 'orbit' 
                      ? 'bg-purple-500/30 border border-purple-400/50 text-purple-200' 
                      : 'bg-white/10 border border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  Orbit
                </button>
                <button
                  onClick={() => onUpdate({ cameraMode: 'fly' })}
                  className={`flex-1 py-1.5 px-2 text-xs rounded-lg transition-colors ${
                    settings.cameraMode === 'fly' 
                      ? 'bg-purple-500/30 border border-purple-400/50 text-purple-200' 
                      : 'bg-white/10 border border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  Fly
                </button>
                <button
                  onClick={() => onUpdate({ cameraMode: 'jet' })}
                  className={`flex-1 py-1.5 px-2 text-xs rounded-lg transition-colors ${
                    settings.cameraMode === 'jet' 
                      ? 'bg-orange-500/30 border border-orange-400/50 text-orange-200' 
                      : 'bg-white/10 border border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  ✈️ Jet
                </button>
              </div>
              <Slider
                label="FOV"
                value={settings.fovDeg}
                min={20}
                max={110}
                step={1}
                onChange={(v) => onUpdate({ fovDeg: v })}
                format={(v) => `${v.toFixed(0)}°`}
              />
            </Section>

            {/* Render Settings */}
            <Section title="Render" icon={<Settings size={14} />}>
              <Slider
                label="Resolution Scale"
                value={settings.scale}
                min={0.25}
                max={1}
                step={0.05}
                onChange={(v) => onUpdate({ scale: v })}
              />
              <Slider
                label="Time Scale"
                value={settings.timeScale}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(v) => onUpdate({ timeScale: v })}
              />
              <Toggle
                label="TAA (Temporal AA)"
                checked={settings.taa}
                onChange={(v) => onUpdate({ taa: v })}
              />
              <Toggle
                label="Fast Mode While Dragging"
                checked={settings.fastWhileDrag}
                onChange={(v) => onUpdate({ fastWhileDrag: v })}
              />
            </Section>

            {/* Lighting */}
            <Section title="Lighting" icon={settings.lighting === 'day' ? <Sun size={14} /> : <Moon size={14} />}>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => onUpdate({ lighting: 'night', lightColor: '#a5ccff', lightPower: 100, exposure: 0.5, stars: 1 })}
                  className={`flex-1 py-1.5 px-3 text-xs rounded-lg transition-colors ${
                    settings.lighting === 'night' 
                      ? 'bg-blue-500/30 border border-blue-400/50 text-blue-200' 
                      : 'bg-white/10 border border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  Night
                </button>
                <button
                  onClick={() => onUpdate({ lighting: 'day', lightColor: '#fff2d0', lightPower: 160, exposure: 0.85, stars: 0 })}
                  className={`flex-1 py-1.5 px-3 text-xs rounded-lg transition-colors ${
                    settings.lighting === 'day' 
                      ? 'bg-orange-500/30 border border-orange-400/50 text-orange-200' 
                      : 'bg-white/10 border border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  Day
                </button>
              </div>
              <Slider
                label="Sun Azimuth"
                value={settings.lightAzimuthDeg}
                min={0}
                max={360}
                step={1}
                onChange={(v) => onUpdate({ lightAzimuthDeg: v })}
                format={(v) => `${v.toFixed(0)}°`}
              />
              <Slider
                label="Sun Height"
                value={settings.lightHeight}
                min={-1}
                max={1}
                step={0.01}
                onChange={(v) => onUpdate({ lightHeight: v })}
              />
              <Slider
                label="Light Power"
                value={settings.lightPower}
                min={0}
                max={400}
                step={5}
                onChange={(v) => onUpdate({ lightPower: v })}
              />
              <Slider
                label="Exposure"
                value={settings.exposure}
                min={0.1}
                max={2}
                step={0.05}
                onChange={(v) => onUpdate({ exposure: v })}
              />
            </Section>

            {/* Clouds - Shape */}
            <Section title="Cloud Shape" icon={<Cloud size={14} />}>
              <Slider
                label="Coverage"
                value={settings.cloudCoverage}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onUpdate({ cloudCoverage: v })}
              />
              <Slider
                label="Density"
                value={settings.densityMultiplier}
                min={0.01}
                max={0.3}
                step={0.005}
                onChange={(v) => onUpdate({ densityMultiplier: v })}
                format={(v) => v.toFixed(3)}
              />
              <Slider
                label="Shape Strength"
                value={settings.shapeStrength}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => onUpdate({ shapeStrength: v })}
              />
              <Slider
                label="Detail Strength"
                value={settings.detailStrength}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => onUpdate({ detailStrength: v })}
              />
              <Slider
                label="Cloud Base"
                value={settings.cloudBase01}
                min={0}
                max={0.5}
                step={0.01}
                onChange={(v) => onUpdate({ cloudBase01: v })}
              />
              <Slider
                label="Thickness"
                value={settings.cloudThickness01}
                min={0.2}
                max={2}
                step={0.05}
                onChange={(v) => onUpdate({ cloudThickness01: v })}
              />
            </Section>

            {/* Clouds - Dynamics */}
            <Section title="Cloud Dynamics" icon={<Wind size={14} />}>
              <Slider
                label="Wind Speed"
                value={settings.windSpeed}
                min={0}
                max={50}
                step={1}
                onChange={(v) => onUpdate({ windSpeed: v })}
                format={(v) => `${v.toFixed(0)} m/s`}
              />
              <Slider
                label="Wind Direction"
                value={settings.windDirection}
                min={0}
                max={360}
                step={5}
                onChange={(v) => onUpdate({ windDirection: v })}
                format={(v) => `${v.toFixed(0)}°`}
              />
              <Slider
                label="Shape Speed"
                value={settings.shapeSpeed}
                min={-20}
                max={20}
                step={0.5}
                onChange={(v) => onUpdate({ shapeSpeed: v })}
              />
              <Slider
                label="Detail Speed"
                value={settings.detailSpeed}
                min={-30}
                max={30}
                step={0.5}
                onChange={(v) => onUpdate({ detailSpeed: v })}
              />
              <Slider
                label="Turbulence"
                value={settings.turbulence}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onUpdate({ turbulence: v })}
              />
            </Section>

            {/* God Rays */}
            <Section title="God Rays" icon={<Sparkles size={14} />}>
              <Toggle
                label="Enable God Rays"
                checked={settings.godrays}
                onChange={(v) => onUpdate({ godrays: v })}
              />
              {settings.godrays && (
                <>
                  <Slider
                    label="Intensity"
                    value={settings.godraysIntensity}
                    min={0}
                    max={3}
                    step={0.1}
                    onChange={(v) => onUpdate({ godraysIntensity: v })}
                  />
                  <Slider
                    label="Samples"
                    value={settings.godraysSamples}
                    min={16}
                    max={128}
                    step={8}
                    onChange={(v) => onUpdate({ godraysSamples: v })}
                    format={(v) => v.toFixed(0)}
                  />
                  <Slider
                    label="Decay"
                    value={settings.godraysDecay}
                    min={0.9}
                    max={0.99}
                    step={0.005}
                    onChange={(v) => onUpdate({ godraysDecay: v })}
                    format={(v) => v.toFixed(3)}
                  />
                </>
              )}
            </Section>

            {/* Terrain */}
            <Section title="Terrain" icon={<Mountain size={14} />}>
              <Toggle
                label="Enable Terrain"
                checked={settings.terrainEnabled}
                onChange={(v) => onUpdate({ terrainEnabled: v })}
              />
              {settings.terrainEnabled && (
                <>
                  <Slider
                    label="Scale"
                    value={settings.terrainScale}
                    min={0.1}
                    max={3}
                    step={0.1}
                    onChange={(v) => onUpdate({ terrainScale: v })}
                  />
                  <Slider
                    label="Height"
                    value={settings.terrainHeight}
                    min={0.1}
                    max={3}
                    step={0.1}
                    onChange={(v) => onUpdate({ terrainHeight: v })}
                  />
                  <Slider
                    label="Detail (Octaves)"
                    value={settings.terrainDetail}
                    min={3}
                    max={16}
                    step={1}
                    onChange={(v) => onUpdate({ terrainDetail: v })}
                    format={(v) => v.toFixed(0)}
                  />
                  <Slider
                    label="Water Level"
                    value={settings.waterLevel}
                    min={0}
                    max={0.5}
                    step={0.01}
                    onChange={(v) => onUpdate({ waterLevel: v })}
                  />
                  <Slider
                    label="Snow Level"
                    value={settings.snowLevel}
                    min={0.3}
                    max={1}
                    step={0.02}
                    onChange={(v) => onUpdate({ snowLevel: v })}
                  />
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="text-xs text-white/50">Terrain Colors</div>
                    <ColorPicker
                      label="Rock"
                      value={settings.rockColor}
                      onChange={(v) => onUpdate({ rockColor: v })}
                    />
                    <ColorPicker
                      label="Grass"
                      value={settings.grassColor}
                      onChange={(v) => onUpdate({ grassColor: v })}
                    />
                    <ColorPicker
                      label="Snow"
                      value={settings.snowColor}
                      onChange={(v) => onUpdate({ snowColor: v })}
                    />
                    <ColorPicker
                      label="Water"
                      value={settings.waterColor}
                      onChange={(v) => onUpdate({ waterColor: v })}
                    />
                  </div>
                </>
              )}
            </Section>

            {/* Water */}
            <Section title="Precipitation" icon={<Droplets size={14} />}>
              <Slider
                label="Rain/Snow"
                value={settings.precipitation}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onUpdate({ precipitation: v })}
              />
            </Section>
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-white/10 text-xs text-white/40 text-center">
            {settings.cameraMode === 'orbit' 
              ? 'Drag to rotate • Scroll to zoom' 
              : settings.cameraMode === 'fly'
              ? 'Click to lock • WASD to move'
              : 'Click to fly • WASD: Control • Shift/Ctrl: Throttle'}
          </div>
        </div>
      )}
    </div>
  );
}

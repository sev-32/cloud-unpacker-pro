import { useRef } from 'react';
import { useCloudRenderer } from '@/hooks/useCloudRenderer';
import { ControlPanel } from './ControlPanel';

export function CloudRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isReady, fps, settings, updateSettings } = useCloudRenderer(canvasRef);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        tabIndex={0}
      />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/70 text-lg font-light">Loading shaders...</div>
        </div>
      )}
      
      {isReady && (
        <ControlPanel 
          settings={settings} 
          onUpdate={updateSettings} 
          fps={fps}
        />
      )}
    </div>
  );
}

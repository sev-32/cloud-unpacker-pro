import { useRef } from 'react';
import { useCloudRenderer } from '@/hooks/useCloudRenderer';

export function CloudRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isReady, fps } = useCloudRenderer(canvasRef);

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        tabIndex={0}
      />
      <div className="absolute top-4 left-4 text-white/70 text-sm font-mono pointer-events-none">
        {isReady ? (
          <>
            <div>FPS: {fps.toFixed(1)}</div>
            <div className="mt-2 text-xs opacity-60">
              Drag to rotate • Scroll to zoom
            </div>
          </>
        ) : (
          <div>Loading shaders...</div>
        )}
      </div>
    </div>
  );
}

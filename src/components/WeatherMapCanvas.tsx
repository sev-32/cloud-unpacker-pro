import { useEffect, useRef, useCallback } from 'react';
import { WeatherTextureManager } from '../lib/weatherTextureManager';
import { WeatherFront, PressureSystem, HeatmapMode, FRONT_COLORS, HEATMAP_COLORS } from '../lib/weatherTypes';
import { ViewTransform } from '../hooks/useWeatherMapInteraction';

interface WeatherMapCanvasProps {
  weatherManager: WeatherTextureManager | null;
  viewTransform: ViewTransform;
  worldExtent: number;
  heatmapMode: HeatmapMode;
  heatmapOpacity: number;
  showGrid: boolean;
  showCoordinates: boolean;
  showWindVectors: boolean;
  showFronts: boolean;
  currentFrontPoints: { x: number; y: number }[];
  selectedFrontType: WeatherFront['type'];
  hoveredPosition: { worldX: number; worldZ: number } | null;
  brushSize: number;
  activeTool: string;
  cameraPosition?: { x: number; z: number };
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export function WeatherMapCanvas({
  weatherManager,
  viewTransform,
  worldExtent,
  heatmapMode,
  heatmapOpacity,
  showGrid,
  showCoordinates,
  showWindVectors,
  showFronts,
  currentFrontPoints,
  selectedFrontType,
  hoveredPosition,
  brushSize,
  activeTool,
  cameraPosition,
  onCanvasReady,
}: WeatherMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const getHeatmapColor = useCallback((value: number, mode: HeatmapMode): string => {
    const colors = HEATMAP_COLORS[mode];
    const clampedValue = Math.max(0, Math.min(1, value));
    const index = clampedValue * (colors.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
    const t = index - lowerIndex;

    const lowerColor = colors[lowerIndex];
    const upperColor = colors[upperIndex];

    const lr = parseInt(lowerColor.slice(1, 3), 16);
    const lg = parseInt(lowerColor.slice(3, 5), 16);
    const lb = parseInt(lowerColor.slice(5, 7), 16);
    const ur = parseInt(upperColor.slice(1, 3), 16);
    const ug = parseInt(upperColor.slice(3, 5), 16);
    const ub = parseInt(upperColor.slice(5, 7), 16);

    const r = Math.round(lr + (ur - lr) * t);
    const g = Math.round(lg + (ug - lg) * t);
    const b = Math.round(lb + (ub - lb) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  const worldToCanvas = useCallback((worldX: number, worldZ: number, canvas: HTMLCanvasElement): { x: number; y: number } => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const normalizedX = worldX / (worldExtent * 2) * canvas.width;
    const normalizedZ = worldZ / (worldExtent * 2) * canvas.height;

    const x = (normalizedX + viewTransform.offsetX) * viewTransform.scale + centerX;
    const y = (normalizedZ + viewTransform.offsetY) * viewTransform.scale + centerY;

    return { x, y };
  }, [viewTransform, worldExtent]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, width, height);

    if (showGrid) {
      ctx.strokeStyle = 'rgba(50, 60, 80, 0.5)';
      ctx.lineWidth = 1;

      const gridSpacing = 5000;
      const startX = -worldExtent;
      const endX = worldExtent;
      const startZ = -worldExtent;
      const endZ = worldExtent;

      for (let x = startX; x <= endX; x += gridSpacing) {
        const p1 = worldToCanvas(x, startZ, canvas);
        const p2 = worldToCanvas(x, endZ, canvas);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      for (let z = startZ; z <= endZ; z += gridSpacing) {
        const p1 = worldToCanvas(startX, z, canvas);
        const p2 = worldToCanvas(endX, z, canvas);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    if (weatherManager && heatmapOpacity > 0) {
      const data = weatherManager.data;
      const cellWidth = (width / data.width) * viewTransform.scale;
      const cellHeight = (height / data.height) * viewTransform.scale;

      const visibleMinX = Math.max(0, Math.floor((-viewTransform.offsetX - width / 2 / viewTransform.scale) / (width / data.width) + data.width / 2));
      const visibleMaxX = Math.min(data.width, Math.ceil((-viewTransform.offsetX + width / 2 / viewTransform.scale) / (width / data.width) + data.width / 2));
      const visibleMinY = Math.max(0, Math.floor((-viewTransform.offsetY - height / 2 / viewTransform.scale) / (height / data.height) + data.height / 2));
      const visibleMaxY = Math.min(data.height, Math.ceil((-viewTransform.offsetY + height / 2 / viewTransform.scale) / (height / data.height) + data.height / 2));

      ctx.globalAlpha = heatmapOpacity;

      for (let ty = visibleMinY; ty < visibleMaxY; ty++) {
        for (let tx = visibleMinX; tx < visibleMaxX; tx++) {
          const idx = ty * data.width + tx;

          let value = 0;
          switch (heatmapMode) {
            case 'coverage':
              value = data.coverage[idx];
              break;
            case 'baseAltitude':
              value = data.baseAltitude[idx] / 10000;
              break;
            case 'topAltitude':
              value = data.topAltitude[idx] / 15000;
              break;
            case 'thickness':
              value = (data.topAltitude[idx] - data.baseAltitude[idx]) / 8000;
              break;
            case 'moisture':
              value = data.moisture[idx];
              break;
            case 'wind':
              value = data.windSpeed[idx] / 40;
              break;
          }

          if (value > 0.01) {
            const worldX = (tx / data.width - 0.5) * worldExtent * 2;
            const worldZ = (ty / data.height - 0.5) * worldExtent * 2;
            const screenPos = worldToCanvas(worldX, worldZ, canvas);

            ctx.fillStyle = getHeatmapColor(value, heatmapMode);
            ctx.fillRect(screenPos.x - cellWidth / 2, screenPos.y - cellHeight / 2, cellWidth + 1, cellHeight + 1);
          }
        }
      }

      ctx.globalAlpha = 1;
    }

    if (showWindVectors && weatherManager) {
      const data = weatherManager.data;
      const step = Math.max(1, Math.floor(8 / viewTransform.scale));

      ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
      ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
      ctx.lineWidth = 1.5;

      for (let ty = 0; ty < data.height; ty += step) {
        for (let tx = 0; tx < data.width; tx += step) {
          const idx = ty * data.width + tx;
          const speed = data.windSpeed[idx];

          if (speed > 1) {
            const worldX = (tx / data.width - 0.5) * worldExtent * 2;
            const worldZ = (ty / data.height - 0.5) * worldExtent * 2;
            const screenPos = worldToCanvas(worldX, worldZ, canvas);

            const dirX = data.windX[idx];
            const dirZ = data.windY[idx];
            const len = Math.sqrt(dirX * dirX + dirZ * dirZ);

            if (len > 0.01) {
              const normX = dirX / len;
              const normZ = dirZ / len;
              const arrowLen = Math.min(20, speed) * viewTransform.scale;

              ctx.beginPath();
              ctx.moveTo(screenPos.x, screenPos.y);
              ctx.lineTo(screenPos.x + normX * arrowLen, screenPos.y + normZ * arrowLen);
              ctx.stroke();

              const headSize = 4 * viewTransform.scale;
              const headX = screenPos.x + normX * arrowLen;
              const headY = screenPos.y + normZ * arrowLen;
              ctx.beginPath();
              ctx.moveTo(headX, headY);
              ctx.lineTo(headX - normX * headSize - normZ * headSize * 0.5, headY - normZ * headSize + normX * headSize * 0.5);
              ctx.lineTo(headX - normX * headSize + normZ * headSize * 0.5, headY - normZ * headSize - normX * headSize * 0.5);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }

    if (showFronts && weatherManager) {
      for (const front of weatherManager.data.fronts) {
        if (front.points.length < 2) continue;

        ctx.strokeStyle = FRONT_COLORS[front.type];
        ctx.lineWidth = 3 * viewTransform.scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        const firstPoint = worldToCanvas(front.points[0].x, front.points[0].y, canvas);
        ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < front.points.length; i++) {
          const point = worldToCanvas(front.points[i].x, front.points[i].y, canvas);
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();

        const symbolSpacing = 30 * viewTransform.scale;
        for (let i = 0; i < front.points.length - 1; i++) {
          const p1 = front.points[i];
          const p2 = front.points[i + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const segLen = Math.sqrt(dx * dx + dy * dy);
          const numSymbols = Math.floor(segLen / (symbolSpacing / viewTransform.scale));

          for (let s = 1; s <= numSymbols; s++) {
            const t = s / (numSymbols + 1);
            const px = p1.x + dx * t;
            const py = p1.y + dy * t;
            const screenPos = worldToCanvas(px, py, canvas);

            const nx = -dy / segLen;
            const ny = dx / segLen;

            ctx.fillStyle = FRONT_COLORS[front.type];

            if (front.type === 'cold') {
              const triSize = 8 * viewTransform.scale;
              ctx.beginPath();
              ctx.moveTo(screenPos.x + nx * triSize, screenPos.y + ny * triSize);
              ctx.lineTo(screenPos.x - (dx / segLen) * triSize * 0.6, screenPos.y - (dy / segLen) * triSize * 0.6);
              ctx.lineTo(screenPos.x + (dx / segLen) * triSize * 0.6, screenPos.y + (dy / segLen) * triSize * 0.6);
              ctx.closePath();
              ctx.fill();
            } else if (front.type === 'warm') {
              const arcRadius = 6 * viewTransform.scale;
              const angle = Math.atan2(ny, nx);
              ctx.beginPath();
              ctx.arc(screenPos.x, screenPos.y, arcRadius, angle - Math.PI / 2, angle + Math.PI / 2);
              ctx.fill();
            } else if (front.type === 'occluded') {
              const size = 6 * viewTransform.scale;
              if (s % 2 === 0) {
                ctx.beginPath();
                ctx.moveTo(screenPos.x + nx * size, screenPos.y + ny * size);
                ctx.lineTo(screenPos.x - (dx / segLen) * size * 0.6, screenPos.y - (dy / segLen) * size * 0.6);
                ctx.lineTo(screenPos.x + (dx / segLen) * size * 0.6, screenPos.y + (dy / segLen) * size * 0.6);
                ctx.closePath();
                ctx.fill();
              } else {
                const angle = Math.atan2(ny, nx);
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, size, angle - Math.PI / 2, angle + Math.PI / 2);
                ctx.fill();
              }
            }
          }
        }
      }

      for (const system of weatherManager.data.pressureSystems) {
        const screenPos = worldToCanvas(system.center.x, system.center.y, canvas);
        const screenRadius = (system.radius / worldExtent) * (width / 2) * viewTransform.scale;

        ctx.strokeStyle = system.type === 'high' ? 'rgba(100, 150, 255, 0.6)' : 'rgba(255, 100, 100, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = system.type === 'high' ? '#6699ff' : '#ff6666';
        ctx.font = `bold ${20 * viewTransform.scale}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(system.type === 'high' ? 'H' : 'L', screenPos.x, screenPos.y);
      }
    }

    if (currentFrontPoints.length > 0) {
      ctx.strokeStyle = FRONT_COLORS[selectedFrontType];
      ctx.lineWidth = 3 * viewTransform.scale;
      ctx.setLineDash([10, 5]);

      ctx.beginPath();
      const firstPoint = worldToCanvas(currentFrontPoints[0].x, currentFrontPoints[0].y, canvas);
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < currentFrontPoints.length; i++) {
        const point = worldToCanvas(currentFrontPoints[i].x, currentFrontPoints[i].y, canvas);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const point of currentFrontPoints) {
        const screenPos = worldToCanvas(point.x, point.y, canvas);
        ctx.fillStyle = FRONT_COLORS[selectedFrontType];
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (cameraPosition) {
      const camScreen = worldToCanvas(cameraPosition.x, cameraPosition.z, canvas);

      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(camScreen.x, camScreen.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(camScreen.x, camScreen.y, 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CAM', camScreen.x, camScreen.y);
    }

    if (hoveredPosition && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'moisture' || activeTool === 'altitude')) {
      const screenPos = worldToCanvas(hoveredPosition.worldX, hoveredPosition.worldZ, canvas);
      const screenRadius = (brushSize / worldExtent) * (width / 2) * viewTransform.scale;

      ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 200, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (showCoordinates && hoveredPosition) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, height - 60, 200, 50);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`X: ${hoveredPosition.worldX.toFixed(0)}m`, 20, height - 42);
      ctx.fillText(`Z: ${hoveredPosition.worldZ.toFixed(0)}m`, 20, height - 22);

      if (weatherManager) {
        const data = weatherManager.getDataAtPosition(hoveredPosition.worldX, hoveredPosition.worldZ);
        ctx.fillText(`Coverage: ${(data.coverage * 100).toFixed(0)}%`, 100, height - 42);
        ctx.fillText(`Alt: ${data.baseAltitude.toFixed(0)}-${data.topAltitude.toFixed(0)}m`, 100, height - 22);
      }
    }

    animationRef.current = requestAnimationFrame(render);
  }, [
    weatherManager, viewTransform, worldExtent, heatmapMode, heatmapOpacity,
    showGrid, showCoordinates, showWindVectors, showFronts, currentFrontPoints,
    selectedFrontType, hoveredPosition, brushSize, activeTool, cameraPosition,
    worldToCanvas, getHeatmapColor
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    onCanvasReady(canvas);

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [onCanvasReady, render]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ touchAction: 'none' }}
    />
  );
}

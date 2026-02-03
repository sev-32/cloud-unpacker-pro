import { useCallback, useRef, useState } from 'react';
import { WeatherFront, PressureSystem, BrushSettings } from '../lib/weatherTypes';
import { WeatherTextureManager } from '../lib/weatherTextureManager';

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface WeatherMapInteraction {
  viewTransform: ViewTransform;
  isPanning: boolean;
  isDrawing: boolean;
  currentFrontPoints: { x: number; y: number }[];
  hoveredPosition: { worldX: number; worldZ: number } | null;
  handleMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLElement>) => void;
  handleWheel: (e: React.WheelEvent<HTMLElement>) => void;
  resetView: () => void;
  canvasToWorld: (canvasX: number, canvasY: number) => { worldX: number; worldZ: number };
  worldToCanvas: (worldX: number, worldZ: number) => { canvasX: number; canvasY: number };
}

interface UseWeatherMapInteractionProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  weatherManager: WeatherTextureManager | null;
  activeTool: string;
  brushSettings: BrushSettings;
  selectedCloudType: number;
  selectedFrontType: WeatherFront['type'];
  selectedPressureType: PressureSystem['type'];
  frontStrength: number;
  frontWidth: number;
  pressureRadius: number;
  pressureIntensity: number;
  worldExtent: number;
  onFrontComplete: (front: WeatherFront) => void;
  onPressureSystemAdd: (system: PressureSystem) => void;
  onWindDraw: (startX: number, startY: number, endX: number, endY: number) => void;
  onBrushStroke?: () => void;
}

export function useWeatherMapInteraction({
  canvasRef,
  weatherManager,
  activeTool,
  brushSettings,
  selectedCloudType,
  selectedFrontType,
  selectedPressureType,
  frontStrength,
  frontWidth,
  pressureRadius,
  pressureIntensity,
  worldExtent,
  onFrontComplete,
  onPressureSystemAdd,
  onWindDraw,
  onBrushStroke,
}: UseWeatherMapInteractionProps): WeatherMapInteraction {
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentFrontPoints, setCurrentFrontPoints] = useState<{ x: number; y: number }[]>([]);
  const [hoveredPosition, setHoveredPosition] = useState<{ worldX: number; worldZ: number } | null>(null);

  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const windStartPos = useRef<{ x: number; y: number } | null>(null);

  const canvasToWorld = useCallback((canvasX: number, canvasY: number): { worldX: number; worldZ: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { worldX: 0, worldZ: 0 };

    const rect = canvas.getBoundingClientRect();
    const pixelX = canvasX - rect.left;
    const pixelY = canvasY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const worldX = ((pixelX - centerX) / viewTransform.scale - viewTransform.offsetX) * (worldExtent / canvas.width) * 2;
    const worldZ = ((pixelY - centerY) / viewTransform.scale - viewTransform.offsetY) * (worldExtent / canvas.height) * 2;

    return { worldX, worldZ };
  }, [canvasRef, viewTransform, worldExtent]);

  const worldToCanvas = useCallback((worldX: number, worldZ: number): { canvasX: number; canvasY: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { canvasX: 0, canvasY: 0 };

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const normalizedX = worldX / (worldExtent * 2) * canvas.width;
    const normalizedZ = worldZ / (worldExtent * 2) * canvas.height;

    const canvasX = (normalizedX + viewTransform.offsetX) * viewTransform.scale + centerX;
    const canvasY = (normalizedZ + viewTransform.offsetY) * viewTransform.scale + centerY;

    return { canvasX, canvasY };
  }, [canvasRef, viewTransform, worldExtent]);

  const applyBrushAtPosition = useCallback((worldX: number, worldZ: number) => {
    if (!weatherManager) return;

    const radius = brushSettings.size;
    const strength = brushSettings.strength;
    const falloff = brushSettings.falloff;

    switch (activeTool) {
      case 'brush':
        weatherManager.setCoverage(worldX, worldZ, strength, radius, falloff);
        weatherManager.setCloudType(worldX, worldZ, selectedCloudType, radius);
        break;
      case 'eraser':
        weatherManager.setCoverage(worldX, worldZ, 0, radius, falloff);
        break;
      case 'moisture':
        weatherManager.setMoisture(worldX, worldZ, strength, radius, falloff);
        break;
      case 'altitude':
        const baseAlt = 1000 + strength * 4000;
        const topAlt = baseAlt + 1000 + strength * 4000;
        weatherManager.setAltitude(worldX, worldZ, baseAlt, topAlt, radius, falloff);
        break;
    }

    onBrushStroke?.();
  }, [weatherManager, activeTool, brushSettings, selectedCloudType, onBrushStroke]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const { worldX, worldZ } = canvasToWorld(e.clientX, e.clientY);
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      return;
    }

    if (e.button === 0) {
      setIsDrawing(true);

      if (activeTool === 'front') {
        setCurrentFrontPoints(prev => [...prev, { x: worldX, y: worldZ }]);
      } else if (activeTool === 'pressure') {
        const newSystem: PressureSystem = {
          id: `pressure-${Date.now()}`,
          type: selectedPressureType,
          center: { x: worldX, y: worldZ },
          radius: pressureRadius,
          intensity: pressureIntensity,
          rotation: selectedPressureType === 'high' ? 1 : -1,
        };
        onPressureSystemAdd(newSystem);
      } else if (activeTool === 'wind') {
        windStartPos.current = { x: worldX, y: worldZ };
      } else {
        applyBrushAtPosition(worldX, worldZ);
      }
    }
  }, [canvasToWorld, activeTool, selectedPressureType, pressureRadius, pressureIntensity,
      onPressureSystemAdd, applyBrushAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const { worldX, worldZ } = canvasToWorld(e.clientX, e.clientY);
    setHoveredPosition({ worldX, worldZ });

    if (isPanning && lastMousePos.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;

      setViewTransform(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx / prev.scale,
        offsetY: prev.offsetY + dy / prev.scale,
      }));

      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDrawing) {
      if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'moisture' || activeTool === 'altitude') {
        applyBrushAtPosition(worldX, worldZ);
      }
    }
  }, [canvasToWorld, isPanning, isDrawing, activeTool, applyBrushAtPosition]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (isPanning) {
      setIsPanning(false);
      lastMousePos.current = null;
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);

      if (activeTool === 'wind' && windStartPos.current) {
        const { worldX, worldZ } = canvasToWorld(e.clientX, e.clientY);
        onWindDraw(windStartPos.current.x, windStartPos.current.y, worldX, worldZ);
        windStartPos.current = null;
      }

      lastMousePos.current = null;
    }
  }, [isPanning, isDrawing, activeTool, canvasToWorld, onWindDraw]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, viewTransform.scale * zoomFactor));

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const worldBeforeX = (mouseX - centerX) / viewTransform.scale - viewTransform.offsetX;
    const worldBeforeY = (mouseY - centerY) / viewTransform.scale - viewTransform.offsetY;

    const worldAfterX = (mouseX - centerX) / newScale - viewTransform.offsetX;
    const worldAfterY = (mouseY - centerY) / newScale - viewTransform.offsetY;

    setViewTransform({
      scale: newScale,
      offsetX: viewTransform.offsetX + (worldAfterX - worldBeforeX),
      offsetY: viewTransform.offsetY + (worldAfterY - worldBeforeY),
    });
  }, [canvasRef, viewTransform]);

  const resetView = useCallback(() => {
    setViewTransform({ offsetX: 0, offsetY: 0, scale: 1 });
  }, []);

  const completeFront = useCallback(() => {
    if (currentFrontPoints.length >= 2) {
      const newFront: WeatherFront = {
        id: `front-${Date.now()}`,
        type: selectedFrontType,
        points: [...currentFrontPoints],
        strength: frontStrength,
        width: frontWidth,
        movementVector: { x: 0, y: 0 },
      };
      onFrontComplete(newFront);
    }
    setCurrentFrontPoints([]);
  }, [currentFrontPoints, selectedFrontType, frontStrength, frontWidth, onFrontComplete]);

  return {
    viewTransform,
    isPanning,
    isDrawing,
    currentFrontPoints,
    hoveredPosition,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    resetView,
    canvasToWorld,
    worldToCanvas,
  };
}

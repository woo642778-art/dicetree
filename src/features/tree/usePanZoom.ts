import { useCallback, useRef, useState } from "react";

export interface ViewTransform { x: number; y: number; scale: number }

interface SvgViewportMetrics {
  screenScaleX: number;
  screenScaleY: number;
}

export function screenDeltaToSvgUnits(
  delta: { x: number; y: number },
  metrics: SvgViewportMetrics,
) {
  return {
    x: delta.x / Math.max(Number.EPSILON, metrics.screenScaleX),
    y: delta.y / Math.max(Number.EPSILON, metrics.screenScaleY),
  };
}

function viewportMetrics(svg: SVGSVGElement): SvgViewportMetrics {
  const matrix = svg.getScreenCTM?.();
  if (matrix) {
    return {
      screenScaleX: Math.hypot(matrix.a, matrix.b),
      screenScaleY: Math.hypot(matrix.c, matrix.d),
    };
  }
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const scale = Math.min(
    rect.width / Math.max(1, viewBox.width),
    rect.height / Math.max(1, viewBox.height),
  );
  return { screenScaleX: scale, screenScaleY: scale };
}

function clientPointToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect();
  const metrics = viewportMetrics(svg);
  const viewBox = svg.viewBox.baseVal;
  const renderedWidth = viewBox.width * metrics.screenScaleX;
  const renderedHeight = viewBox.height * metrics.screenScaleY;
  return {
    x: viewBox.x + (clientX - rect.left - (rect.width - renderedWidth) / 2) / metrics.screenScaleX,
    y: viewBox.y + (clientY - rect.top - (rect.height - renderedHeight) / 2) / metrics.screenScaleY,
  };
}

export function usePanZoom(initial: ViewTransform = { x: 0, y: 0, scale: 0.95 }) {
  const [view, setView] = useState(initial);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPan = useRef<{ x: number; y: number } | null>(null);
  const lastPinch = useRef<{ distance: number; midpoint: { x: number; y: number } } | null>(null);
  const pointerTravel = useRef(0);
  const suppressPointerClick = useRef(false);
  const suppressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampScale = (scale: number) => Math.min(2.5, Math.max(0.35, scale));

  const onWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const point = clientPointToSvg(event.currentTarget, event.clientX, event.clientY);
    setView((current) => {
      const nextScale = clampScale(current.scale * Math.exp(-event.deltaY * 0.0014));
      const ratio = nextScale / current.scale;
      return {
        x: point.x - (point.x - current.x) * ratio,
        y: point.y - (point.y - current.y) * ratio,
        scale: nextScale,
      };
    });
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.size === 0) {
      if (suppressionTimer.current) clearTimeout(suppressionTimer.current);
      pointerTravel.current = 0;
      suppressPointerClick.current = false;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) lastPan.current = { x: event.clientX, y: event.clientY };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      lastPinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        midpoint: clientPointToSvg(event.currentTarget, (a.x + b.x) / 2, (a.y + b.y) / 2),
      };
    }
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1 && lastPan.current) {
      const dx = event.clientX - lastPan.current.x;
      const dy = event.clientY - lastPan.current.y;
      pointerTravel.current += Math.hypot(dx, dy);
      if (pointerTravel.current > 5) {
        suppressPointerClick.current = true;
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }
      lastPan.current = { x: event.clientX, y: event.clientY };
      const delta = screenDeltaToSvgUnits({ x: dx, y: dy }, viewportMetrics(event.currentTarget));
      setView((current) => ({ ...current, x: current.x + delta.x, y: current.y + delta.y }));
    } else if (pointers.current.size === 2) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const midpoint = clientPointToSvg(event.currentTarget, (a.x + b.x) / 2, (a.y + b.y) / 2);
      if (lastPinch.current && lastPinch.current.distance > 0) {
        const ratio = distance / lastPinch.current.distance;
        setView((current) => {
          const nextScale = clampScale(current.scale * ratio);
          const appliedRatio = nextScale / current.scale;
          return {
            x: midpoint.x - (lastPinch.current!.midpoint.x - current.x) * appliedRatio,
            y: midpoint.y - (lastPinch.current!.midpoint.y - current.y) * appliedRatio,
            scale: nextScale,
          };
        });
      }
      suppressPointerClick.current = true;
      lastPinch.current = { distance, midpoint };
    }
  }, []);

  const endPointer = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      lastPan.current = null;
      lastPinch.current = null;
      // Keep suppression through the click generated by this drag, then clear
      // it so a later intentional tap is never swallowed.
      if (suppressPointerClick.current) {
        suppressionTimer.current = setTimeout(() => {
          suppressPointerClick.current = false;
          suppressionTimer.current = null;
        }, 0);
      }
    } else if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      lastPan.current = p;
      lastPinch.current = null;
    }
  }, []);

  const consumePointerClick = useCallback(() => {
    const suppressed = suppressPointerClick.current;
    suppressPointerClick.current = false;
    return suppressed;
  }, []);

  const resetView = useCallback(() => setView(initial), [initial.x, initial.y, initial.scale]);
  return {
    view,
    setView,
    resetView,
    consumePointerClick,
    bind: { onWheel, onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer },
  };
}

import { useCallback, useRef, useState } from "react";

export interface ViewTransform { x: number; y: number; scale: number }

export function usePanZoom(initial: ViewTransform = { x: 0, y: 0, scale: 0.72 }) {
  const [view, setView] = useState(initial);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPan = useRef<{ x: number; y: number } | null>(null);
  const lastPinch = useRef<number | null>(null);

  const clampScale = (scale: number) => Math.min(2.4, Math.max(0.28, scale));

  const onWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - rect.width / 2;
    const py = event.clientY - rect.top - rect.height / 2;
    setView((current) => {
      const nextScale = clampScale(current.scale * Math.exp(-event.deltaY * 0.0014));
      const ratio = nextScale / current.scale;
      return { x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio, scale: nextScale };
    });
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) lastPan.current = { x: event.clientX, y: event.clientY };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      lastPinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1 && lastPan.current) {
      const dx = event.clientX - lastPan.current.x;
      const dy = event.clientY - lastPan.current.y;
      lastPan.current = { x: event.clientX, y: event.clientY };
      setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch.current && lastPinch.current > 0) {
        const ratio = distance / lastPinch.current;
        setView((current) => ({ ...current, scale: clampScale(current.scale * ratio) }));
      }
      lastPinch.current = distance;
    }
  }, []);

  const endPointer = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      lastPan.current = null;
      lastPinch.current = null;
    } else if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      lastPan.current = p;
      lastPinch.current = null;
    }
  }, []);

  const resetView = useCallback(() => setView(initial), [initial.x, initial.y, initial.scale]);
  return { view, setView, resetView, bind: { onWheel, onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer } };
}

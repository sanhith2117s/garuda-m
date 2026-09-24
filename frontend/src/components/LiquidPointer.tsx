import { useEffect, useRef, type CSSProperties } from 'react';

const TRAIL_LENGTH = 16;

type Point = { x: number; y: number };

export default function LiquidPointer() {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const trailRefs = useRef<Array<HTMLDivElement | null>>([]);
  const points = useRef<Point[]>(Array.from({ length: TRAIL_LENGTH }, () => ({ x: -100, y: -100 })));
  const target = useRef<Point>({ x: -100, y: -100 });
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      target.current = { x: event.clientX, y: event.clientY };
    };

    const animate = () => {
      points.current[0] = {
        x: points.current[0].x + (target.current.x - points.current[0].x) * 0.24,
        y: points.current[0].y + (target.current.y - points.current[0].y) * 0.24,
      };
      for (let index = 1; index < points.current.length; index += 1) {
        const current = points.current[index];
        const previous = points.current[index - 1];
        const follow = Math.max(0.075, 0.22 - index * 0.0085);
        current.x += (previous.x - current.x) * follow;
        current.y += (previous.y - current.y) * follow;
      }
      layerRef.current?.style.setProperty('--pointer-x', `${points.current[0].x - 40}px`);
      layerRef.current?.style.setProperty('--pointer-y', `${points.current[0].y - 40}px`);
      trailRefs.current.forEach((element, index) => {
        const point = points.current[index];
        if (!element) return;
        element.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
      });
      frame.current = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', move, { passive: true });
    frame.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('pointermove', move);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div ref={layerRef} className="liquid-pointer-layer" aria-hidden="true">
      {points.current.map((_, index) => (
        <span
          key={index}
          ref={(element) => { trailRefs.current[index] = element; }}
          className="liquid-pointer-drop"
          style={{ '--trail-index': index } as CSSProperties}
        />
      ))}
    </div>
  );
}

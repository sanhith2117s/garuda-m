import { useEffect, useRef } from 'react';

export default function ContextCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: -100, y: -100 });
  const current = useRef({ x: -100, y: -100 });
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const render = () => {
      current.current.x += (target.current.x - current.current.x) * 0.18;
      current.current.y += (target.current.y - current.current.y) * 0.18;
      cursor.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
      frame.current = requestAnimationFrame(render);
    };

    const move = (event: PointerEvent) => {
      target.current = { x: event.clientX, y: event.clientY };
      const targetElement = event.target instanceof Element ? event.target.closest('a, button, input, textarea, select, [data-cursor]') : null;
      const mode = targetElement?.getAttribute('data-cursor') || (targetElement?.matches('input, textarea, select') ? 'pin' : targetElement ? 'ring' : 'sphere');
      cursor.dataset.mode = mode;
      cursor.dataset.visible = 'true';
    };
    const leave = () => { cursor.dataset.visible = 'false'; };

    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    frame.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return <div ref={cursorRef} className="context-cursor" data-mode="sphere" data-visible="false" aria-hidden="true"><span /></div>;
}

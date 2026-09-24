import { useEffect, useRef } from 'react';

export default function ContextCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const target = useRef({ x: -100, y: -100 });
  const current = useRef({ x: -100, y: -100 });
  const trail = useRef<Array<{ x: number; y: number }>>([]);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const canvas = canvasRef.current;
    if (!cursor || !canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      current.current.x += (target.current.x - current.current.x) * 0.18;
      current.current.y += (target.current.y - current.current.y) * 0.18;
      trail.current.unshift({ ...current.current });
      trail.current = trail.current.slice(0, 18);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      trail.current.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      const dark = document.documentElement.classList.contains('dark');
      context.strokeStyle = dark ? 'rgba(65, 211, 190, .72)' : 'rgba(108, 92, 231, .58)';
      context.shadowColor = dark ? 'rgba(65, 211, 190, .75)' : 'rgba(108, 92, 231, .55)';
      context.shadowBlur = 9;
      context.lineWidth = 1.25;
      context.stroke();
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
      window.removeEventListener('resize', resize);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return <><canvas ref={canvasRef} className="context-cursor-trail" aria-hidden="true" /><div ref={cursorRef} className="context-cursor" data-mode="sphere" data-visible="false" aria-hidden="true"><span /></div></>;
}

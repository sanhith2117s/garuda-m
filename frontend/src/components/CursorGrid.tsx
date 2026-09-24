import { useEffect, useMemo, useRef } from 'react';

const COLUMNS = 26;
const ROWS = 16;

export default function CursorGrid() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cells = useMemo(() => Array.from({ length: COLUMNS * ROWS }), []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const activate = (event: PointerEvent) => {
      const bounds = grid.getBoundingClientRect();
      const column = Math.floor(((event.clientX - bounds.left) / bounds.width) * COLUMNS);
      const row = Math.floor(((event.clientY - bounds.top) / bounds.height) * ROWS);
      if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) return;
      const index = row * COLUMNS + column;
      const cell = grid.querySelector<HTMLElement>(`[data-cursor-cell="${index}"]`);
      grid.querySelectorAll<HTMLElement>('[data-cursor-cell].is-active').forEach((active) => active.classList.remove('is-active'));
      if (!cell) return;
      cell.classList.add('is-active');
      grid.style.setProperty('--cursor-column', String(column));
      grid.style.setProperty('--cursor-row', String(row));
    };

    const reset = () => {
      grid.querySelectorAll<HTMLElement>('[data-cursor-cell].is-active').forEach((active) => active.classList.remove('is-active'));
      grid.style.removeProperty('--cursor-column');
      grid.style.removeProperty('--cursor-row');
    };

    grid.addEventListener('pointermove', activate, { passive: true });
    grid.addEventListener('pointerdown', activate, { passive: true });
    grid.addEventListener('dblclick', reset);
    grid.addEventListener('pointerleave', reset);
    return () => {
      grid.removeEventListener('pointermove', activate);
      grid.removeEventListener('pointerdown', activate);
      grid.removeEventListener('dblclick', reset);
      grid.removeEventListener('pointerleave', reset);
    };
  }, []);

  return (
    <div ref={gridRef} className="cursor-grid" aria-hidden="true">
      {cells.map((_, index) => <span key={index} data-cursor-cell={index} className="cursor-grid-cell">+</span>)}
    </div>
  );
}

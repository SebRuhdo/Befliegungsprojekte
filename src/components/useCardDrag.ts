import { useCallback, useEffect, useRef, useState } from 'react';

// Drag & Drop für Projektkarten.
// Maus: Karte anklicken und ziehen. Touch (iPhone): Karte kurz gedrückt halten, dann ziehen.
// Ziele sind alle Elemente mit data-drop-key (Spalten und Felder der Spalten-Leiste).

export interface DragState {
  id: string;
  title: string;
  x: number;
  y: number;
  over: string | null;
}

interface Pending {
  id: string;
  title: string;
  startX: number;
  startY: number;
  touch: boolean;
  timer: number | null;
}

const LONG_PRESS_MS = 350;
const TOUCH_SLOP = 10; // so weit darf sich der Finger vor Ablauf des Long-Press bewegen (sonst: Scrollen)
const MOUSE_THRESHOLD = 6;
const EDGE = 48; // Randzone für automatisches Seitwärts-Scrollen

function dropKeyAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  return el?.closest<HTMLElement>('[data-drop-key]')?.dataset.dropKey ?? null;
}

export function useCardDrag(
  onDrop: (id: string, key: string) => void,
  scrollContainer: React.RefObject<HTMLElement | null>,
) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pending = useRef<Pending | null>(null);
  const suppressClick = useRef(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const update = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const clearPending = () => {
    if (pending.current?.timer) clearTimeout(pending.current.timer);
    pending.current = null;
  };

  const begin = (x: number, y: number) => {
    const p = pending.current;
    if (!p) return;
    clearPending();
    document.body.classList.add('is-dragging');
    navigator.vibrate?.(10);
    update({ id: p.id, title: p.title, x, y, over: dropKeyAt(x, y) });
  };

  const move = (x: number, y: number) => {
    const d = dragRef.current;
    if (d) update({ ...d, x, y, over: dropKeyAt(x, y) });
  };

  const finish = (drop: boolean) => {
    const d = dragRef.current;
    clearPending();
    if (!d) return;
    document.body.classList.remove('is-dragging');
    update(null);
    // Der Klick nach dem Loslassen soll das Projekt nicht öffnen
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 50);
    if (drop && d.over) onDropRef.current(d.id, d.over);
  };

  // Globale Listener (Bewegung kann überall auf der Seite stattfinden)
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const p = pending.current;
      if (dragRef.current) move(e.clientX, e.clientY);
      else if (p && !p.touch && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > MOUSE_THRESHOLD)
        begin(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (dragRef.current) finish(true);
      else clearPending();
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (dragRef.current) {
        e.preventDefault(); // nicht scrollen, während gezogen wird
        move(t.clientX, t.clientY);
        return;
      }
      const p = pending.current;
      if (p && Math.hypot(t.clientX - p.startX, t.clientY - p.startY) > TOUCH_SLOP) clearPending();
    };
    const onTouchEnd = () => {
      if (dragRef.current) finish(true);
      else clearPending();
    };
    const onTouchCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish(false);
    const onContextMenu = (e: Event) => {
      if (pending.current || dragRef.current) e.preventDefault();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('contextmenu', onContextMenu);
      document.body.classList.remove('is-dragging');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Am Bildschirmrand das Board automatisch seitwärts scrollen
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    const tick = () => {
      const d = dragRef.current;
      const el = scrollContainer.current;
      if (d && el) {
        const r = el.getBoundingClientRect();
        if (d.y >= r.top && d.y <= r.bottom) {
          if (d.x < r.left + EDGE) el.scrollLeft -= 10;
          else if (d.x > r.right - EDGE) el.scrollLeft += 10;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragging, scrollContainer]);

  /** Handler für eine Karte */
  const cardHandlers = useCallback(
    (id: string, title: string) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        clearPending();
        pending.current = { id, title, startX: e.clientX, startY: e.clientY, touch: false, timer: null };
      },
      onTouchStart: (e: React.TouchEvent) => {
        const t = e.touches[0];
        if (!t || e.touches.length > 1) return clearPending();
        clearPending();
        const p: Pending = { id, title, startX: t.clientX, startY: t.clientY, touch: true, timer: null };
        p.timer = window.setTimeout(() => {
          if (pending.current === p) begin(p.startX, p.startY);
        }, LONG_PRESS_MS);
        pending.current = p;
      },
      onClickCapture: (e: React.MouseEvent) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { drag, cardHandlers };
}

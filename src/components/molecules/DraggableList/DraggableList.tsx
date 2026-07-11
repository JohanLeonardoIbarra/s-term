import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DraggableList.module.css";

interface Props<T> {
  items: T[];
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
  onReorder: (fromIndex: number, toIndex: number) => void;
  className?: string;
  listClassName?: string;
}

export default function DraggableList<T>({
  items,
  renderItem,
  onReorder,
  className = "",
  listClassName = "",
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragShiftRef = useRef(0);
  const onReorderRef = useRef(onReorder);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  useEffect(() => {
    draggingIndexRef.current = draggingIndex;
  }, [draggingIndex]);

  useEffect(() => {
    dropIndexRef.current = dropIndex;
  }, [dropIndex]);

  const cancel = useCallback(() => {
    if (containerRef.current && pointerIdRef.current != null) {
      try {
        containerRef.current.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore
      }
    }
    setDraggingIndex(null);
    setDropIndex(null);
    draggingIndexRef.current = null;
    dropIndexRef.current = null;
    pointerIdRef.current = null;
  }, []);

  useEffect(() => {
    if (draggingIndex == null) return;

    const handleLeave = (e: PointerEvent | MouseEvent) => {
      if (e.target === document || e.target === window) cancel();
    };
    const handleBlur = () => cancel();

    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("pointerleave", handleLeave);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("blur", handleBlur);
    };
  }, [draggingIndex, cancel]);

  const computeDragShift = (from: number) => {
    const container = containerRef.current;
    if (!container) return;
    const elements = Array.from(
      container.querySelectorAll("[data-drag-item]")
    ) as HTMLElement[];
    const current = elements[from]?.getBoundingClientRect();
    const next = elements[from + 1]?.getBoundingClientRect();
    dragShiftRef.current = next ? next.top - current.top : current.height;
  };

  const computeDropIndex = (clientY: number): number => {
    const container = containerRef.current;
    if (!container) return 0;
    const from = draggingIndexRef.current;
    if (from == null) return 0;

    const elements = Array.from(
      container.querySelectorAll("[data-drag-item]")
    ) as HTMLElement[];
    const rects = elements.map((el) => el.getBoundingClientRect());
    const positions: number[] = [];

    for (let i = 0; i < rects.length; i++) {
      if (i === from) continue;
      const r = rects[i];
      const center = r.top + r.height / 2 - (i > from ? dragShiftRef.current : 0);
      positions.push(center);
    }

    for (let i = 0; i < positions.length; i++) {
      if (clientY < positions[i]) return i;
    }
    return positions.length;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const handle = target.closest("[data-drag-handle]");
    if (!handle) return;

    const item = target.closest("[data-drag-item]");
    if (!item) return;

    const fromIndex = Number(item.getAttribute("data-index"));
    if (Number.isNaN(fromIndex)) return;

    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (container) {
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    pointerIdRef.current = e.pointerId;
    draggingIndexRef.current = fromIndex;
    dropIndexRef.current = fromIndex;
    setDraggingIndex(fromIndex);
    setDropIndex(fromIndex);
    computeDragShift(fromIndex);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingIndexRef.current == null) return;
    if (e.buttons !== 1) {
      cancel();
      return;
    }

    const nextIndex = computeDropIndex(e.clientY);
    if (nextIndex !== dropIndexRef.current) {
      dropIndexRef.current = nextIndex;
      setDropIndex(nextIndex);
    }
  };

  const handlePointerUp = () => {
    if (draggingIndexRef.current == null) return;

    const from = draggingIndexRef.current;
    const to = dropIndexRef.current ?? from;
    if (from !== to) {
      onReorderRef.current(from, to);
    }

    if (containerRef.current && pointerIdRef.current != null) {
      try {
        containerRef.current.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore
      }
    }

    setDraggingIndex(null);
    setDropIndex(null);
    draggingIndexRef.current = null;
    dropIndexRef.current = null;
    pointerIdRef.current = null;
  };

  const insertBeforeIndex =
    dropIndex != null && draggingIndex != null
      ? dropIndex <= draggingIndex
        ? dropIndex
        : dropIndex + 1
      : null;

  const listClasses = [styles.list, className].filter(Boolean).join(" ");
  const innerClasses = [listClassName].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      className={listClasses}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className={innerClasses}>
        {items.map((item, i) => (
          <div
            key={i}
            data-drag-item
            data-index={i}
            className={`${styles.item} ${
              draggingIndex === i ? styles.dragging : ""
            }`}
          >
            {insertBeforeIndex === i && (
              <div className={styles.dropIndicator} />
            )}
            {renderItem(item, i, draggingIndex === i)}
          </div>
        ))}
        {insertBeforeIndex === items.length && (
          <div className={styles.dropIndicator} />
        )}
      </div>
    </div>
  );
}

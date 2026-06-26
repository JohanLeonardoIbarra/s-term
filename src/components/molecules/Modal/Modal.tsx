import type { ReactNode } from "react";
import styles from "./Modal.module.css";

interface Props {
  width?: string;
  onBackdrop?: () => void;
  children: ReactNode;
}

export default function Modal({ width, onBackdrop, children }: Props) {
  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onBackdrop) onBackdrop();
      }}
    >
      <div className={styles.modal} style={width ? { width } : undefined}>
        {children}
      </div>
    </div>
  );
}

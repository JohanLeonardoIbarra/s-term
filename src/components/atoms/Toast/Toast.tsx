import type { ReactNode } from "react";
import styles from "./Toast.module.css";

interface Props {
  variant?: "error" | "notice";
  onClick?: () => void;
  children: ReactNode;
}

export default function Toast({ variant = "error", onClick, children }: Props) {
  const classes = [styles.toast, variant === "notice" ? styles.notice : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}

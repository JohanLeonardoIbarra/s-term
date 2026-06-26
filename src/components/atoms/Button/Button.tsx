import type { ReactNode } from "react";
import styles from "./Button.module.css";

interface Props {
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  type = "button",
  disabled = false,
  fullWidth = false,
  className,
  onClick,
  children,
}: Props) {
  const classes = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

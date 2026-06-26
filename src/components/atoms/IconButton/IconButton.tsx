import type { ReactNode } from "react";
import styles from "./IconButton.module.css";

interface Props {
  title?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
}

export default function IconButton({
  title,
  type = "button",
  disabled = false,
  className,
  onClick,
  children,
}: Props) {
  const classes = [styles.iconBtn, className ?? ""].filter(Boolean).join(" ");
  return (
    <button
      type={type}
      className={classes}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

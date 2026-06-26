import type { ReactNode } from "react";
import styles from "./FieldLabel.module.css";

interface Props {
  className?: string;
  children: ReactNode;
}

export default function FieldLabel({ className, children }: Props) {
  const classes = [styles.label, className ?? ""].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}

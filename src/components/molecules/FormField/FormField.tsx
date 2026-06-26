import type { ReactNode } from "react";
import styles from "./FormField.module.css";

interface Props {
  label: ReactNode;
  hint?: ReactNode;
  flex?: number;
  children: ReactNode;
}

export default function FormField({ label, hint, flex, children }: Props) {
  return (
    <label className={styles.field} style={flex ? { flex } : undefined}>
      <span className={styles.labelRow}>
        {label}
        {hint}
      </span>
      {children}
    </label>
  );
}

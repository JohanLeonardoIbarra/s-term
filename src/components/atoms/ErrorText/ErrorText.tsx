import type { ReactNode } from "react";
import styles from "./ErrorText.module.css";

interface Props {
  children: ReactNode;
}

export default function ErrorText({ children }: Props) {
  return <div className={styles.error}>{children}</div>;
}

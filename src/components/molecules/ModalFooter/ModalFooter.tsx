import type { ReactNode } from "react";
import styles from "./ModalFooter.module.css";

interface Props {
  children: ReactNode;
}

export default function ModalFooter({ children }: Props) {
  return <div className={styles.footer}>{children}</div>;
}

import type { ReactNode } from "react";
import RangeSlider from "../../atoms/RangeSlider";
import FieldLabel from "../../atoms/FieldLabel";
import styles from "./FontSizeControl.module.css";

interface Props {
  label: ReactNode;
  value: number;
  min?: number;
  max?: number;
  displayValue?: string;
  onChange: (value: number) => void;
}

export default function FontSizeControl({
  label,
  value,
  min = 10,
  max = 20,
  displayValue,
  onChange,
}: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <FieldLabel>{label}</FieldLabel>
        <span className={`code-sm ${styles.value}`}>{displayValue ?? value}</span>
      </div>
      <div className={styles.sliderRow}>
        <span className={`body-sm ${styles.ico}`}>A</span>
        <RangeSlider min={min} max={max} value={value} onChange={onChange} />
        <span className={`headline-sm ${styles.ico}`}>A</span>
      </div>
    </section>
  );
}

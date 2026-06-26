import styles from "./RangeSlider.module.css";

interface Props {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export default function RangeSlider({ min, max, value, onChange }: Props) {
  return (
    <input
      type="range"
      className={styles.slider}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
    />
  );
}

import ExpandMore from "@mui/icons-material/ExpandMore";
import styles from "./Select.module.css";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function Select({ value, options, disabled, onChange }: Props) {
  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ExpandMore fontSize="small" className={styles.chevron} />
    </div>
  );
}

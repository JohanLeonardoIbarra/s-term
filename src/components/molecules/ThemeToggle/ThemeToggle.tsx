import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";
import Check from "@mui/icons-material/Check";
import { useTranslation } from "../../../i18n";
import styles from "./ThemeToggle.module.css";

interface Props {
  value: "dark" | "light";
  onChange: (value: "dark" | "light") => void;
}

export default function ThemeToggle({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.grid}>
      <button
        className={`${styles.option} code-md ${
          value === "dark" ? styles.active : ""
        }`}
        onClick={() => onChange("dark")}
      >
        <DarkMode fontSize="small" />
        {t("dark")}
        {value === "dark" && <Check fontSize="small" className={styles.check} />}
      </button>
      <button
        className={`${styles.option} code-md ${
          value === "light" ? styles.active : ""
        }`}
        onClick={() => onChange("light")}
      >
        <LightMode fontSize="small" />
        {t("light")}
        {value === "light" && (
          <Check fontSize="small" className={styles.check} />
        )}
      </button>
    </div>
  );
}

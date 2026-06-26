import Refresh from "@mui/icons-material/Refresh";
import styles from "./Spinner.module.css";

interface Props {
  size?: "sm" | "lg";
}

export default function Spinner({ size = "lg" }: Props) {
  return (
    <span className={styles.spinner}>
      <Refresh fontSize={size === "lg" ? "large" : "small"} className={styles.spin} />
    </span>
  );
}

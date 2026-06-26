import { useTranslation } from "../../../i18n";
import styles from "./LoadingOverlay.module.css";
import Spinner from "../../atoms/Spinner";

export default function LoadingOverlay() {
  const { t } = useTranslation();
  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <Spinner />
        </div>
        <div className={styles.text}>{t("loading.connecting")}</div>
      </div>
    </div>
  );
}

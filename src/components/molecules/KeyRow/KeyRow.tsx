import Key from "@mui/icons-material/Key";
import Delete from "@mui/icons-material/Delete";
import { useTranslation } from "../../../i18n";
import type { KeyView } from "../../../types";
import styles from "./KeyRow.module.css";

interface Props {
  keyView: KeyView;
  onDelete: () => void;
}

export default function KeyRow({ keyView, onDelete }: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.row}>
      <span className={styles.name}>
        <Key fontSize="small" /> {keyView.name}
      </span>
      <button className={styles.delete} onClick={onDelete}>
        <Delete fontSize="small" /> {t("keys.delete")}
      </button>
    </div>
  );
}

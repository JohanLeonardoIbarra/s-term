import { useEffect, useRef, useState } from "react";
import FileDownload from "@mui/icons-material/FileDownload";
import IconButton from "../../atoms/IconButton";
import { useTranslation } from "../../../i18n";
import styles from "./ImportMenu.module.css";

interface Props {
  onImportBackup: () => void;
  onImportCsv: () => void;
}

export default function ImportMenu({ onImportBackup, onImportCsv }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handlePick = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className={styles.container}>
      <IconButton title={t("sidebar.import")} onClick={() => setOpen(!open)}>
        <FileDownload fontSize="small" />
      </IconButton>
      {open && (
        <div className={styles.dropdown}>
          <button
            className={styles.option}
            onClick={() => handlePick(onImportBackup)}
          >
            {t("sidebar.importBackup")}
          </button>
          <button
            className={styles.option}
            onClick={() => handlePick(onImportCsv)}
          >
            {t("sidebar.importCsv")}
          </button>
        </div>
      )}
    </div>
  );
}

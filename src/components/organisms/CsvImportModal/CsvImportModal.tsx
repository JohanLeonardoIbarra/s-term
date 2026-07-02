import { useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { downloadCsvTemplate, importCsv } from "../../../api";
import Modal from "../../molecules/Modal";
import ModalHeader from "../../molecules/ModalHeader";
import Button from "../../atoms/Button";
import ErrorText from "../../atoms/ErrorText";
import { useTranslation } from "../../../i18n";
import styles from "./CsvImportModal.module.css";

interface Props {
  onImported: () => void;
  onClose: () => void;
}

export default function CsvImportModal({ onImported, onClose }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  async function handleDownloadTemplate() {
    setError(null);
    try {
      const path = await save({
        title: t("csv.downloadTemplate"),
        defaultPath: "s-term-template.csv",
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!path) return;
      await downloadCsvTemplate(path);
      setNotice(t("csv.templateDownloaded"));
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleUpload() {
    setError(null);
    setResult(null);
    try {
      const selected = await open({
        title: t("csv.upload"),
        multiple: false,
        directory: false,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (typeof selected !== "string") return;
      setBusy(true);
      const res = await importCsv(selected);
      setResult(res);
      if (res.imported > 0) {
        onImported();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  const [notice, setNotice] = useState<string | null>(null);

  return (
    <Modal onBackdrop={onClose}>
      <ModalHeader title={t("csv.title")} onClose={onClose} />
      <div className={styles.form}>
        <p className={styles.muted}>{t("csv.templateDesc")}</p>

        <Button variant="secondary" onClick={handleDownloadTemplate}>
          {t("csv.downloadTemplate")}
        </Button>

        <Button onClick={handleUpload} disabled={busy}>
          {busy ? t("csv.importing") : t("csv.upload")}
        </Button>

        {notice && <p className={styles.notice}>{notice}</p>}

        {result && (
          <div className={styles.result}>
            <p>{t("csv.imported", { count: result.imported })}</p>
            {result.errors.length > 0 && (
              <>
                <p className={styles.errorLabel}>{t("csv.errors")}</p>
                <ul className={styles.errorList}>
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </Modal>
  );
}

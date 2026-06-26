import { useState, useEffect } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import { listTerminals } from "../../../api";
import { useTranslation, languageLabels } from "../../../i18n";
import type { Settings, TerminalInfo } from "../../../types";
import Modal from "../../molecules/Modal";
import ModalHeader from "../../molecules/ModalHeader";
import ModalFooter from "../../molecules/ModalFooter";
import FieldLabel from "../../atoms/FieldLabel";
import Select from "../../atoms/Select";
import Button from "../../atoms/Button";
import ThemeToggle from "../../molecules/ThemeToggle";
import FontSizeControl from "../../molecules/FontSizeControl";
import styles from "./SettingsModal.module.css";

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onCancel: () => void;
}

export default function SettingsModal({ settings, onSave, onCancel }: Props) {
  const { t, setLanguage } = useTranslation();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [availableTerminals, setAvailableTerminals] = useState<TerminalInfo[]>([]);

  useEffect(() => {
    listTerminals().then(setAvailableTerminals).catch(console.error);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ui-font-size",
      `${localSettings.uiFontSize}px`
    );
  }, [localSettings.uiFontSize]);

  useEffect(() => {
    setLanguage(localSettings.language as "es" | "en");
  }, [localSettings.language, setLanguage]);

  const handleSave = () => {
    onSave(localSettings);
  };

  const handleDiscard = () => {
    document.documentElement.style.setProperty(
      "--ui-font-size",
      `${settings.uiFontSize}px`
    );
    setLanguage(settings.language as "es" | "en");
    setLocalSettings(settings);
    onCancel();
  };

  const langOptions = Object.entries(languageLabels).map(([code, label]) => ({
    value: code,
    label,
  }));

  const terminalOptions = availableTerminals.map((terminal) => ({
    value: terminal.id,
    label: terminal.label,
  }));

  return (
    <Modal onBackdrop={handleDiscard}>
      <ModalHeader
        title={
          <span className={`${styles.title} label-caps tracking-widest`}>
            {t("settings.config")}
          </span>
        }
        icon={<SettingsIcon fontSize="small" className={styles.icon} />}
        onClose={handleDiscard}
      />
      <div className={`form ${styles.body}`}>
        <section className={styles.section}>
          <FieldLabel>{t("theme.preference")}</FieldLabel>
          <ThemeToggle
            value={localSettings.theme}
            onChange={(v) => setLocalSettings({ ...localSettings, theme: v })}
          />
        </section>

        <section className={styles.section}>
          <FieldLabel>{t("localization")}</FieldLabel>
          <Select
            value={localSettings.language}
            options={langOptions}
            onChange={(v) => setLocalSettings({ ...localSettings, language: v })}
          />
        </section>

        <div className={styles.grid}>
          <FontSizeControl
            label={t("ui.font.size")}
            value={localSettings.uiFontSize}
            onChange={(v) => setLocalSettings({ ...localSettings, uiFontSize: v })}
          />
          <FontSizeControl
            label={t("terminal.font.size")}
            value={localSettings.terminalFontSize}
            displayValue={`${localSettings.terminalFontSize}px`}
            onChange={(v) =>
              setLocalSettings({ ...localSettings, terminalFontSize: v })
            }
          />
        </div>

        <section className={styles.section}>
          <FieldLabel>{t("default.terminal")}</FieldLabel>
          <Select
            value={localSettings.defaultTerminal}
            options={terminalOptions}
            onChange={(v) =>
              setLocalSettings({ ...localSettings, defaultTerminal: v })
            }
          />
        </section>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={handleDiscard}>
          {t("discard")}
        </Button>
        <Button onClick={handleSave}>{t("save.changes")}</Button>
      </ModalFooter>
    </Modal>
  );
}

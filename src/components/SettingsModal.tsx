import { useEffect, useState } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import Close from "@mui/icons-material/Close";
import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Check from "@mui/icons-material/Check";
import { useTranslation, languageLabels } from "../i18n";
import { listTerminals } from "../api";
import type { Settings } from "../types";

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onCancel: () => void;
}

export default function SettingsModal({ settings, onSave, onCancel }: Props) {
  const { t, setLanguage } = useTranslation();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [availableTerminals, setAvailableTerminals] = useState<string[]>([]);

  // Cargar terminales disponibles al montar
  useEffect(() => {
    listTerminals().then(setAvailableTerminals).catch(console.error);
  }, []);

  // Vista previa en vivo: aplica el tamaño de fuente UI mientras se mueve la barra
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ui-font-size",
      `${localSettings.uiFontSize}px`
    );
  }, [localSettings.uiFontSize]);

  // Sincronizar idioma del contexto con localSettings
  useEffect(() => {
    setLanguage(localSettings.language as "es" | "en");
  }, [localSettings.language, setLanguage]);

  const handleSave = () => {
    onSave(localSettings);
  };

  const handleDiscard = () => {
    // Revertir la vista previa al valor original guardado
    document.documentElement.style.setProperty(
      "--ui-font-size",
      `${settings.uiFontSize}px`
    );
    setLanguage(settings.language as "es" | "en");
    setLocalSettings(settings);
    onCancel();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: "460px", maxWidth: "92vw" }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SettingsIcon fontSize="small" className="text-primary" />
            <h2 className="label-caps text-primary tracking-widest" style={{ margin: 0 }}>{t("settings.config")}</h2>
          </div>
          <button className="icon-btn" onClick={handleDiscard}>
            <Close fontSize="small" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="form" style={{ gap: "32px", maxHeight: "70vh", overflowY: "auto", paddingBottom: "8px" }}>
          {/* Section: Theme Preference */}
          <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label className="label-caps text-on-surface-variant opacity-60">{t("theme.preference")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--border-slate)", padding: "4px", gap: "4px" }}>
              <button
                className={`code-md ${localSettings.theme === "dark" ? "bg-surface-active text-primary border border-logic-blue" : "text-on-surface-variant"}`}
                style={{ padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", position: "relative" }}
                onClick={() => setLocalSettings({ ...localSettings, theme: "dark" })}
              >
                <DarkMode fontSize="small" />
                {t("dark")}
                {localSettings.theme === "dark" && <Check fontSize="small" style={{ position: "absolute", right: "8px" }} />}
              </button>
              <button
                className={`code-md ${localSettings.theme === "light" ? "bg-surface-active text-primary border border-logic-blue" : "text-on-surface-variant"}`}
                style={{ padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", position: "relative" }}
                onClick={() => setLocalSettings({ ...localSettings, theme: "light" })}
              >
                <LightMode fontSize="small" />
                {t("light")}
                {localSettings.theme === "light" && <Check fontSize="small" style={{ position: "absolute", right: "8px" }} />}
              </button>
            </div>
          </section>

          {/* Section: Localization */}
          <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label className="label-caps text-on-surface-variant opacity-60">{t("localization")}</label>
            <div style={{ position: "relative" }}>
              <select
                className="code-md"
                style={{ width: "100%", background: "var(--surface-base)", borderBottom: "1px solid var(--border-slate)", color: "var(--on-surface)", padding: "12px 8px", appearance: "none", cursor: "pointer" }}
                value={localSettings.language}
                onChange={(e) => setLocalSettings({ ...localSettings, language: e.target.value })}
              >
                {Object.entries(languageLabels).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <ExpandMore fontSize="small" style={{ position: "absolute", right: "8px", top: "12px", pointerEvents: "none", color: "var(--on-surface-variant)" }} />
            </div>
          </section>

          {/* Dual Font Controls */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
            {/* Section: UI Font Size */}
            <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="label-caps text-on-surface-variant opacity-60">{t("ui.font.size")}</label>
                <span className="code-sm text-primary">{localSettings.uiFontSize}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
                <span className="body-sm text-on-surface-variant">A</span>
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={localSettings.uiFontSize}
                  onChange={(e) => setLocalSettings({ ...localSettings, uiFontSize: parseInt(e.target.value) })}
                  style={{ flex: 1, accentColor: "var(--primary)" }}
                />
                <span className="headline-sm text-on-surface-variant">A</span>
              </div>
            </section>

            {/* Section: Terminal Font Size */}
            <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="label-caps text-on-surface-variant opacity-60">{t("terminal.font.size")}</label>
                <span className="code-sm text-primary">{localSettings.terminalFontSize}px</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
                <span className="body-sm text-on-surface-variant">A</span>
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={localSettings.terminalFontSize}
                  onChange={(e) => setLocalSettings({ ...localSettings, terminalFontSize: parseInt(e.target.value) })}
                  style={{ flex: 1, accentColor: "var(--primary)" }}
                />
                <span className="headline-sm text-on-surface-variant">A</span>
              </div>
              <p className="code-sm text-on-surface-variant" style={{ fontSize: "10px", fontStyle: "italic", opacity: 0.5 }}>
                Preview: mono_font_rendering_test_01
              </p>
            </section>
          </div>

          {/* Section: Default Terminal */}
          <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label className="label-caps text-on-surface-variant opacity-60">{t("default.terminal")}</label>
            <div style={{ position: "relative" }}>
              <select
                className="code-md"
                style={{ width: "100%", background: "var(--surface-base)", borderBottom: "1px solid var(--border-slate)", color: "var(--on-surface)", padding: "12px 8px", appearance: "none", cursor: "pointer" }}
                value={localSettings.defaultTerminal}
                onChange={(e) => setLocalSettings({ ...localSettings, defaultTerminal: e.target.value })}
              >
                {availableTerminals.map((terminal) => (
                  <option key={terminal} value={terminal}>
                    {terminal === "auto" ? t("auto.detect") : terminal}
                  </option>
                ))}
              </select>
              <ExpandMore fontSize="small" style={{ position: "absolute", right: "8px", top: "12px", pointerEvents: "none", color: "var(--on-surface-variant)" }} />
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button className="secondary" onClick={handleDiscard}>
            {t("discard")}
          </button>
          <button className="primary" onClick={handleSave}>
            {t("save.changes")}
          </button>
        </div>
      </div>
    </div>
  );
}

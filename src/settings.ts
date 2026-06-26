import type { Settings } from "./types";

const SETTINGS_KEY = "s-term-settings";

export const defaultSettings: Settings = {
  theme: "dark",
  language: "es",
  uiFontSize: 14,
  terminalFontSize: 12,
  defaultTerminal: "auto",
};

export function getSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return defaultSettings;
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

import { createContext, useContext, useState, ReactNode } from "react";
import { es } from "./locales/es";
import { en } from "./locales/en";

const translations = { es, en } as const;

type Language = keyof typeof translations;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage?: string }) {
  const [language, setLanguage] = useState<Language>((initialLanguage as Language) || "es");

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let text = (translations[language] as Record<string, string>)?.[key] || (translations.es as Record<string, string>)[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return context;
}

export const languageLabels: Record<string, string> = {
  es: "Español (ES)",
  en: "English (US)",
};

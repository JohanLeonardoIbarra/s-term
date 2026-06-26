import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/organisms/Sidebar";
import TabBar from "./components/organisms/TabBar";
import Terminal from "./components/organisms/Terminal";
import UnlockVault from "./components/organisms/UnlockVault";
import ConnectionForm from "./components/organisms/ConnectionForm";
import KeyManager from "./components/organisms/KeyManager";
import PasswordPrompt from "./components/organisms/PasswordPrompt";
import ConfirmModal from "./components/organisms/ConfirmModal";
import SettingsModal from "./components/organisms/SettingsModal";
import Toast from "./components/atoms/Toast";
import styles from "./App.module.css";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  connectSsh,
  createLocalSession,
  deleteConnection,
  deleteKey,
  exportConnections,
  importConnections,
  listConnections,
  listKeys,
  listTerminals,
  lockVault,
  vaultIsUnlocked,
} from "./api";
import { getSettings, saveSettings } from "./settings";
import { useTranslation } from "./i18n";
import type { ConnectionView, KeyView, Session, Settings, TerminalInfo } from "./types";

interface PromptState {
  title: string;
  description?: string;
  confirm: boolean;
  submitLabel: string;
  onSubmit: (password: string) => Promise<void>;
}

interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function App() {
  const { t } = useTranslation();
  const [unlocked, setUnlocked] = useState(false);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [keys, setKeys] = useState<KeyView[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [availableTerminals, setAvailableTerminals] = useState<TerminalInfo[]>([]);

  const [showConnForm, setShowConnForm] = useState(false);
  const [editing, setEditing] = useState<ConnectionView | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [settings, setSettings] = useState<Settings>(getSettings());

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setShowSettings(false);
  };

  // Apply theme to root element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [settings.theme]);

  // Apply UI font size to root element
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ui-font-size", `${settings.uiFontSize}px`);
  }, [settings.uiFontSize]);

  useEffect(() => {
    vaultIsUnlocked().then(setUnlocked).catch(() => setUnlocked(false));
  }, []);

  useEffect(() => {
    listTerminals().then(setAvailableTerminals).catch(console.error);
  }, []);

  const refresh = useCallback(async () => {
    const [c, k] = await Promise.all([listConnections(), listKeys()]);
    setConnections(c);
    setKeys(k);
  }, []);

  useEffect(() => {
    if (unlocked) void refresh();
  }, [unlocked, refresh]);

  function addSession(session: Session) {
    setSessions((prev) => [...prev, session]);
    setActiveId(session.id);
  }

  const handleConnected = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, connecting: false } : s))
    );
  }, []);

  const handleExit = useCallback((_sessionId: string) => {
    /* keep tab so the user can read final output */
  }, []);

  async function handleNewLocal(terminal?: string) {
    const picked = typeof terminal === "string" ? terminal : undefined;
    const terminalToUse =
      picked ?? (settings.defaultTerminal === "auto" ? undefined : settings.defaultTerminal);
    try {
      const id = await createLocalSession(80, 24, terminalToUse);
      addSession({ id, title: "Local", kind: "local" });
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleConnect(c: ConnectionView) {
    // Generate temporary ID for immediate loading state
    const tempId = `temp-${Date.now()}`;
    // Add session immediately to show loading animation
    addSession({ id: tempId, title: c.name, kind: "ssh", connectionId: c.id, connecting: true });

    try {
      const realId = await connectSsh(c.id, 80, 24);
      // Update session with real ID after connection succeeds
      setSessions((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, id: realId } : s))
      );
      // Update activeId to the new real ID
      setActiveId(realId);
    } catch (err) {
      // Remove session if connection fails
      handleCloseSession(tempId);
      setError(String(err));
    }
  }

  function handleCloseSession(id: string) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeId === id) {
        setActiveId(next.length ? next[next.length - 1].id : null);
      }
      return next;
    });
  }

  function handleDeleteConnection(c: ConnectionView) {
    setConfirm({
      title: t("app.deleteConnTitle"),
      message: t("app.deleteConnMsg", { name: c.name }),
      onConfirm: async () => {
        await deleteConnection(c.id);
        setConfirm(null);
        void refresh();
      },
    });
  }

  async function handleLock() {
    await lockVault();
    setUnlocked(false);
    setSessions([]);
    setActiveId(null);
  }

  async function handleExport() {
    let path: string | null;
    try {
      path = await save({
        title: t("app.exportTitle"),
        defaultPath: "s-term-connections.stbk",
        filters: [{ name: "s-term backup", extensions: ["stbk"] }],
      });
    } catch (err) {
      setError(String(err));
      return;
    }
    if (!path) return;
    const target = path;
    setPrompt({
      title: t("app.encryptTitle"),
      description: t("app.encryptDesc"),
      confirm: true,
      submitLabel: t("app.exportLabel"),
      onSubmit: async (password) => {
        await exportConnections(target, password);
        setPrompt(null);
        setNotice(t("app.exported"));
      },
    });
  }

  async function handleImport() {
    let selected: string | string[] | null;
    try {
      selected = await open({
        title: t("app.importTitle"),
        multiple: false,
        directory: false,
        filters: [{ name: "s-term backup", extensions: ["stbk"] }],
      });
    } catch (err) {
      setError(String(err));
      return;
    }
    if (typeof selected !== "string") return;
    const source = selected;
    setPrompt({
      title: t("app.importBackupTitle"),
      description: t("app.importDesc"),
      confirm: false,
      submitLabel: t("app.importLabel"),
      onSubmit: async (password) => {
        const count = await importConnections(source, password);
        setPrompt(null);
        await refresh();
        setNotice(t("app.imported", { count }));
      },
    });
  }

  if (!unlocked) {
    return <UnlockVault onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className={styles.app}>
      <Sidebar
        connections={connections}
        onConnect={handleConnect}
        onNewLocal={handleNewLocal}
        onNewConnection={() => {
          setEditing(null);
          setShowConnForm(true);
        }}
        onEditConnection={(c) => {
          setEditing(c);
          setShowConnForm(true);
        }}
        onDeleteConnection={handleDeleteConnection}
        onManageKeys={() => setShowKeys(true)}
        onExport={handleExport}
        onImport={handleImport}
        onLock={handleLock}
        onOpenSettings={() => setShowSettings(true)}
        availableTerminals={availableTerminals}
        defaultTerminal={settings.defaultTerminal}
      />

      <main className={styles.workspace}>
        <TabBar
          sessions={sessions}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={handleCloseSession}
        />
        <div className={styles.terminalArea}>
          {sessions.length === 0 && (
            <div className={styles.emptyState}>
              <h2>{t("app.noSessions")}</h2>
              <p>
                {t("app.openHint")}
              </p>
            </div>
          )}
          {sessions.map((s) => (
            <Terminal
              key={s.id}
              sessionId={s.id}
              active={s.id === activeId}
              connecting={s.connecting}
              onExit={handleExit}
              onConnected={handleConnected}
              terminalFontSize={settings.terminalFontSize}
            />
          ))}
        </div>
      </main>

      {showConnForm && (
        <ConnectionForm
          keys={keys}
          existing={editing}
          onSaved={() => {
            setShowConnForm(false);
            void refresh();
          }}
          onClose={() => setShowConnForm(false)}
        />
      )}

      {showKeys && (
        <KeyManager
          keys={keys}
          onChange={() => void refresh()}
          onClose={() => setShowKeys(false)}
          onDeleteKey={(id, name) => {
            setConfirm({
              title: "Delete SSH key",
              message: `Are you sure you want to delete "${name}"?`,
              onConfirm: async () => {
                await deleteKey(id);
                setConfirm(null);
                void refresh();
              },
            });
          }}
        />
      )}

      {prompt && (
        <PasswordPrompt
          title={prompt.title}
          description={prompt.description}
          confirm={prompt.confirm}
          submitLabel={prompt.submitLabel}
          onSubmit={prompt.onSubmit}
          onCancel={() => setPrompt(null)}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onCancel={() => setShowSettings(false)}
        />
      )}

      {error && (
        <Toast variant="error" onClick={() => setError(null)}>
          {error}
        </Toast>
      )}

      {notice && (
        <Toast variant="notice" onClick={() => setNotice(null)}>
          {notice}
        </Toast>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import TabBar from "./components/TabBar";
import Terminal from "./components/Terminal";
import UnlockVault from "./components/UnlockVault";
import ConnectionForm from "./components/ConnectionForm";
import KeyManager from "./components/KeyManager";
import PasswordPrompt from "./components/PasswordPrompt";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  connectSsh,
  createLocalSession,
  deleteConnection,
  exportConnections,
  importConnections,
  listConnections,
  listKeys,
  lockVault,
  vaultIsUnlocked,
} from "./api";
import type { ConnectionView, KeyView, Session } from "./types";

interface PromptState {
  title: string;
  description?: string;
  confirm: boolean;
  submitLabel: string;
  onSubmit: (password: string) => Promise<void>;
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [keys, setKeys] = useState<KeyView[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [showConnForm, setShowConnForm] = useState(false);
  const [editing, setEditing] = useState<ConnectionView | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);

  useEffect(() => {
    vaultIsUnlocked().then(setUnlocked).catch(() => setUnlocked(false));
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

  async function handleNewLocal() {
    try {
      const id = await createLocalSession(80, 24);
      addSession({ id, title: "Local", kind: "local" });
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleConnect(c: ConnectionView) {
    try {
      const id = await connectSsh(c.id, 80, 24);
      addSession({ id, title: c.name, kind: "ssh", connectionId: c.id });
    } catch (err) {
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

  async function handleDeleteConnection(c: ConnectionView) {
    await deleteConnection(c.id);
    void refresh();
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
        title: "Export connections",
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
      title: "Encrypt backup",
      description:
        "Choose a password to encrypt the exported connections and keys.",
      confirm: true,
      submitLabel: "Export",
      onSubmit: async (password) => {
        await exportConnections(target, password);
        setPrompt(null);
        setNotice("Connections exported.");
      },
    });
  }

  async function handleImport() {
    let selected: string | string[] | null;
    try {
      selected = await open({
        title: "Import connections",
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
      title: "Import backup",
      description: "Enter the password used to encrypt this backup.",
      confirm: false,
      submitLabel: "Import",
      onSubmit: async (password) => {
        const count = await importConnections(source, password);
        setPrompt(null);
        await refresh();
        setNotice(`Imported ${count} connection${count === 1 ? "" : "s"}.`);
      },
    });
  }

  if (!unlocked) {
    return <UnlockVault onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="app">
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
      />

      <main className="workspace">
        <TabBar
          sessions={sessions}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={handleCloseSession}
        />
        <div className="terminal-area">
          {sessions.length === 0 && (
            <div className="empty-state">
              <h2>No active sessions</h2>
              <p>
                Open a local terminal or connect to a saved SSH host from the
                sidebar.
              </p>
            </div>
          )}
          {sessions.map((s) => (
            <Terminal
              key={s.id}
              sessionId={s.id}
              active={s.id === activeId}
              onExit={() => {
                /* keep tab so the user can read final output */
              }}
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

      {error && (
        <div className="toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {notice && (
        <div className="toast notice" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </div>
  );
}

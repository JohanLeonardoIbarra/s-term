import { FormEvent, useState } from "react";
import { addConnection, updateConnection } from "../api";
import Close from "@mui/icons-material/Close";
import { useTranslation } from "../i18n";
import type {
  AuthMethod,
  ConnectionInput,
  ConnectionView,
  KeyView,
} from "../types";

interface Props {
  keys: KeyView[];
  existing: ConnectionView | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function ConnectionForm({
  keys,
  existing,
  onSaved,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(existing?.name ?? "");
  const [host, setHost] = useState(existing?.host ?? "");
  const [port, setPort] = useState(existing?.port ?? 22);
  const [username, setUsername] = useState(existing?.username ?? "");
  const [group, setGroup] = useState(existing?.group ?? "");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    existing?.authMethod ?? "key"
  );
  const [keyId, setKeyId] = useState<string>(existing?.keyId ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !host.trim() || !username.trim()) {
      setError(t("conn.errRequired"));
      return;
    }
    if (authMethod === "key" && !keyId) {
      setError(t("conn.errKey"));
      return;
    }
    const input: ConnectionInput = {
      name: name.trim(),
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authMethod,
      group: group.trim() ? group.trim() : null,
      keyId: authMethod === "key" ? keyId : null,
      password: authMethod === "password" ? password : null,
    };
    setBusy(true);
    try {
      if (existing) {
        await updateConnection(existing.id, input);
      } else {
        await addConnection(input);
      }
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>{existing ? t("conn.edit") : t("conn.new")}</h2>
          <button className="icon-btn" onClick={onClose}>
            <Close fontSize="small" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <label>
            {t("conn.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="row">
            <label style={{ flex: 3 }}>
              {t("conn.host")}
              <input value={host} onChange={(e) => setHost(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              {t("conn.port")}
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            {t("conn.username")}
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            {t("conn.group")}
            <input value={group} onChange={(e) => setGroup(e.target.value)} />
          </label>
          <label>
            {t("conn.auth")}
            <select
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value as AuthMethod)}
            >
              <option value="key">{t("conn.auth.key")}</option>
              <option value="password">{t("conn.auth.password")}</option>
              <option value="agent">{t("conn.auth.agent")}</option>
            </select>
          </label>
          {authMethod === "key" && (
            <label>
              {t("conn.key")}
              <select value={keyId} onChange={(e) => setKeyId(e.target.value)}>
                <option value="">{t("conn.selectKey")}</option>
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {authMethod === "password" && (
            <label>
              {t("conn.password")} {existing && <small className="muted">{t("conn.passwordKeep")}</small>}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy}>
            {busy ? t("conn.saving") : t("conn.save")}
          </button>
        </form>
      </div>
    </div>
  );
}

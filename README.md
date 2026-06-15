# s-term

A cross-platform terminal application with multi-session management and an
**encrypted SSH connection directory**, built with **Tauri (Rust)** and
**React + TypeScript**.

The terminal is fully integrated into the app (no external terminal emulator
required) and the project compiles to **Windows 11, Linux and macOS**.

## Features

- **Integrated terminal** — `xterm.js` front-end driven by a native
  pseudo-terminal (`portable-pty`) on the Rust side.
- **Multiple sessions** — open many local shells and remote SSH sessions at the
  same time, each in its own tab.
- **SSH connection directory** — save remote hosts (host, port, user, auth
  method, optional group) and connect with one click.
- **Integrated SSH client** — connections use `libssh2` (`ssh2` crate); private
  keys are passed **in memory** and never written to disk in plaintext.
- **Encrypted vault** — connections and keys are stored in a single encrypted
  flat file:
  - Key derivation: **Argon2id** from a master password + random salt.
  - Encryption: **AES-256-GCM** with a fresh nonce on every write.
  - The vault is unlocked with the master password at startup and can be locked
    again at any time.
- **SSH keys** — associate a key with a connection by pasting its contents or
  importing a `.pem` / OpenSSH file. Keys are stored encrypted inside the vault.

## Architecture

```
src/                       React + TypeScript front-end
  components/Terminal.tsx   xterm.js bound to a backend session via events
  components/Sidebar.tsx    connection directory
  api.ts                    typed wrappers around Tauri `invoke`
src-tauri/src/
  vault.rs                  encrypted storage (Argon2id + AES-256-GCM)
  session.rs                session manager + event emitters
  pty.rs                    local shell via portable-pty
  ssh.rs                    interactive SSH via libssh2 (key in memory)
  lib.rs                    Tauri commands + setup
```

Data flows over Tauri events: the backend emits `pty://data` / `pty://exit`
(scoped by session id) and the front-end sends input through the
`write_session` / `resize_session` commands.

### Where is the vault stored?

The encrypted vault lives at `<app config dir>/vault.dat`:

- **Windows:** `%APPDATA%\com.johanibarra.sterm\vault.dat`
- **Linux:** `~/.config/com.johanibarra.sterm/vault.dat`
- **macOS:** `~/Library/Application Support/com.johanibarra.sterm/vault.dat`

> There is no password recovery. If you lose the master password the encrypted
> data cannot be decrypted.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Tauri system dependencies — see the
  [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

On Debian/Ubuntu:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev \
  libxdo-dev libayatana-appindicator3-dev libssl-dev patchelf pkg-config
```

### Run

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Bundles are written to `src-tauri/target/release/bundle/`.

## Cross-platform builds (CI)

- `.github/workflows/ci.yml` — type-checks the front-end and runs
  `cargo fmt` / `cargo clippy` on every push and PR.
- `.github/workflows/release.yml` — builds installers for **Windows, Linux and
  macOS (Intel + Apple Silicon)** using
  [`tauri-action`](https://github.com/tauri-apps/tauri-action). Push a tag like
  `v0.1.0` (or run the workflow manually) to produce a draft GitHub release with
  the artifacts attached.

## Security notes

- Private keys and passwords only exist in plaintext in memory while the vault
  is unlocked; on disk everything is AES-256-GCM encrypted.
- SSH authentication uses in-memory key material (`userauth_pubkey_memory`), so
  decrypted keys are never written to temporary files.
- The local `vault.dat` is git-ignored and must never be committed.

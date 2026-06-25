use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::mpsc::{self, Sender, TryRecvError};

use ssh2::Session;
use tauri::AppHandle;

use crate::error::{Error, Result};
use crate::session::{emit_exit, emit_output, SessionBackend};
use crate::vault::{AuthMethod, Connection, SshKey};

enum Cmd {
    Write(Vec<u8>),
    Resize(u16, u16),
    Close,
}

/// An interactive SSH session backed by libssh2.
pub struct SshSession {
    tx: Sender<Cmd>,
}

impl SshSession {
    pub fn connect(
        app: AppHandle,
        id: String,
        conn: Connection,
        key: Option<SshKey>,
        cols: u16,
        rows: u16,
    ) -> Result<Self> {
        // Connect + authenticate synchronously so errors reach the UI immediately.
        let tcp = TcpStream::connect((conn.host.as_str(), conn.port))
            .map_err(|e| Error::Ssh(format!("connect failed: {e}")))?;

        let mut sess = Session::new()?;
        sess.set_tcp_stream(tcp);
        sess.handshake()?;

        match conn.auth_method {
            AuthMethod::Password => {
                let pw = conn
                    .password
                    .clone()
                    .ok_or_else(|| Error::Ssh("no password stored for connection".into()))?;
                sess.userauth_password(&conn.username, &pw)?;
            }
            AuthMethod::Key => {
                let key =
                    key.ok_or_else(|| Error::Ssh("no key associated with connection".into()))?;
                sess.userauth_pubkey_memory(
                    &conn.username,
                    None,
                    &key.private_key,
                    key.passphrase.as_deref(),
                )?;
            }
            AuthMethod::Agent => {
                sess.userauth_agent(&conn.username)?;
            }
        }

        if !sess.authenticated() {
            return Err(Error::Ssh("authentication failed".into()));
        }

        let mut channel = sess.channel_session()?;
        channel.request_pty(
            "xterm-256color",
            None,
            Some((cols as u32, rows as u32, 0, 0)),
        )?;
        channel.shell()?;

        // Blocking mode: libssh2 drains incoming flow internally, eliminating the
        // spurious EAGAIN-as-error failures that closed the session under load.
        sess.set_blocking(true);
        // Read calls block at most this long before returning a timeout we treat
        // as "no data yet" so the loop can also process pending writes.
        sess.set_timeout(50); // milliseconds
                              // Detect genuinely dead connections without false positives.
        sess.set_keepalive(true, 15); // seconds

        let (tx, rx) = mpsc::channel::<Cmd>();

        let id_clone = id.clone();
        std::thread::spawn(move || {
            // Keep the session alive for the lifetime of the channel.
            let sess = sess;
            let mut buf = [0u8; 8192];
            // Counter to send periodic keepalives. Each loop iteration is at most
            // ~50ms (the read timeout), so ~200 iterations is roughly 10 seconds.
            let mut ticks: u32 = 0;
            const KEEPALIVE_EVERY_TICKS: u32 = 200;

            'outer: loop {
                // 1. Drain ALL pending read data first (prevents "Failure while draining incoming flow" on writes)
                loop {
                    match channel.read(&mut buf) {
                        Ok(0) => {
                            // Genuine end-of-stream.
                            break 'outer;
                        }
                        Ok(n) => {
                            let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                            if emit_output(&app, &id_clone, chunk).is_err() {
                                break 'outer;
                            }
                        }
                        Err(_) => {
                            // Timeout / no more data: stop draining
                            break;
                        }
                    }
                }

                // 2. Process all pending control/input commands.
                loop {
                    match rx.try_recv() {
                        Ok(Cmd::Write(data)) => {
                            // Blocking write_all: safe now that we've drained all pending reads
                            match channel.write_all(&data) {
                                Ok(()) => {
                                    let _ = channel.flush();
                                }
                                Err(_) => {
                                    // A write failure on a live link is transient; only a
                                    // real disconnect (detected below via eof/keepalive)
                                    // ends the session. Do not break here.
                                }
                            }
                        }
                        Ok(Cmd::Resize(c, r)) => {
                            let _ = channel.request_pty_size(c as u32, r as u32, None, None);
                        }
                        Ok(Cmd::Close) => {
                            let _ = channel.close();
                            break 'outer;
                        }
                        Err(TryRecvError::Empty) => break,
                        Err(TryRecvError::Disconnected) => {
                            break 'outer;
                        }
                    }
                }

                // 3. Clean exit if the remote closed the stream.
                if channel.eof() {
                    break;
                }

                // 4. Periodic keepalive: the ONLY reliable dead-connection detector.
                ticks = ticks.wrapping_add(1);
                if ticks % KEEPALIVE_EVERY_TICKS == 0 && sess.keepalive_send().is_err() {
                    break;
                }
            }

            let code = channel.exit_status().ok();
            let _ = channel.wait_close();
            let _ = emit_exit(&app, &id_clone, code);
        });

        Ok(SshSession { tx })
    }
}

impl SessionBackend for SshSession {
    fn write(&self, data: &[u8]) -> Result<()> {
        self.tx
            .send(Cmd::Write(data.to_vec()))
            .map_err(|_| Error::Session("ssh session closed".into()))
    }

    fn resize(&self, cols: u16, rows: u16) -> Result<()> {
        self.tx
            .send(Cmd::Resize(cols, rows))
            .map_err(|_| Error::Session("ssh session closed".into()))
    }

    fn close(&self) {
        let _ = self.tx.send(Cmd::Close);
    }
}

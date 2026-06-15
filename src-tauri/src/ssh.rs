use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::mpsc::{self, Sender, TryRecvError};
use std::time::Duration;

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

        // Switch to non-blocking so the owner thread can interleave reads/writes.
        sess.set_blocking(false);

        let (tx, rx) = mpsc::channel::<Cmd>();

        std::thread::spawn(move || {
            // Keep the session alive for the lifetime of the channel.
            let _sess = sess;
            let mut buf = [0u8; 8192];
            // Outbound bytes waiting to be sent; we never block on writes so a
            // full remote window can't stall the read side (and vice versa).
            let mut outbuf: Vec<u8> = Vec::new();
            // Consecutive non-EAGAIN read errors; only a sustained run means the
            // connection is really gone. A single transient error must not kill
            // the session (this caused spurious "[process exited]" under load).
            let mut read_errors: u32 = 0;
            const MAX_READ_ERRORS: u32 = 64;

            'outer: loop {
                // 1. Collect any pending input / control commands.
                loop {
                    match rx.try_recv() {
                        Ok(Cmd::Write(data)) => outbuf.extend_from_slice(&data),
                        Ok(Cmd::Resize(c, r)) => {
                            let _ = channel.request_pty_size(c as u32, r as u32, None, None);
                        }
                        Ok(Cmd::Close) => {
                            let _ = channel.close();
                            break 'outer;
                        }
                        Err(TryRecvError::Empty) => break,
                        Err(TryRecvError::Disconnected) => break 'outer,
                    }
                }

                let mut did_work = false;

                // 2. Push as much buffered input as the channel will accept now.
                if !outbuf.is_empty() {
                    match channel.write(&outbuf) {
                        Ok(0) => {}
                        Ok(n) => {
                            outbuf.drain(..n);
                            did_work = true;
                        }
                        Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                        // Keep the bytes buffered and retry next iteration.
                        Err(_) => {}
                    }
                    let _ = channel.flush();
                }

                // 3. Drain all currently available output.
                loop {
                    match channel.read(&mut buf) {
                        Ok(0) => break,
                        Ok(n) => {
                            read_errors = 0;
                            did_work = true;
                            let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                            let _ = emit_output(&app, &id, chunk);
                        }
                        Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                            read_errors = 0;
                            break;
                        }
                        Err(_) => {
                            read_errors += 1;
                            break;
                        }
                    }
                }

                // 4. Exit only on genuine end-of-stream or a dead connection.
                if channel.eof() || read_errors >= MAX_READ_ERRORS {
                    break;
                }

                if !did_work {
                    std::thread::sleep(Duration::from_millis(5));
                }
            }

            let code = channel.exit_status().ok();
            let _ = channel.wait_close();
            let _ = emit_exit(&app, &id, code);
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

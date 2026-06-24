use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::mpsc::{self, Sender, TryRecvError};
use std::time::{Duration, Instant};

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

            // --- Time-based health tracking ---
            // We only kill the session when ALL I/O (reads AND writes) have
            // failed continuously for IO_DEAD_TIMEOUT.  A single successful
            // read or write resets the clock, preventing spurious exits when
            // the channel is temporarily busy (e.g. libssh2 returns EAGAIN
            // on reads while processing outbound data during fast typing).
            let mut last_successful_io = Instant::now();
            const IO_DEAD_TIMEOUT: Duration = Duration::from_secs(8);

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
                            last_successful_io = Instant::now();
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
                            did_work = true;
                            last_successful_io = Instant::now();
                            let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                            let _ = emit_output(&app, &id, chunk);
                        }
                        Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                            // Not an error — just no data available right now.
                            break;
                        }
                        Err(_) => {
                            // Transient error (e.g. EAGAIN mapped to a
                            // non-WouldBlock kind on some platforms, or
                            // libssh2 busy with another operation). We do NOT
                            // kill the session here; the time-based check
                            // below handles genuinely dead connections.
                            break;
                        }
                    }
                }

                // 4. Exit only on genuine end-of-stream or a dead connection.
                if channel.eof() {
                    break;
                }
                if last_successful_io.elapsed() >= IO_DEAD_TIMEOUT {
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

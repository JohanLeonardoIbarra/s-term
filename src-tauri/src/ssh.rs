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
            let mut buf = [0u8; 4096];
            'outer: loop {
                loop {
                    match rx.try_recv() {
                        Ok(Cmd::Write(data)) => {
                            let _ = write_all_nb(&mut channel, &data);
                        }
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

                match channel.read(&mut buf) {
                    Ok(0) => {
                        if channel.eof() {
                            break;
                        }
                    }
                    Ok(n) => {
                        let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                        if emit_output(&app, &id, chunk).is_err() {
                            break;
                        }
                    }
                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                    Err(_) => break,
                }

                if channel.eof() {
                    break;
                }
                std::thread::sleep(Duration::from_millis(8));
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

fn write_all_nb(channel: &mut ssh2::Channel, data: &[u8]) -> std::io::Result<()> {
    let mut written = 0;
    while written < data.len() {
        match channel.write(&data[written..]) {
            Ok(0) => break,
            Ok(n) => written += n,
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(2));
            }
            Err(e) => return Err(e),
        }
    }
    let _ = channel.flush();
    Ok(())
}

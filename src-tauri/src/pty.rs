use std::io::{Read, Write};
use std::sync::Mutex;

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use tauri::AppHandle;

use crate::error::{Error, Result};
use crate::session::{emit_exit, emit_output, SessionBackend};

/// A local shell running inside a pseudo-terminal.
pub struct LocalPty {
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn Child + Send + Sync>>,
}

impl LocalPty {
    pub fn spawn(app: AppHandle, id: String, cols: u16, rows: u16) -> Result<Self> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| Error::Session(e.to_string()))?;

        let cmd = default_shell_command();
        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| Error::Session(e.to_string()))?;
        // The slave handle is no longer needed once the child owns it.
        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| Error::Session(e.to_string()))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| Error::Session(e.to_string()))?;

        // Reader thread: stream PTY output to the frontend.
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                        if emit_output(&app, &id, chunk).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
            let _ = emit_exit(&app, &id, None);
        });

        Ok(LocalPty {
            master: Mutex::new(pair.master),
            writer: Mutex::new(writer),
            child: Mutex::new(child),
        })
    }
}

impl SessionBackend for LocalPty {
    fn write(&self, data: &[u8]) -> Result<()> {
        let mut writer = self.writer.lock().unwrap();
        writer.write_all(data)?;
        writer.flush()?;
        Ok(())
    }

    fn resize(&self, cols: u16, rows: u16) -> Result<()> {
        self.master
            .lock()
            .unwrap()
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| Error::Session(e.to_string()))
    }

    fn close(&self) {
        let _ = self.child.lock().unwrap().kill();
    }
}

fn default_shell_command() -> CommandBuilder {
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let shell = std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".into());
        CommandBuilder::new(shell)
    };

    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
        CommandBuilder::new(shell)
    };

    if let Some(home) = dirs_home() {
        cmd.cwd(home);
    }
    cmd.env("TERM", "xterm-256color");
    cmd
}

fn dirs_home() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").ok()
    }
}

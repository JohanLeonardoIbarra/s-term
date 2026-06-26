use std::io::{Read, Write};
use std::sync::Mutex;

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::AppHandle;

use crate::error::{Error, Result};
use crate::session::{emit_exit, emit_output, SessionBackend};

#[derive(Clone, Serialize)]
pub struct TerminalInfo {
    pub id: String,
    pub label: String,
}

/// A local shell running inside a pseudo-terminal.
pub struct LocalPty {
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn Child + Send + Sync>>,
}

impl LocalPty {
    pub fn spawn(app: AppHandle, id: String, cols: u16, rows: u16, terminal: Option<String>) -> Result<Self> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| Error::Session(e.to_string()))?;

        let cmd = shell_command(terminal);
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

fn shell_command(terminal: Option<String>) -> CommandBuilder {
    resolve_command(terminal)
}

fn default_shell() -> String {
    #[cfg(target_os = "windows")]
    {
        std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".into())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into())
    }
}

fn resolve_command(id: Option<String>) -> CommandBuilder {
    let id = id.as_deref();

    match id {
        None | Some("auto") => {
            let shell = default_shell();
            let mut cmd = CommandBuilder::new(shell);
            if let Some(home) = dirs_home() {
                cmd.cwd(home);
            }
            cmd.env("TERM", "xterm-256color");
            cmd
        }
        #[cfg(target_os = "windows")]
        Some(id_str) => match id_str {
            "cmd" => {
                let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
                let cmd_path = format!("{}\\System32\\cmd.exe", system_root);
                let mut cmd = CommandBuilder::new(cmd_path);
                if let Some(home) = dirs_home() {
                    cmd.cwd(home);
                }
                cmd.env("TERM", "xterm-256color");
                cmd
            }
            "powershell" => {
                let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
                let ps_path = format!("{}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", system_root);
                let mut cmd = CommandBuilder::new(ps_path);
                if let Some(home) = dirs_home() {
                    cmd.cwd(home);
                }
                cmd.env("TERM", "xterm-256color");
                cmd
            }
            "pwsh" => {
                let pwsh_path = if let Ok(path) = which::which("pwsh") {
                    path.to_string_lossy().to_string()
                } else {
                    "C:\\Program Files\\PowerShell\\7\\pwsh.exe".to_string()
                };
                let mut cmd = CommandBuilder::new(pwsh_path);
                if let Some(home) = dirs_home() {
                    cmd.cwd(home);
                }
                cmd.env("TERM", "xterm-256color");
                cmd
            }
            "gitbash" => {
                let gitbash_path = if std::path::Path::new("C:\\Program Files\\Git\\bin\\bash.exe").exists() {
                    "C:\\Program Files\\Git\\bin\\bash.exe".to_string()
                } else {
                    "C:\\Program Files (x86)\\Git\\bin\\bash.exe".to_string()
                };
                let mut cmd = CommandBuilder::new(gitbash_path);
                cmd.args(["-i", "-l"]);
                if let Some(home) = dirs_home() {
                    cmd.cwd(home);
                }
                cmd.env("TERM", "xterm-256color");
                cmd
            }
            "wsl" => {
                let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
                let wsl_path = format!("{}\\System32\\wsl.exe", system_root);
                CommandBuilder::new(wsl_path)
            }
            _ => {
                // Treat as direct path/exe for compatibility
                let mut cmd = CommandBuilder::new(id_str);
                if let Some(home) = dirs_home() {
                    cmd.cwd(home);
                }
                cmd.env("TERM", "xterm-256color");
                cmd
            }
        },
        #[cfg(not(target_os = "windows"))]
        Some(id_str) => {
            if ["bash", "zsh", "fish", "sh"].contains(&id_str) {
                let exe_path = if let Ok(path) = which::which(id_str) {
                    path.to_string_lossy().to_string()
                } else {
                    format!("/bin/{}", id_str)
                };
                let mut cmd = CommandBuilder::new(exe_path);
                if let Some(home) = dirs_home() {
                    cmd.cwd(home);
                }
                cmd.env("TERM", "xterm-256color");
                cmd
            } else {
                // Treat as direct path for compatibility
                let mut cmd = CommandBuilder::new(id_str);
                if let Some(home) = dirs_home() {
                    cmd.cwd(home);
                }
                cmd.env("TERM", "xterm-256color");
                cmd
            }
        }
    }
}

pub fn detect_terminals() -> Vec<TerminalInfo> {
    let mut terminals = vec![TerminalInfo {
        id: "auto".to_string(),
        label: "Automático".to_string(),
    }];

    #[cfg(target_os = "windows")]
    {
        let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
        let system32 = format!("{}\\System32", system_root);

        // cmd
        let cmd_path = format!("{}\\cmd.exe", system32);
        if std::path::Path::new(&cmd_path).exists() {
            terminals.push(TerminalInfo {
                id: "cmd".to_string(),
                label: "Command Prompt".to_string(),
            });
        }

        // PowerShell v1.0
        let ps_path = format!("{}\\WindowsPowerShell\\v1.0\\powershell.exe", system32);
        if std::path::Path::new(&ps_path).exists() {
            terminals.push(TerminalInfo {
                id: "powershell".to_string(),
                label: "Windows PowerShell".to_string(),
            });
        }

        // PowerShell 7
        let pwsh_found = if which::which("pwsh").is_ok() {
            true
        } else {
            let pwsh_path = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
            std::path::Path::new(pwsh_path).exists()
        };
        if pwsh_found {
            terminals.push(TerminalInfo {
                id: "pwsh".to_string(),
                label: "PowerShell 7".to_string(),
            });
        }

        // Git Bash
        let gitbash_found = [
            "C:\\Program Files\\Git\\bin\\bash.exe",
            "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        ]
        .iter()
        .any(|path| std::path::Path::new(path).exists());
        if gitbash_found {
            terminals.push(TerminalInfo {
                id: "gitbash".to_string(),
                label: "Git Bash".to_string(),
            });
        }

        // WSL
        let wsl_path = format!("{}\\wsl.exe", system32);
        if std::path::Path::new(&wsl_path).exists() {
            terminals.push(TerminalInfo {
                id: "wsl".to_string(),
                label: "WSL".to_string(),
            });
        }
    }

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        // Common shells
        for (shell, label) in [
            ("bash", "Bash"),
            ("zsh", "Zsh"),
            ("fish", "Fish"),
            ("sh", "POSIX sh"),
        ] {
            if which::which(shell).is_ok() {
                terminals.push(TerminalInfo {
                    id: shell.to_string(),
                    label: label.to_string(),
                });
            }
        }

        // Read /etc/shells for additional shells
        if let Ok(content) = std::fs::read_to_string("/etc/shells") {
            let existing_ids: std::collections::HashSet<String> =
                terminals.iter().map(|t| t.id.clone()).collect();
            for line in content.lines() {
                let line = line.trim();
                if line.starts_with('#') || line.is_empty() {
                    continue;
                }
                if let Some(shell_name) = std::path::Path::new(line)
                    .file_name()
                    .and_then(|n| n.to_str())
                {
                    if !existing_ids.contains(shell_name) {
                        let label = {
                            let mut chars = shell_name.chars();
                            match chars.next() {
                                None => String::new(),
                                Some(first) => first.to_uppercase().chain(chars).collect(),
                            }
                        };
                        terminals.push(TerminalInfo {
                            id: shell_name.to_string(),
                            label,
                        });
                    }
                }
            }
        }
    }

    terminals
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

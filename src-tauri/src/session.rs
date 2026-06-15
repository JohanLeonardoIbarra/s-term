use std::collections::HashMap;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::{Error, Result};

/// Common operations every kind of terminal session must support.
pub trait SessionBackend: Send {
    fn write(&self, data: &[u8]) -> Result<()>;
    fn resize(&self, cols: u16, rows: u16) -> Result<()>;
    fn close(&self);
}

#[derive(Clone, Serialize)]
struct PtyData {
    id: String,
    data: String,
}

#[derive(Clone, Serialize)]
struct PtyExit {
    id: String,
    code: Option<i32>,
}

pub fn emit_output(app: &AppHandle, id: &str, data: String) -> Result<()> {
    app.emit(
        "pty://data",
        PtyData {
            id: id.to_string(),
            data,
        },
    )
    .map_err(|e| Error::Session(e.to_string()))
}

pub fn emit_exit(app: &AppHandle, id: &str, code: Option<i32>) -> Result<()> {
    app.emit(
        "pty://exit",
        PtyExit {
            id: id.to_string(),
            code,
        },
    )
    .map_err(|e| Error::Session(e.to_string()))
}

/// Tracks every open session by id.
#[derive(Default)]
pub struct SessionManager {
    sessions: Mutex<HashMap<String, Box<dyn SessionBackend>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(&self, id: String, backend: Box<dyn SessionBackend>) {
        self.sessions.lock().unwrap().insert(id, backend);
    }

    pub fn write(&self, id: &str, data: &[u8]) -> Result<()> {
        let guard = self.sessions.lock().unwrap();
        let session = guard
            .get(id)
            .ok_or_else(|| Error::NotFound(id.to_string()))?;
        session.write(data)
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<()> {
        let guard = self.sessions.lock().unwrap();
        let session = guard
            .get(id)
            .ok_or_else(|| Error::NotFound(id.to_string()))?;
        session.resize(cols, rows)
    }

    pub fn close(&self, id: &str) -> Result<()> {
        let session = self.sessions.lock().unwrap().remove(id);
        if let Some(session) = session {
            session.close();
        }
        Ok(())
    }
}

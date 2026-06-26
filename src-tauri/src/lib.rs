mod error;
mod pty;
mod session;
mod ssh;
mod vault;

use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

use error::{Error, Result};
use pty::{detect_terminals, LocalPty, TerminalInfo};
use session::SessionManager;
use ssh::SshSession;
use vault::{ConnectionInput, ConnectionView, KeyInput, KeyView, Vault};

// ---- Vault commands -------------------------------------------------------

#[tauri::command]
fn vault_exists(vault: State<'_, Vault>) -> bool {
    vault.exists()
}

#[tauri::command]
fn vault_is_unlocked(vault: State<'_, Vault>) -> bool {
    vault.is_unlocked()
}

#[tauri::command]
fn init_vault(password: String, vault: State<'_, Vault>) -> Result<()> {
    vault.init(&password)
}

#[tauri::command]
fn unlock_vault(password: String, vault: State<'_, Vault>) -> Result<()> {
    vault.unlock(&password)
}

#[tauri::command]
fn lock_vault(vault: State<'_, Vault>) {
    vault.lock();
}

// ---- Connection commands --------------------------------------------------

#[tauri::command]
fn list_connections(vault: State<'_, Vault>) -> Result<Vec<ConnectionView>> {
    vault.list_connections()
}

#[tauri::command]
fn add_connection(input: ConnectionInput, vault: State<'_, Vault>) -> Result<ConnectionView> {
    vault.add_connection(input)
}

#[tauri::command]
fn update_connection(
    id: String,
    input: ConnectionInput,
    vault: State<'_, Vault>,
) -> Result<ConnectionView> {
    vault.update_connection(&id, input)
}

#[tauri::command]
fn delete_connection(id: String, vault: State<'_, Vault>) -> Result<()> {
    vault.delete_connection(&id)
}

// ---- Key commands ---------------------------------------------------------

#[tauri::command]
fn list_keys(vault: State<'_, Vault>) -> Result<Vec<KeyView>> {
    vault.list_keys()
}

#[tauri::command]
fn add_key(input: KeyInput, vault: State<'_, Vault>) -> Result<KeyView> {
    vault.add_key(input)
}

#[tauri::command]
fn delete_key(id: String, vault: State<'_, Vault>) -> Result<()> {
    vault.delete_key(&id)
}

#[tauri::command]
fn read_key_file(path: String) -> Result<String> {
    std::fs::read_to_string(&path).map_err(Error::from)
}

// ---- Backup commands ------------------------------------------------------

#[tauri::command]
fn export_connections(path: String, password: String, vault: State<'_, Vault>) -> Result<()> {
    let bytes = vault.export_bytes(&password)?;
    std::fs::write(&path, bytes).map_err(Error::from)
}

#[tauri::command]
fn import_connections(path: String, password: String, vault: State<'_, Vault>) -> Result<usize> {
    let data = std::fs::read(&path)?;
    vault.import_bytes(&data, &password)
}

// ---- Session commands -----------------------------------------------------

#[tauri::command]
fn list_terminals() -> Vec<TerminalInfo> {
    detect_terminals()
}

#[tauri::command]
fn create_local_session(
    app: AppHandle,
    manager: State<'_, SessionManager>,
    cols: u16,
    rows: u16,
    terminal: Option<String>,
) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let pty = LocalPty::spawn(app, id.clone(), cols, rows, terminal)?;
    manager.insert(id.clone(), Box::new(pty));
    Ok(id)
}

#[tauri::command]
async fn connect_ssh(
    app: AppHandle,
    vault: State<'_, Vault>,
    manager: State<'_, SessionManager>,
    connection_id: String,
    cols: u16,
    rows: u16,
) -> Result<String> {
    let conn = vault.get_connection(&connection_id)?;
    let key = match &conn.key_id {
        Some(key_id) => Some(vault.get_key(key_id)?),
        None => None,
    };
    let id = Uuid::new_v4().to_string();
    let session = SshSession::connect(app, id.clone(), conn, key, cols, rows).await?;
    manager.insert(id.clone(), Box::new(session));
    Ok(id)
}

#[tauri::command]
fn write_session(manager: State<'_, SessionManager>, id: String, data: String) -> Result<()> {
    manager.write(&id, data.as_bytes())
}

#[tauri::command]
fn resize_session(
    manager: State<'_, SessionManager>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<()> {
    manager.resize(&id, cols, rows)
}

#[tauri::command]
fn close_session(manager: State<'_, SessionManager>, id: String) -> Result<()> {
    manager.close(&id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let config_dir = app.path().app_config_dir()?;
            let vault_path = config_dir.join("vault.dat");
            app.manage(Vault::new(vault_path));
            app.manage(SessionManager::new());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            vault_exists,
            vault_is_unlocked,
            init_vault,
            unlock_vault,
            lock_vault,
            list_connections,
            add_connection,
            update_connection,
            delete_connection,
            list_keys,
            add_key,
            delete_key,
            read_key_file,
            export_connections,
            import_connections,
            list_terminals,
            create_local_session,
            connect_ssh,
            write_session,
            resize_session,
            close_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

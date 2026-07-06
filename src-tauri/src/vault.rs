use std::path::PathBuf;
use std::sync::Mutex;

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use argon2::Argon2;
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use zeroize::Zeroize;

use crate::error::{Error, Result};

const VAULT_VERSION: u32 = 1;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuthMethod {
    Key,
    Password,
    Agent,
}

/// Full connection record stored (encrypted) inside the vault.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub key_id: Option<String>,
    #[serde(default)]
    pub group: Option<String>,
}

/// Private key material stored (encrypted) inside the vault.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKey {
    pub id: String,
    pub name: String,
    pub private_key: String,
    #[serde(default)]
    pub passphrase: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct VaultData {
    #[serde(default)]
    pub connections: Vec<Connection>,
    #[serde(default)]
    pub keys: Vec<SshKey>,
}

/// On-disk envelope: a plain JSON file containing the encrypted blob.
#[derive(Debug, Serialize, Deserialize)]
struct VaultFile {
    version: u32,
    salt: String,
    nonce: String,
    ciphertext: String,
}

// ---- Sanitized views returned to the frontend -----------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionView {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    pub key_id: Option<String>,
    pub group: Option<String>,
}

impl From<&Connection> for ConnectionView {
    fn from(c: &Connection) -> Self {
        ConnectionView {
            id: c.id.clone(),
            name: c.name.clone(),
            host: c.host.clone(),
            port: c.port,
            username: c.username.clone(),
            auth_method: c.auth_method,
            key_id: c.key_id.clone(),
            group: c.group.clone(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct KeyView {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInput {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub key_id: Option<String>,
    #[serde(default)]
    pub group: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyInput {
    pub name: String,
    pub private_key: String,
    #[serde(default)]
    pub passphrase: Option<String>,
}

// ---- Crypto helpers -------------------------------------------------------

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; KEY_LEN]> {
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| Error::Other(format!("key derivation failed: {e}")))?;
    Ok(key)
}

fn encrypt(key: &[u8; KEY_LEN], plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| Error::Other("encryption failed".into()))?;
    Ok((nonce_bytes.to_vec(), ciphertext))
}

fn decrypt(key: &[u8; KEY_LEN], nonce: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(nonce);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| Error::InvalidPassword)
}

// ---- Vault state ----------------------------------------------------------

struct Inner {
    key: Option<[u8; KEY_LEN]>,
    salt: Option<Vec<u8>>,
    data: Option<VaultData>,
}

pub struct Vault {
    path: PathBuf,
    inner: Mutex<Inner>,
}

impl Vault {
    pub fn new(path: PathBuf) -> Self {
        Vault {
            path,
            inner: Mutex::new(Inner {
                key: None,
                salt: None,
                data: None,
            }),
        }
    }

    pub fn exists(&self) -> bool {
        self.path.exists()
    }

    pub fn is_unlocked(&self) -> bool {
        self.inner.lock().unwrap().data.is_some()
    }

    pub fn init(&self, password: &str) -> Result<()> {
        if self.exists() {
            return Err(Error::AlreadyExists);
        }
        let mut salt = vec![0u8; SALT_LEN];
        rand::thread_rng().fill_bytes(&mut salt);
        let key = derive_key(password, &salt)?;
        let data = VaultData::default();

        {
            let mut guard = self.inner.lock().unwrap();
            guard.key = Some(key);
            guard.salt = Some(salt);
            guard.data = Some(data);
        }
        self.persist()
    }

    pub fn unlock(&self, password: &str) -> Result<()> {
        let raw = std::fs::read(&self.path)?;
        let file: VaultFile = serde_json::from_slice(&raw)?;
        let salt = B64
            .decode(&file.salt)
            .map_err(|e| Error::Other(e.to_string()))?;
        let nonce = B64
            .decode(&file.nonce)
            .map_err(|e| Error::Other(e.to_string()))?;
        let ciphertext = B64
            .decode(&file.ciphertext)
            .map_err(|e| Error::Other(e.to_string()))?;

        let key = derive_key(password, &salt)?;
        let plaintext = decrypt(&key, &nonce, &ciphertext)?;
        let data: VaultData = serde_json::from_slice(&plaintext)?;

        let mut guard = self.inner.lock().unwrap();
        guard.key = Some(key);
        guard.salt = Some(salt);
        guard.data = Some(data);
        Ok(())
    }

    pub fn lock(&self) {
        let mut guard = self.inner.lock().unwrap();
        if let Some(mut key) = guard.key.take() {
            key.zeroize();
        }
        guard.salt = None;
        guard.data = None;
    }

    /// Re-encrypt and write the current data to disk.
    fn persist(&self) -> Result<()> {
        let guard = self.inner.lock().unwrap();
        let key = guard.key.as_ref().ok_or(Error::Locked)?;
        let salt = guard.salt.as_ref().ok_or(Error::Locked)?;
        let data = guard.data.as_ref().ok_or(Error::Locked)?;

        let plaintext = serde_json::to_vec(data)?;
        let (nonce, ciphertext) = encrypt(key, &plaintext)?;
        let file = VaultFile {
            version: VAULT_VERSION,
            salt: B64.encode(salt),
            nonce: B64.encode(nonce),
            ciphertext: B64.encode(ciphertext),
        };
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let serialized = serde_json::to_vec_pretty(&file)?;
        std::fs::write(&self.path, serialized)?;
        Ok(())
    }

    /// Run a closure with mutable access to the data, then persist.
    fn mutate<F, T>(&self, f: F) -> Result<T>
    where
        F: FnOnce(&mut VaultData) -> Result<T>,
    {
        let result = {
            let mut guard = self.inner.lock().unwrap();
            let data = guard.data.as_mut().ok_or(Error::Locked)?;
            f(data)?
        };
        self.persist()?;
        Ok(result)
    }

    // ---- Connections ------------------------------------------------------

    pub fn list_connections(&self) -> Result<Vec<ConnectionView>> {
        let guard = self.inner.lock().unwrap();
        let data = guard.data.as_ref().ok_or(Error::Locked)?;
        Ok(data.connections.iter().map(ConnectionView::from).collect())
    }

    pub fn add_connection(&self, input: ConnectionInput) -> Result<ConnectionView> {
        let conn = Connection {
            id: Uuid::new_v4().to_string(),
            name: input.name,
            host: input.host,
            port: input.port,
            username: input.username,
            auth_method: input.auth_method,
            password: input.password,
            key_id: input.key_id,
            group: input.group,
        };
        let view = ConnectionView::from(&conn);
        self.mutate(|data| {
            data.connections.push(conn);
            Ok(())
        })?;
        Ok(view)
    }

    pub fn update_connection(&self, id: &str, input: ConnectionInput) -> Result<ConnectionView> {
        self.mutate(|data| {
            let conn = data
                .connections
                .iter_mut()
                .find(|c| c.id == id)
                .ok_or_else(|| Error::NotFound(id.to_string()))?;
            conn.name = input.name;
            conn.host = input.host;
            conn.port = input.port;
            conn.username = input.username;
            conn.auth_method = input.auth_method;
            conn.key_id = input.key_id;
            conn.group = input.group;
            // Only overwrite the password when a new one was supplied.
            if let Some(pw) = input.password {
                if !pw.is_empty() {
                    conn.password = Some(pw);
                }
            }
            Ok(ConnectionView::from(&*conn))
        })
    }

    pub fn delete_connection(&self, id: &str) -> Result<()> {
        self.mutate(|data| {
            data.connections.retain(|c| c.id != id);
            Ok(())
        })
    }

    pub fn get_connection(&self, id: &str) -> Result<Connection> {
        let guard = self.inner.lock().unwrap();
        let data = guard.data.as_ref().ok_or(Error::Locked)?;
        data.connections
            .iter()
            .find(|c| c.id == id)
            .cloned()
            .ok_or_else(|| Error::NotFound(id.to_string()))
    }

    // ---- Keys -------------------------------------------------------------

    pub fn list_keys(&self) -> Result<Vec<KeyView>> {
        let guard = self.inner.lock().unwrap();
        let data = guard.data.as_ref().ok_or(Error::Locked)?;
        Ok(data
            .keys
            .iter()
            .map(|k| KeyView {
                id: k.id.clone(),
                name: k.name.clone(),
            })
            .collect())
    }

    pub fn add_key(&self, input: KeyInput) -> Result<KeyView> {
        let key = SshKey {
            id: Uuid::new_v4().to_string(),
            name: input.name,
            private_key: input.private_key,
            passphrase: input.passphrase,
        };
        let view = KeyView {
            id: key.id.clone(),
            name: key.name.clone(),
        };
        self.mutate(|data| {
            data.keys.push(key);
            Ok(())
        })?;
        Ok(view)
    }

    pub fn delete_key(&self, id: &str) -> Result<()> {
        self.mutate(|data| {
            data.keys.retain(|k| k.id != id);
            Ok(())
        })
    }

    pub fn get_key(&self, id: &str) -> Result<SshKey> {
        let guard = self.inner.lock().unwrap();
        let data = guard.data.as_ref().ok_or(Error::Locked)?;
        data.keys
            .iter()
            .find(|k| k.id == id)
            .cloned()
            .ok_or_else(|| Error::NotFound(id.to_string()))
    }

    /// Find a key ID by its name. Returns `Ok(None)` if no key with that
    /// name exists, or `Err(Error::Locked)` when the vault is locked.
    pub fn find_key_by_name(&self, name: &str) -> Result<Option<String>> {
        let guard = self.inner.lock().unwrap();
        let data = guard.data.as_ref().ok_or(Error::Locked)?;
        Ok(data
            .keys
            .iter()
            .find(|k| k.name == name)
            .map(|k| k.id.clone()))
    }

    /// Add multiple connections in a single persist operation.
    pub fn add_connections_bulk(&self, inputs: Vec<ConnectionInput>) -> Result<usize> {
        self.mutate(|data| {
            let mut count = 0;
            for input in inputs {
                data.connections.push(Connection {
                    id: Uuid::new_v4().to_string(),
                    name: input.name,
                    host: input.host,
                    port: input.port,
                    username: input.username,
                    auth_method: input.auth_method,
                    password: input.password,
                    key_id: input.key_id,
                    group: input.group,
                });
                count += 1;
            }
            Ok(count)
        })
    }

    // ---- Backup (export / import) -----------------------------------------

    /// Serialize the whole vault (connections + keys) into a portable,
    /// password-encrypted backup blob using the same envelope as the vault.
    pub fn export_bytes(&self, password: &str) -> Result<Vec<u8>> {
        let guard = self.inner.lock().unwrap();
        let data = guard.data.as_ref().ok_or(Error::Locked)?;
        let plaintext = serde_json::to_vec(data)?;

        let mut salt = vec![0u8; SALT_LEN];
        rand::thread_rng().fill_bytes(&mut salt);
        let key = derive_key(password, &salt)?;
        let (nonce, ciphertext) = encrypt(&key, &plaintext)?;

        let file = VaultFile {
            version: VAULT_VERSION,
            salt: B64.encode(&salt),
            nonce: B64.encode(nonce),
            ciphertext: B64.encode(ciphertext),
        };
        Ok(serde_json::to_vec_pretty(&file)?)
    }

    /// Decrypt a backup blob and merge its connections + keys into the vault.
    /// Imported items get fresh ids; key references are remapped accordingly.
    /// Returns the number of connections imported.
    pub fn import_bytes(&self, data: &[u8], password: &str) -> Result<usize> {
        let file: VaultFile = serde_json::from_slice(data)
            .map_err(|_| Error::Other("not a valid s-term backup file".into()))?;
        let salt = B64
            .decode(&file.salt)
            .map_err(|e| Error::Other(e.to_string()))?;
        let nonce = B64
            .decode(&file.nonce)
            .map_err(|e| Error::Other(e.to_string()))?;
        let ciphertext = B64
            .decode(&file.ciphertext)
            .map_err(|e| Error::Other(e.to_string()))?;

        let key = derive_key(password, &salt)?;
        let plaintext = decrypt(&key, &nonce, &ciphertext)?;
        let imported: VaultData = serde_json::from_slice(&plaintext)?;

        self.mutate(|vault| {
            let mut id_map: std::collections::HashMap<String, String> =
                std::collections::HashMap::new();
            for mut k in imported.keys {
                let new_id = Uuid::new_v4().to_string();
                id_map.insert(k.id.clone(), new_id.clone());
                k.id = new_id;
                vault.keys.push(k);
            }

            let mut added = 0usize;
            for mut c in imported.connections {
                c.id = Uuid::new_v4().to_string();
                if let Some(old) = c.key_id.take() {
                    c.key_id = id_map.get(&old).cloned();
                }
                vault.connections.push(c);
                added += 1;
            }
            Ok(added)
        })
    }
}

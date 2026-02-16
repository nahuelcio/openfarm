use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::command;
use uuid::Uuid;
use directories;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMemoryInput {
    pub title: String,
    pub content: String,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "bankId", alias = "bank_id")]
    pub bank_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMemoryInput {
    pub query: String,
    #[serde(rename = "bankIds", alias = "bank_ids")]
    pub bank_ids: Option<Vec<String>>,
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryDocument {
    pub id: String,
    pub title: String,
    pub slug: String,
    #[serde(rename = "bankId", alias = "bank_id")]
    pub bank_id: String,
    pub scope: String,
    pub path: String,
    pub content: String,
    pub tags: Vec<String>,
    pub observations: Vec<MemoryObservation>,
    pub relations: Vec<MemoryRelation>,
    #[serde(rename = "createdAt", alias = "created_at")]
    pub created_at: String,
    #[serde(rename = "updatedAt", alias = "updated_at")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryObservation {
    pub kind: String,
    pub value: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryRelation {
    pub r#type: String,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryBankConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub scope: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceMemoryBinding {
    #[serde(rename = "workspaceId", alias = "workspace_id")]
    pub workspace_id: String,
    #[serde(rename = "rootPath", alias = "root_path")]
    pub root_path: String,
    #[serde(rename = "sharedBankIds", alias = "shared_bank_ids")]
    pub shared_bank_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySystemConfig {
    pub version: i32,
    #[serde(rename = "localBankPath", alias = "local_bank_path")]
    pub local_bank_path: String,
    #[serde(rename = "globalBanksRoot", alias = "global_banks_root")]
    pub global_banks_root: String,
    #[serde(rename = "multiWorkspaceEnabled", alias = "multi_workspace_enabled")]
    pub multi_workspace_enabled: bool,
    pub banks: Vec<MemoryBankConfig>,
    pub workspaces: Vec<WorkspaceMemoryBinding>,
}

fn resolve_openfarm_root() -> Result<PathBuf, String> {
    if let Ok(value) = std::env::var("OPENFARM_REPO_ROOT") {
        let candidate = PathBuf::from(value.trim());
        if candidate
            .join("packages/memory-system/src/index.ts")
            .exists()
        {
            return Ok(candidate);
        }
    }

    let mut candidates = Vec::<PathBuf>::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.to_path_buf());
        }
    }

    for candidate in candidates {
        for ancestor in candidate.ancestors() {
            let marker = ancestor.join("packages/memory-system/src/index.ts");
            if marker.exists() {
                return Ok(ancestor.to_path_buf());
            }
        }
    }

    Err(
        "Unable to locate OpenFarm root (missing packages/memory-system/src/index.ts)"
            .to_string(),
    )
}

// Helper function to get workspace root for memory data storage
fn get_workspace_root() -> Result<PathBuf, String> {
    if let Ok(value) = std::env::var("MEMORY_WORKSPACE_ROOT") {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return Ok(PathBuf::from(trimmed));
        }
    }

    match std::env::current_dir() {
        Ok(path) => Ok(path),
        Err(e) => Err(format!("Failed to resolve workspace root: {}", e)),
    }
}

fn to_js_path(path: &Path) -> String {
    path.to_string_lossy()
        .replace('\\', "\\\\")
        .replace('\'', "\\'")
}

// Helper function to execute memory system operations through Node.js (tsx loader)
fn execute_memory_operation(operation: &str, payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let workspace_root = get_workspace_root()?;
    let openfarm_root = resolve_openfarm_root()?;
    let memory_entry = openfarm_root.join("packages/memory-system/src/index.ts");
    if !memory_entry.exists() {
        return Err(format!(
            "Memory system entrypoint not found at {}",
            memory_entry.display()
        ));
    }

    // Create a temporary Bun script to execute memory operations
    let script_content = format!(
        r#"
import {{ MemoryStore }} from '{}';

async function execute() {{
  const store = new MemoryStore('{}');
  await store.initialize();
  
  const operation = '{}';
  const payload = {};
  
  try {{
    switch (operation) {{
      case 'createMemory':
        const result = await store.createMemory(payload);
        console.log(JSON.stringify(result));
        break;
      case 'readMemory':
        const memory = store.readMemory(payload.id);
        console.log(JSON.stringify(memory));
        break;
      case 'searchMemories':
        const results = store.searchMemories(payload);
        console.log(JSON.stringify(results));
        break;
      case 'listBanks':
        const banks = store.listBanks();
        console.log(JSON.stringify(banks));
        break;
      case 'attachSharedBank':
        const bank = await store.attachSharedBank(payload.bankId, payload.name);
        console.log(JSON.stringify(bank));
        break;
      case 'bindWorkspace':
        await store.bindWorkspace(payload.workspaceId, payload.rootPath, payload.sharedBankIds);
        console.log(JSON.stringify({{ success: true }}));
        break;
      case 'getWorkspaceBindings':
        const bindings = store.getWorkspaceBindings();
        console.log(JSON.stringify(bindings));
        break;
      default:
        throw new Error(`Unknown operation: ${{operation}}`);
    }}
  }} catch (error) {{
    console.error(JSON.stringify({{ error: error.message }}));
    process.exit(1);
  }} finally {{
    store.close();
  }}
}}

execute().catch(console.error);
"#,
        to_js_path(&memory_entry),
        to_js_path(&workspace_root),
        operation,
        serde_json::to_string(&payload).unwrap_or_default()
    );

    // Write script to temporary file
    let temp_script = std::env::temp_dir().join(format!(
        "openfarm-memory-{}.ts",
        Uuid::new_v4()
    ));
    std::fs::write(&temp_script, script_content)
        .map_err(|e| format!("Failed to write temporary script: {}", e))?;

    // Execute with tsx on Node.js because better-sqlite3 is unsupported in Bun runtime.
    let output = Command::new("bunx")
        .arg("tsx")
        .arg(&temp_script)
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute memory script with bunx tsx: {}. Ensure bun is installed.",
                e
            )
        })?;

    // Clean up temporary script
    let _ = std::fs::remove_file(&temp_script);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Script execution failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let payload_line = stdout
        .lines()
        .rev()
        .find(|line| !line.trim().is_empty())
        .ok_or_else(|| "Memory script produced empty output".to_string())?;
    let result: serde_json::Value = serde_json::from_str(payload_line)
        .map_err(|e| format!("Failed to parse script output: {}", e))?;

    Ok(result)
}

#[command]
pub async fn create_memory(input: CreateMemoryInput) -> Result<MemoryDocument, String> {
    let payload = serde_json::to_value(input).map_err(|e| e.to_string())?;
    let result = execute_memory_operation("createMemory", payload)?;
    
    serde_json::from_value(result)
        .map_err(|e| format!("Failed to parse memory document: {}", e))
}

#[command]
pub async fn read_memory(id: String) -> Result<Option<MemoryDocument>, String> {
    let payload = serde_json::json!({ "id": id });
    let result = execute_memory_operation("readMemory", payload)?;
    
    if result.is_null() {
        Ok(None)
    } else {
        serde_json::from_value(result)
            .map_err(|e| format!("Failed to parse memory document: {}", e))
    }
}

#[command]
pub async fn search_memories(input: SearchMemoryInput) -> Result<Vec<MemoryDocument>, String> {
    let payload = serde_json::to_value(input).map_err(|e| e.to_string())?;
    let result = execute_memory_operation("searchMemories", payload)?;
    
    serde_json::from_value(result)
        .map_err(|e| format!("Failed to parse search results: {}", e))
}

#[command]
pub async fn list_memory_banks() -> Result<Vec<MemoryBankConfig>, String> {
    let payload = serde_json::Value::Null;
    let result = execute_memory_operation("listBanks", payload)?;
    
    serde_json::from_value(result)
        .map_err(|e| format!("Failed to parse memory banks: {}", e))
}

#[command]
pub async fn attach_shared_bank(bank_id: String, name: String) -> Result<MemoryBankConfig, String> {
    let payload = serde_json::json!({ "bankId": bank_id, "name": name });
    let result = execute_memory_operation("attachSharedBank", payload)?;
    
    serde_json::from_value(result)
        .map_err(|e| format!("Failed to parse bank config: {}", e))
}

#[command]
pub async fn bind_workspace(
    workspace_id: String,
    root_path: String,
    shared_bank_ids: Vec<String>,
) -> Result<(), String> {
    let payload = serde_json::json!({
        "workspaceId": workspace_id,
        "rootPath": root_path,
        "sharedBankIds": shared_bank_ids
    });
    
    let result = execute_memory_operation("bindWorkspace", payload)?;
    
    // The operation returns { success: true } on success
    if result.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        Ok(())
    } else {
        Err("Failed to bind workspace".to_string())
    }
}

#[command]
pub async fn get_workspace_bindings() -> Result<Vec<WorkspaceMemoryBinding>, String> {
    let payload = serde_json::Value::Null;
    let result = execute_memory_operation("getWorkspaceBindings", payload)?;
    
    serde_json::from_value(result)
        .map_err(|e| format!("Failed to parse workspace bindings: {}", e))
}

#[command]
pub async fn set_multi_workspace_enabled(enabled: bool) -> Result<(), String> {
    let workspace_root = get_workspace_root()?;
    
    // For now, we'll implement this directly in Rust
    let config_path = workspace_root.join(".openfarm/memory-config.json");
    
    let mut config: MemorySystemConfig = if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config: {}", e))?
    } else {
        // Create default config
        MemorySystemConfig {
            version: 1,
            local_bank_path: workspace_root.join(".openfarm/memories").to_string_lossy().to_string(),
            global_banks_root: directories::UserDirs::new()
                .map(|uds| uds.home_dir().join(".openfarm-global/shared-banks"))
                .unwrap_or_else(|| workspace_root.join(".openfarm-global/shared-banks"))
                .to_string_lossy()
                .to_string(),
            multi_workspace_enabled: false,
            banks: vec![],
            workspaces: vec![],
        }
    };
    
    config.multi_workspace_enabled = enabled;
    
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    std::fs::create_dir_all(config_path.parent().unwrap())
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;
    
    Ok(())
}

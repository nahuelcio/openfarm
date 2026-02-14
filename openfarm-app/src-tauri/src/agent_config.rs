use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AgentProfileId {
    Codex,
    ClaudeCode,
    Opencode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfigLocation {
    pub profile_id: AgentProfileId,
    pub primary_path: String,
    pub extra_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedAgentProfile {
    pub profile_id: AgentProfileId,
    pub location: AgentConfigLocation,
    pub exists: bool,
    pub parse_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigEnvVar {
    pub key: String,
    pub value: String,
    pub is_secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigMcpServer {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: std::collections::HashMap<String, String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedAgentConfig {
    pub providers: Vec<String>,
    pub default_model: Option<String>,
    pub env_vars: Vec<ConfigEnvVar>,
    pub mcp_servers: Vec<ConfigMcpServer>,
    pub skills: Vec<String>,
    pub agents: Vec<String>,
    pub plugins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedAgentConfig {
    pub location: AgentConfigLocation,
    pub config: UnifiedAgentConfig,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfigPatchRequest {
    pub profile_id: AgentProfileId,
    pub config: UnifiedAgentConfig,
    pub expected_before_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigPatchPreview {
    pub target_path: String,
    pub before_hash: String,
    pub after_hash: String,
    pub unified_diff: String,
    pub backup_path: String,
    pub backup_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplyResult {
    pub target_path: String,
    pub success: bool,
    pub error_message: Option<String>,
    pub backup_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfigBackup {
    pub backup_id: String,
    pub profile_id: AgentProfileId,
    pub target_path: String,
    pub backup_path: String,
    pub created_at: String,
}

#[tauri::command]
pub fn detect_agent_configs() -> Result<Vec<DetectedAgentProfile>, String> {
    let mut detected = Vec::new();
    for profile in [
        AgentProfileId::Codex,
        AgentProfileId::ClaudeCode,
        AgentProfileId::Opencode,
    ] {
        let location = location_for_profile(&profile)?;
        let path = Path::new(&location.primary_path);
        let exists = path.exists();
        let parse_error = if exists {
            match fs::read_to_string(path)
                .map_err(|e| e.to_string())
                .and_then(|raw| parse_json_or_jsonc(&raw).map(|_| ()))
            {
                Ok(_) => None,
                Err(err) => Some(err),
            }
        } else {
            None
        };
        detected.push(DetectedAgentProfile {
            profile_id: profile,
            location,
            exists,
            parse_error,
        });
    }
    Ok(detected)
}

#[tauri::command]
pub fn import_agent_config(profile: AgentProfileId) -> Result<ImportedAgentConfig, String> {
    let location = location_for_profile(&profile)?;
    let primary = Path::new(&location.primary_path);
    let mut warnings = Vec::new();

    let root = if primary.exists() {
        let content = fs::read_to_string(primary).map_err(|e| e.to_string())?;
        parse_json_or_jsonc(&content)?
    } else {
        warnings
            .push("Primary config file does not exist yet. Starting with defaults.".to_string());
        Value::Object(Map::new())
    };

    let mut config = normalized_from_value(&profile, &root);

    for path in &location.extra_paths {
        let extra = Path::new(path);
        if !extra.exists() {
            continue;
        }
        if extra.is_dir() {
            let mut names = Vec::new();
            let entries = fs::read_dir(extra).map_err(|e| e.to_string())?;
            for entry in entries {
                let entry = entry.map_err(|e| e.to_string())?;
                if let Some(name) = entry.file_name().to_str() {
                    names.push(name.to_string());
                }
            }
            if path.contains("skills") {
                merge_unique(&mut config.skills, names);
            } else if path.contains("agents") {
                merge_unique(&mut config.agents, names);
            }
        } else if extra.is_file() {
            if path.ends_with("plugins/config.json") {
                if let Ok(raw) = fs::read_to_string(extra) {
                    if let Ok(json) = parse_json_or_jsonc(&raw) {
                        let plugin_names = extract_object_keys(&json);
                        merge_unique(&mut config.plugins, plugin_names);
                    }
                }
            }
        }
    }

    Ok(ImportedAgentConfig {
        location,
        config,
        warnings,
    })
}

#[tauri::command]
pub fn preview_agent_config_patch(
    changes: AgentConfigPatchRequest,
) -> Result<ConfigPatchPreview, String> {
    let location = location_for_profile(&changes.profile_id)?;
    let target = Path::new(&location.primary_path);
    let before_content = if target.exists() {
        fs::read_to_string(target).map_err(|e| e.to_string())?
    } else {
        "{}\n".to_string()
    };
    let before_hash = content_hash(&before_content);

    let root = parse_json_or_jsonc(&before_content).unwrap_or(Value::Object(Map::new()));
    let next = apply_unified_on_value(&changes.profile_id, root, &changes.config);
    let after_content = serde_json::to_string_pretty(&next).map_err(|e| e.to_string())? + "\n";
    let after_hash = content_hash(&after_content);

    let backup_id = build_backup_id(&changes.profile_id, &before_hash);
    let backup_path = backup_file_path(&backup_id)?;
    let unified_diff = build_unified_diff(&before_content, &after_content);

    Ok(ConfigPatchPreview {
        target_path: location.primary_path,
        before_hash,
        after_hash,
        unified_diff,
        backup_path: backup_path.to_string_lossy().to_string(),
        backup_id,
    })
}

#[tauri::command]
pub fn apply_agent_config_patch(changes: AgentConfigPatchRequest) -> Result<ApplyResult, String> {
    let location = location_for_profile(&changes.profile_id)?;
    let target = Path::new(&location.primary_path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let before_content = if target.exists() {
        fs::read_to_string(target).map_err(|e| e.to_string())?
    } else {
        "{}\n".to_string()
    };
    let before_hash = content_hash(&before_content);

    if let Some(expected) = &changes.expected_before_hash {
        if expected != &before_hash {
            return Ok(ApplyResult {
                target_path: location.primary_path,
                success: false,
                error_message: Some(
                    "Config changed since preview. Regenerate preview before applying.".to_string(),
                ),
                backup_id: None,
            });
        }
    }

    let backup_id = build_backup_id(&changes.profile_id, &before_hash);
    let backup_path = backup_file_path(&backup_id)?;
    if let Some(parent) = backup_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&backup_path, &before_content).map_err(|e| e.to_string())?;

    let root = parse_json_or_jsonc(&before_content).unwrap_or(Value::Object(Map::new()));
    let next = apply_unified_on_value(&changes.profile_id, root, &changes.config);
    let after_content = serde_json::to_string_pretty(&next).map_err(|e| e.to_string())? + "\n";

    if let Err(error) = fs::write(target, &after_content) {
        let _ = fs::write(target, &before_content);
        return Ok(ApplyResult {
            target_path: location.primary_path,
            success: false,
            error_message: Some(format!("Failed to write config: {error}")),
            backup_id: Some(backup_id),
        });
    }

    let metadata = AgentConfigBackup {
        backup_id: backup_id.clone(),
        profile_id: changes.profile_id,
        target_path: location.primary_path.clone(),
        backup_path: backup_path.to_string_lossy().to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    save_backup_metadata(&metadata)?;

    Ok(ApplyResult {
        target_path: location.primary_path,
        success: true,
        error_message: None,
        backup_id: Some(backup_id),
    })
}

#[tauri::command]
pub fn rollback_config_patch(backup_id: String) -> Result<ApplyResult, String> {
    let metadata = read_backup_metadata(&backup_id)?;
    let backup_content = fs::read_to_string(&metadata.backup_path).map_err(|e| e.to_string())?;
    let target = Path::new(&metadata.target_path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(target, backup_content).map_err(|e| e.to_string())?;
    Ok(ApplyResult {
        target_path: metadata.target_path,
        success: true,
        error_message: None,
        backup_id: Some(backup_id),
    })
}

#[tauri::command]
pub fn list_agent_backups(profile: AgentProfileId) -> Result<Vec<AgentConfigBackup>, String> {
    let meta_dir = backup_meta_dir()?;
    if !meta_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups = Vec::new();
    let entries = fs::read_dir(meta_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let parsed: AgentConfigBackup = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
        if parsed.profile_id == profile {
            backups.push(parsed);
        }
    }

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}

fn location_for_profile(profile: &AgentProfileId) -> Result<AgentConfigLocation, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME is not set".to_string())?;
    let location = match profile {
        AgentProfileId::Codex => AgentConfigLocation {
            profile_id: AgentProfileId::Codex,
            primary_path: format!("{home}/.codex/config.json"),
            extra_paths: vec![
                format!("{home}/.codex/skills"),
                format!("{home}/.codex/agents"),
            ],
        },
        AgentProfileId::ClaudeCode => AgentConfigLocation {
            profile_id: AgentProfileId::ClaudeCode,
            primary_path: format!("{home}/.claude/settings.json"),
            extra_paths: vec![
                format!("{home}/.claude/skills"),
                format!("{home}/.claude/agents"),
                format!("{home}/.claude/plugins/config.json"),
            ],
        },
        AgentProfileId::Opencode => AgentConfigLocation {
            profile_id: AgentProfileId::Opencode,
            primary_path: format!("{home}/.config/opencode/config.json"),
            extra_paths: vec![
                format!("{home}/.config/opencode/skills"),
                format!("{home}/.config/opencode/agents"),
            ],
        },
    };
    Ok(location)
}

fn normalized_from_value(profile: &AgentProfileId, value: &Value) -> UnifiedAgentConfig {
    let providers = value
        .get("providers")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let default_model = value
        .get("model")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            value
                .get("defaultModel")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });

    let env_obj = value
        .get("env")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();
    let mut env_vars = env_obj
        .into_iter()
        .map(|(key, value)| ConfigEnvVar {
            is_secret: is_secret_key(&key),
            key,
            value: value.as_str().unwrap_or_default().to_string(),
        })
        .collect::<Vec<_>>();
    env_vars.sort_by(|a, b| a.key.cmp(&b.key));

    let mut mcp_servers = Vec::new();
    if let Some(obj) = value.get("mcpServers").and_then(|v| v.as_object()) {
        for (name, item) in obj {
            let command = item
                .get("command")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let args = item
                .get("args")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|x| x.as_str().map(|s| s.to_string()))
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            let env = item
                .get("env")
                .and_then(|v| v.as_object())
                .map(|o| {
                    o.iter()
                        .map(|(k, v)| (k.clone(), v.as_str().unwrap_or_default().to_string()))
                        .collect::<std::collections::HashMap<_, _>>()
                })
                .unwrap_or_default();
            let enabled = item
                .get("enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            mcp_servers.push(ConfigMcpServer {
                name: name.clone(),
                command,
                args,
                env,
                enabled,
            });
        }
    }

    if let Some(obj) = value.get("mcp").and_then(|v| v.as_object()) {
        for (name, item) in obj {
            let mut command = String::new();
            let mut args = Vec::new();
            if let Some(cmd_arr) = item.get("command").and_then(|v| v.as_array()) {
                for (idx, token) in cmd_arr.iter().enumerate() {
                    if let Some(str_token) = token.as_str() {
                        if idx == 0 {
                            command = str_token.to_string();
                        } else {
                            args.push(str_token.to_string());
                        }
                    }
                }
            }
            let enabled = item
                .get("enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let env = item
                .get("env")
                .and_then(|v| v.as_object())
                .map(|o| {
                    o.iter()
                        .map(|(k, v)| (k.clone(), v.as_str().unwrap_or_default().to_string()))
                        .collect::<std::collections::HashMap<_, _>>()
                })
                .unwrap_or_default();
            mcp_servers.push(ConfigMcpServer {
                name: name.clone(),
                command,
                args,
                env,
                enabled,
            });
        }
    }

    mcp_servers.sort_by(|a, b| a.name.cmp(&b.name));
    mcp_servers.dedup_by(|a, b| a.name == b.name);

    let skills = value
        .get("skills")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let agents = value
        .get("agents")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_else(|| {
            value
                .get("agentTeams")
                .and_then(|v| v.as_object())
                .map(|obj| obj.keys().cloned().collect::<Vec<_>>())
                .unwrap_or_default()
        });

    let plugins = value
        .get("plugins")
        .and_then(|v| v.as_object())
        .map(|obj| obj.keys().cloned().collect::<Vec<_>>())
        .unwrap_or_default();

    let mut out = UnifiedAgentConfig {
        providers,
        default_model,
        env_vars,
        mcp_servers,
        skills,
        agents,
        plugins,
    };

    match profile {
        AgentProfileId::Codex => {
            if out.providers.is_empty() {
                out.providers = vec!["codex".to_string()];
            }
        }
        AgentProfileId::ClaudeCode => {
            if out.providers.is_empty() {
                out.providers = vec!["claude-code".to_string()];
            }
        }
        AgentProfileId::Opencode => {
            if out.providers.is_empty() {
                out.providers = vec!["opencode".to_string()];
            }
        }
    }

    dedupe_sorted(&mut out.skills);
    dedupe_sorted(&mut out.agents);
    dedupe_sorted(&mut out.plugins);

    out
}

fn apply_unified_on_value(
    profile: &AgentProfileId,
    mut root: Value,
    config: &UnifiedAgentConfig,
) -> Value {
    if !root.is_object() {
        root = Value::Object(Map::new());
    }
    let obj = root.as_object_mut().expect("object checked");

    obj.insert(
        "providers".to_string(),
        Value::Array(
            config
                .providers
                .iter()
                .map(|p| Value::String(p.clone()))
                .collect(),
        ),
    );

    if let Some(model) = &config.default_model {
        obj.insert("model".to_string(), Value::String(model.clone()));
        obj.insert("defaultModel".to_string(), Value::String(model.clone()));
    }

    let mut env_map = Map::new();
    for env in &config.env_vars {
        env_map.insert(env.key.clone(), Value::String(env.value.clone()));
    }
    obj.insert("env".to_string(), Value::Object(env_map));

    let mut mcp_servers_map = Map::new();
    for server in &config.mcp_servers {
        let mut item = Map::new();
        item.insert("command".to_string(), Value::String(server.command.clone()));
        item.insert(
            "args".to_string(),
            Value::Array(
                server
                    .args
                    .iter()
                    .map(|a| Value::String(a.clone()))
                    .collect(),
            ),
        );
        let mut env_item = Map::new();
        for (k, v) in &server.env {
            env_item.insert(k.clone(), Value::String(v.clone()));
        }
        item.insert("env".to_string(), Value::Object(env_item));
        item.insert("enabled".to_string(), Value::Bool(server.enabled));
        mcp_servers_map.insert(server.name.clone(), Value::Object(item));
    }
    obj.insert("mcpServers".to_string(), Value::Object(mcp_servers_map));

    let mut opencode_mcp_map = Map::new();
    for server in &config.mcp_servers {
        let mut item = Map::new();
        let mut command = vec![Value::String(server.command.clone())];
        for arg in &server.args {
            command.push(Value::String(arg.clone()));
        }
        item.insert("command".to_string(), Value::Array(command));
        item.insert("enabled".to_string(), Value::Bool(server.enabled));
        item.insert("type".to_string(), Value::String("local".to_string()));
        let mut env_item = Map::new();
        for (k, v) in &server.env {
            env_item.insert(k.clone(), Value::String(v.clone()));
        }
        if !env_item.is_empty() {
            item.insert("env".to_string(), Value::Object(env_item));
        }
        opencode_mcp_map.insert(server.name.clone(), Value::Object(item));
    }
    obj.insert("mcp".to_string(), Value::Object(opencode_mcp_map));

    obj.insert(
        "skills".to_string(),
        Value::Array(
            config
                .skills
                .iter()
                .map(|s| Value::String(s.clone()))
                .collect(),
        ),
    );

    obj.insert(
        "agents".to_string(),
        Value::Array(
            config
                .agents
                .iter()
                .map(|a| Value::String(a.clone()))
                .collect(),
        ),
    );

    let mut plugins = Map::new();
    for plugin in &config.plugins {
        plugins.insert(plugin.clone(), Value::Object(Map::new()));
    }
    obj.insert("plugins".to_string(), Value::Object(plugins));

    if matches!(profile, AgentProfileId::Opencode) {
        obj.remove("mcpServers");
    }
    if matches!(profile, AgentProfileId::Codex | AgentProfileId::ClaudeCode) {
        obj.remove("mcp");
    }

    root
}

fn parse_json_or_jsonc(input: &str) -> Result<Value, String> {
    if let Ok(value) = serde_json::from_str::<Value>(input) {
        return Ok(value);
    }
    let stripped = strip_json_comments(input);
    serde_json::from_str::<Value>(&stripped).map_err(|e| format!("Invalid JSON/JSONC: {e}"))
}

fn strip_json_comments(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;
    let mut in_string = false;
    let mut escaped = false;

    while i < chars.len() {
        let c = chars[i];
        if in_string {
            out.push(c);
            if escaped {
                escaped = false;
            } else if c == '\\' {
                escaped = true;
            } else if c == '"' {
                in_string = false;
            }
            i += 1;
            continue;
        }

        if c == '"' {
            in_string = true;
            out.push(c);
            i += 1;
            continue;
        }

        if c == '/' && i + 1 < chars.len() {
            let next = chars[i + 1];
            if next == '/' {
                i += 2;
                while i < chars.len() && chars[i] != '\n' {
                    i += 1;
                }
                continue;
            }
            if next == '*' {
                i += 2;
                while i + 1 < chars.len() {
                    if chars[i] == '*' && chars[i + 1] == '/' {
                        i += 2;
                        break;
                    }
                    i += 1;
                }
                continue;
            }
        }

        out.push(c);
        i += 1;
    }

    out
}

fn is_secret_key(key: &str) -> bool {
    let upper = key.to_ascii_uppercase();
    upper.contains("KEY")
        || upper.contains("TOKEN")
        || upper.contains("SECRET")
        || upper.contains("PASSWORD")
}

fn build_unified_diff(before: &str, after: &str) -> String {
    let mut lines = vec!["--- before".to_string(), "+++ after".to_string()];
    lines.push("@@".to_string());

    let before_lines = before.lines().collect::<Vec<_>>();
    let after_lines = after.lines().collect::<Vec<_>>();

    let max_len = before_lines.len().max(after_lines.len());
    for idx in 0..max_len {
        let old = before_lines.get(idx).copied();
        let new = after_lines.get(idx).copied();
        match (old, new) {
            (Some(left), Some(right)) if left == right => {
                lines.push(format!(" {left}"));
            }
            (Some(left), Some(right)) => {
                lines.push(format!("-{left}"));
                lines.push(format!("+{right}"));
            }
            (Some(left), None) => lines.push(format!("-{left}")),
            (None, Some(right)) => lines.push(format!("+{right}")),
            (None, None) => {}
        }
    }

    lines.join("\n")
}

fn content_hash(content: &str) -> String {
    let mut state: u64 = 1469598103934665603;
    for byte in content.as_bytes() {
        state ^= *byte as u64;
        state = state.wrapping_mul(1099511628211);
    }
    format!("{:016x}", state)
}

fn build_backup_id(profile: &AgentProfileId, before_hash: &str) -> String {
    let slug = match profile {
        AgentProfileId::Codex => "codex",
        AgentProfileId::ClaudeCode => "claude-code",
        AgentProfileId::Opencode => "opencode",
    };
    format!(
        "{slug}-{}-{}",
        chrono::Utc::now().timestamp_millis(),
        &before_hash[..8]
    )
}

fn backup_root_dir() -> Result<PathBuf, String> {
    let dir = directories::ProjectDirs::from("com", "openfarm", "desktop")
        .map(|d| d.data_dir().to_path_buf())
        .ok_or("Unable to resolve data directory".to_string())?
        .join("agent-config-backups");
    Ok(dir)
}

fn backup_file_path(backup_id: &str) -> Result<PathBuf, String> {
    Ok(backup_root_dir()?.join(format!("{backup_id}.bak")))
}

fn backup_meta_dir() -> Result<PathBuf, String> {
    Ok(backup_root_dir()?.join("meta"))
}

fn save_backup_metadata(metadata: &AgentConfigBackup) -> Result<(), String> {
    let dir = backup_meta_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.json", metadata.backup_id));
    let data = serde_json::to_string_pretty(metadata).map_err(|e| e.to_string())?;
    fs::write(path, format!("{data}\n")).map_err(|e| e.to_string())
}

fn read_backup_metadata(backup_id: &str) -> Result<AgentConfigBackup, String> {
    let path = backup_meta_dir()?.join(format!("{backup_id}.json"));
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn extract_object_keys(value: &Value) -> Vec<String> {
    value
        .as_object()
        .map(|obj| obj.keys().cloned().collect())
        .unwrap_or_default()
}

fn dedupe_sorted(items: &mut Vec<String>) {
    let mut seen = HashSet::new();
    items.retain(|item| seen.insert(item.clone()));
    items.sort();
}

fn merge_unique(target: &mut Vec<String>, incoming: Vec<String>) {
    target.extend(incoming);
    dedupe_sorted(target);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_jsonc() {
        let raw = r#"{
          // comment
          "env": {
            "OPENAI_API_KEY": "x"
          },
          /* block */
          "model": "gpt-4o"
        }"#;
        let parsed = parse_json_or_jsonc(raw).unwrap();
        assert_eq!(parsed.get("model").and_then(|v| v.as_str()), Some("gpt-4o"));
    }

    #[test]
    fn keeps_secret_flags() {
        assert!(is_secret_key("OPENAI_API_KEY"));
        assert!(is_secret_key("token"));
        assert!(!is_secret_key("MODEL"));
    }

    #[test]
    fn normalizes_codex_mcp_servers() {
        let value = serde_json::json!({
            "mcpServers": {
                "demo": {
                    "command": "npx",
                    "args": ["@playwright/mcp@latest"],
                    "enabled": true,
                    "env": {"A": "1"}
                }
            }
        });
        let normalized = normalized_from_value(&AgentProfileId::Codex, &value);
        assert_eq!(normalized.mcp_servers.len(), 1);
        assert_eq!(normalized.mcp_servers[0].name, "demo");
    }

    #[test]
    fn hash_is_stable() {
        let one = content_hash("abc");
        let two = content_hash("abc");
        assert_eq!(one, two);
    }
}

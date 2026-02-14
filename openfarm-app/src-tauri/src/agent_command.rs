#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentCommand {
    pub program: String,
    pub args: Vec<String>,
}

pub fn resolve_agent_command(provider: &str, task: &str) -> Result<AgentCommand, String> {
    let normalized = provider.trim().to_lowercase();
    let command = match normalized.as_str() {
        // Keep compatibility with current UI default.
        "external-agent" | "opencode" => AgentCommand {
            program: "opencode".to_string(),
            args: vec![task.to_string()],
        },
        "aider" => AgentCommand {
            program: "aider".to_string(),
            args: vec!["--message".to_string(), task.to_string()],
        },
        "claude" | "claude-code" => AgentCommand {
            program: "claude".to_string(),
            args: vec![task.to_string()],
        },
        "codex" => AgentCommand {
            program: "codex".to_string(),
            args: vec![task.to_string()],
        },
        _ => {
            return Err(format!(
                "Unsupported provider '{}'. Supported: opencode, aider, claude, codex",
                provider
            ));
        }
    };

    Ok(command)
}

#[cfg(test)]
mod tests {
    use super::resolve_agent_command;

    #[test]
    fn resolves_external_agent_as_opencode() {
        let resolved = resolve_agent_command("external-agent", "fix test").unwrap();
        assert_eq!(resolved.program, "opencode");
        assert_eq!(resolved.args, vec!["fix test"]);
    }

    #[test]
    fn resolves_aider_with_message_flag() {
        let resolved = resolve_agent_command("aider", "implement feature").unwrap();
        assert_eq!(resolved.program, "aider");
        assert_eq!(resolved.args, vec!["--message", "implement feature"]);
    }

    #[test]
    fn resolves_codex() {
        let resolved = resolve_agent_command("codex", "write tests").unwrap();
        assert_eq!(resolved.program, "codex");
        assert_eq!(resolved.args, vec!["write tests"]);
    }

    #[test]
    fn rejects_unknown_provider() {
        let err = resolve_agent_command("unknown", "task").unwrap_err();
        assert!(err.contains("Unsupported provider"));
    }
}

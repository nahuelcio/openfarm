#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentCommand {
    pub program: String,
    pub args: Vec<String>,
}

pub fn resolve_agent_command(
    provider: &str,
    task: &str,
    model: Option<&str>,
    agent_mode: Option<&str>,
) -> Result<AgentCommand, String> {
    let normalized = provider.trim().to_lowercase();
    let command = match normalized.as_str() {
        // Keep compatibility with current UI default.
        "external-agent" | "opencode" => {
            let mut args = vec![
                "run".to_string(),
                "--format".to_string(),
                "json".to_string(),
            ];
            if let Some(value) = model.map(|item| item.trim()).filter(|item| !item.is_empty()) {
                args.push("--model".to_string());
                args.push(value.to_string());
            }
            if let Some(value) = agent_mode
                .map(|item| item.trim())
                .filter(|item| !item.is_empty() && *item != "general")
            {
                args.push("--agent".to_string());
                args.push(value.to_string());
            }
            args.push(task.to_string());
            AgentCommand {
                program: "opencode".to_string(),
                args,
            }
        }
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
        let resolved = resolve_agent_command("external-agent", "fix test", None, None).unwrap();
        assert_eq!(resolved.program, "opencode");
        assert_eq!(
            resolved.args,
            vec![
                "run".to_string(),
                "--format".to_string(),
                "json".to_string(),
                "fix test".to_string()
            ]
        );
    }

    #[test]
    fn resolves_opencode_with_model_and_mode() {
        let resolved = resolve_agent_command(
            "opencode",
            "fix test",
            Some("openrouter/gpt-5"),
            Some("plan"),
        )
        .unwrap();
        assert_eq!(resolved.program, "opencode");
        assert_eq!(
            resolved.args,
            vec![
                "run".to_string(),
                "--format".to_string(),
                "json".to_string(),
                "--model".to_string(),
                "openrouter/gpt-5".to_string(),
                "--agent".to_string(),
                "plan".to_string(),
                "fix test".to_string()
            ]
        );
    }

    #[test]
    fn resolves_aider_with_message_flag() {
        let resolved = resolve_agent_command("aider", "implement feature", None, None).unwrap();
        assert_eq!(resolved.program, "aider");
        assert_eq!(resolved.args, vec!["--message", "implement feature"]);
    }

    #[test]
    fn resolves_codex() {
        let resolved = resolve_agent_command("codex", "write tests", None, None).unwrap();
        assert_eq!(resolved.program, "codex");
        assert_eq!(resolved.args, vec!["write tests"]);
    }

    #[test]
    fn rejects_unknown_provider() {
        let err = resolve_agent_command("unknown", "task", None, None).unwrap_err();
        assert!(err.contains("Unsupported provider"));
    }
}

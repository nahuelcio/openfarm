#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentCommand {
    pub program: String,
    pub args: Vec<String>,
}

// Model capabilities mapping - should match the TypeScript implementation
fn get_model_reasoning_capabilities(model: &str) -> Vec<&'static str> {
    match model {
        "gpt-5.3-codex" => vec!["low", "medium", "high", "xhigh"],
        "gpt-5.2-codex" => vec!["low", "medium", "high"],
        "gpt-5.1-codex" => vec!["low", "medium", "high"],
        "gpt-5.1-codex-mini" => vec!["low", "medium", "high"],
        _ => vec!["low", "medium", "high"], // fallback
    }
}

fn validate_reasoning_effort(model: &str, effort: &str) -> bool {
    let capabilities = get_model_reasoning_capabilities(model);
    capabilities.contains(&effort)
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
        "codex" => {
            let mut args = vec![
                "exec".to_string(),
                "--json".to_string(),
                "-s".to_string(),
                "workspace-write".to_string(),
            ];
            if let Some(value) = model.map(|item| item.trim()).filter(|item| !item.is_empty()) {
                args.push("--model".to_string());
                args.push(value.to_string());
            }
            if let Some(value) = agent_mode
                .map(|item| item.trim())
                .filter(|item| !item.is_empty())
            {
                let lower = value.to_lowercase();
                if lower != "general" && lower != "default" && lower != "defaultmodel" {
                    if let Some(reasoning) = lower.strip_prefix("reasoning:") {
                        if !reasoning.trim().is_empty() {
                            // Validate reasoning effort against model capabilities
                            if validate_reasoning_effort(model.unwrap_or("gpt-5.3-codex"), reasoning.trim()) {
                                args.push("-c".to_string());
                                args.push(format!("model_reasoning_effort={}", reasoning.trim()));
                            } else {
                                // Fall back to profile mode for unsupported effort
                                args.push("--profile".to_string());
                                args.push(value.to_string());
                            }
                        }
                    } else if let Some(profile) = value.strip_prefix("profile:") {
                        if !profile.trim().is_empty() {
                            args.push("--profile".to_string());
                            args.push(profile.trim().to_string());
                        }
                    } else if validate_reasoning_effort(model.unwrap_or("gpt-5.3-codex"), &lower) {
                        args.push("-c".to_string());
                        args.push(format!("model_reasoning_effort={}", lower));
                    } else {
                        args.push("--profile".to_string());
                        args.push(value.to_string());
                    }
                }
            }
            args.push(task.to_string());
            AgentCommand {
                program: "codex".to_string(),
                args,
            }
        }
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
        assert_eq!(
            resolved.args,
            vec![
                "exec".to_string(),
                "--json".to_string(),
                "-s".to_string(),
                "workspace-write".to_string(),
                "write tests".to_string()
            ]
        );
    }

    #[test]
    fn resolves_codex_with_model_and_reasoning() {
        let resolved = resolve_agent_command(
            "codex",
            "write tests",
            Some("gpt-5.3-codex"),
            Some("reasoning:xhigh"),
        )
        .unwrap();
        assert_eq!(resolved.program, "codex");
        assert_eq!(
            resolved.args,
            vec![
                "exec".to_string(),
                "--json".to_string(),
                "-s".to_string(),
                "workspace-write".to_string(),
                "--model".to_string(),
                "gpt-5.3-codex".to_string(),
                "-c".to_string(),
                "model_reasoning_effort=xhigh".to_string(),
                "write tests".to_string()
            ]
        );
    }

    #[test]
    fn resolves_codex_with_limited_model_rejects_xhigh() {
        let resolved = resolve_agent_command(
            "codex",
            "write tests",
            Some("gpt-5.1-codex-mini"),
            Some("reasoning:xhigh"),
        );
        // This should not error out, but should fall back to profile mode
        assert!(resolved.is_ok());
        let command = resolved.unwrap();
        assert_eq!(command.program, "codex");
        // Should use profile mode instead of reasoning for unsupported effort
        assert!(command.args.contains(&"--profile".to_string()));
        assert!(command.args.contains(&"reasoning:xhigh".to_string()));
    }

    #[test]
    fn resolves_codex_with_profile_mode() {
        let resolved =
            resolve_agent_command("codex", "write tests", None, Some("atlas")).unwrap();
        assert_eq!(resolved.program, "codex");
        assert_eq!(
            resolved.args,
            vec![
                "exec".to_string(),
                "--json".to_string(),
                "-s".to_string(),
                "workspace-write".to_string(),
                "--profile".to_string(),
                "atlas".to_string(),
                "write tests".to_string()
            ]
        );
    }

    #[test]
    fn rejects_unknown_provider() {
        let err = resolve_agent_command("unknown", "task", None, None).unwrap_err();
        assert!(err.contains("Unsupported provider"));
    }
}

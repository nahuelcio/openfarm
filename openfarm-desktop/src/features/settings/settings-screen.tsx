import { useMemo, useState } from "react";
import type {
	AgentProfileId,
	AppViewModel,
	ConfigEnvVar,
	ConfigMcpServer,
	UnifiedAgentConfig,
} from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface SettingsScreenProps {
	vm: AppViewModel;
}

type SettingsTab = "providers" | "env" | "mcp" | "skills" | "agents";

const TAB_LABELS: Record<SettingsTab, string> = {
	providers: "Providers & Models",
	env: "Secrets & Env",
	mcp: "MCP",
	skills: "Skills",
	agents: "Agents",
};

function emptyConfig(profile: AgentProfileId): UnifiedAgentConfig {
	return {
		providers: [profile],
		default_model: null,
		env_vars: [],
		mcp_servers: [],
		skills: [],
		agents: [],
		plugins: [],
	};
}

function profileLabel(profile: AgentProfileId): string {
	if (profile === "claude-code") {
		return "Claude Code";
	}
	if (profile === "opencode") {
		return "OpenCode";
	}
	return "Codex";
}

export function SettingsScreen({ vm }: SettingsScreenProps) {
	const [tab, setTab] = useState<SettingsTab>("providers");
	const [envQuery, setEnvQuery] = useState("");
	const [mcpQuery, setMcpQuery] = useState("");
	const [showOnlySecrets, setShowOnlySecrets] = useState(false);
	const [diffCopied, setDiffCopied] = useState(false);
	const profile = vm.settingsProfile;
	const config = vm.agentConfigState[profile] || emptyConfig(profile);
	const patch = vm.pendingPatches[profile];
	const backups = vm.agentConfigBackups[profile] || [];

	const detectionMap = useMemo(() => {
		return new Map(vm.detectedProfiles.map((item) => [item.profile_id, item]));
	}, [vm.detectedProfiles]);
	const detection = detectionMap.get(profile);
	const isImported = Boolean(vm.agentConfigState[profile]);
	const canEdit = isImported;
	const canPreview = isImported;
	const canApply = isImported && Boolean(patch);
	const steps = [
		{ label: "Seleccionar", done: true },
		{ label: "Detectar", done: Boolean(detection) },
		{ label: "Importar", done: isImported },
		{ label: "Preview", done: Boolean(patch) },
		{ label: "Aplicar", done: false },
	];
	const tabCounters: Record<SettingsTab, number> = {
		providers: config.providers.length,
		env: config.env_vars.length,
		mcp: config.mcp_servers.length,
		skills: config.skills.length,
		agents: config.agents.length,
	};
	const filteredEnvItems = useMemo(() => {
		return config.env_vars
			.map((env, index) => ({ env, index }))
			.filter(({ env }) => {
				if (showOnlySecrets && !env.is_secret) {
					return false;
				}
				const query = envQuery.trim().toLowerCase();
				if (!query) {
					return true;
				}
				return (
					env.key.toLowerCase().includes(query) ||
					env.value.toLowerCase().includes(query)
				);
			});
	}, [config.env_vars, envQuery, showOnlySecrets]);
	const filteredMcpItems = useMemo(() => {
		return config.mcp_servers
			.map((server, index) => ({ server, index }))
			.filter(({ server }) => {
				const query = mcpQuery.trim().toLowerCase();
				if (!query) {
					return true;
				}
				return (
					server.name.toLowerCase().includes(query) ||
					server.command.toLowerCase().includes(query) ||
					(server.args || []).join(" ").toLowerCase().includes(query)
				);
			});
	}, [config.mcp_servers, mcpQuery]);
	const diffLineCount = patch?.unified_diff.split("\n").length || 0;

	function updateConfig(next: UnifiedAgentConfig) {
		vm.setAgentConfig(profile, next);
	}

	function updateEnv(index: number, patchValue: Partial<ConfigEnvVar>) {
		const envVars = config.env_vars.map((item, itemIndex) =>
			itemIndex === index ? { ...item, ...patchValue } : item,
		);
		updateConfig({ ...config, env_vars: envVars });
	}

	function updateMcp(index: number, patchValue: Partial<ConfigMcpServer>) {
		const mcpServers = config.mcp_servers.map((item, itemIndex) =>
			itemIndex === index ? { ...item, ...patchValue } : item,
		);
		updateConfig({ ...config, mcp_servers: mcpServers });
	}

	return (
		<PageShell
			onBack={() => vm.setView("dashboard")}
			title="Settings / Control Center"
		>
			<div className="settings-panel">
				<div className="settings-guide">
					<strong>Flujo recomendado:</strong> 1) Elegí agente, 2) Detect/Import,
					3) Editá secciones, 4) Preview Patch, 5) Apply.
				</div>
				<div className="settings-steps">
					{steps.map((step) => (
						<div
							className={step.done ? "settings-step done" : "settings-step"}
							key={step.label}
						>
							<span>{step.label}</span>
						</div>
					))}
				</div>

				{vm.settingsError ? (
					<p className="settings-error">{vm.settingsError}</p>
				) : null}
				{vm.applyStatus ? (
					<p className="settings-ok">{vm.applyStatus}</p>
				) : null}
				{detection?.parse_error ? (
					<p className="settings-error">
						Error parseando archivo detectado: {detection.parse_error}
					</p>
				) : null}

				<div className="settings-layout">
					<aside className="settings-sidebar">
						<div className="form-card">
							<h3>1. Agente objetivo</h3>
							<div className="settings-profile-list">
								{(["codex", "claude-code", "opencode"] as AgentProfileId[]).map(
									(item) => {
										const detection = detectionMap.get(item);
										const stateLabel = detection
											? detection.exists
												? "detectado"
												: "no encontrado"
											: "sin verificar";
										return (
											<button
												className={
													item === profile
														? "settings-profile-card active"
														: "settings-profile-card"
												}
												key={item}
												onClick={() => vm.setSettingsProfile(item)}
												type="button"
											>
												<span>{profileLabel(item)}</span>
												<span className="settings-muted">{stateLabel}</span>
											</button>
										);
									},
								)}
							</div>
						</div>

						<div className="form-card">
							<h3>2. Importación</h3>
							<p className="settings-muted">
								Leé configuración actual desde archivos locales.
							</p>
							<p className="settings-path">
								{detection?.location.primary_path}
							</p>
							<div className="settings-actions-col">
								<button
									className="btn-secondary"
									onClick={vm.detectAgentConfigs}
									type="button"
								>
									Detect
								</button>
								<button
									className="btn-secondary"
									onClick={() => vm.importAgentConfigs(profile)}
									type="button"
								>
									Import
								</button>
							</div>
						</div>

						<div className="form-card">
							<h3>3. Publicar cambios</h3>
							<p className="settings-muted">
								Siempre generá preview antes de aplicar.
							</p>
							<div className="settings-actions-col">
								<button
									className="btn-secondary"
									disabled={!canPreview}
									onClick={() => vm.buildConfigPatchPreview(profile)}
									type="button"
								>
									Preview Patch
								</button>
								<button
									className="btn-primary"
									disabled={!canApply}
									onClick={() => vm.applyConfigPatch(profile)}
									type="button"
								>
									Apply
								</button>
							</div>
						</div>

						<div className="list-card">
							<h3>Backups ({backups.length})</h3>
							{backups.length === 0 ? (
								<p className="empty">Sin backups para este agente.</p>
							) : (
								backups.slice(0, 5).map((item) => (
									<div className="list-item" key={item.backup_id}>
										<div className="list-item-content">
											<span className="list-item-title">{item.backup_id}</span>
											<span className="list-item-subtitle">
												{item.created_at}
											</span>
										</div>
										<button
											className="btn-secondary"
											onClick={() => vm.rollbackConfigPatch(item.backup_id)}
											type="button"
										>
											Rollback
										</button>
									</div>
								))
							)}
						</div>
					</aside>

					<section className="settings-content">
						<div className="settings-summary-row">
							<div className="settings-summary-item">
								<span>Providers</span>
								<strong>{config.providers.length}</strong>
							</div>
							<div className="settings-summary-item">
								<span>Env vars</span>
								<strong>{config.env_vars.length}</strong>
							</div>
							<div className="settings-summary-item">
								<span>MCP</span>
								<strong>{config.mcp_servers.length}</strong>
							</div>
							<div className="settings-summary-item">
								<span>Skills</span>
								<strong>{config.skills.length}</strong>
							</div>
							<div className="settings-summary-item">
								<span>Agents</span>
								<strong>{config.agents.length}</strong>
							</div>
						</div>

						<div className="settings-tabs">
							{(Object.keys(TAB_LABELS) as SettingsTab[]).map((item) => (
								<button
									className={
										item === tab
											? "icon-btn active settings-tab"
											: "icon-btn settings-tab"
									}
									disabled={!canEdit}
									key={item}
									onClick={() => setTab(item)}
									type="button"
								>
									{TAB_LABELS[item]} ({tabCounters[item]})
								</button>
							))}
						</div>

						{tab === "providers" ? (
							<div className="form-card">
								<h3>Providers & Model</h3>
								<label htmlFor="settings-providers">
									Providers (separados por coma)
								</label>
								<input
									disabled={!canEdit}
									id="settings-providers"
									onChange={(event) =>
										updateConfig({
											...config,
											providers: event.target.value
												.split(",")
												.map((value) => value.trim())
												.filter(Boolean),
										})
									}
									type="text"
									value={config.providers.join(", ")}
								/>
								<label htmlFor="settings-model">Modelo por defecto</label>
								<input
									disabled={!canEdit}
									id="settings-model"
									onChange={(event) =>
										updateConfig({
											...config,
											default_model: event.target.value.trim() || null,
										})
									}
									type="text"
									value={config.default_model || ""}
								/>
							</div>
						) : null}

						{tab === "env" ? (
							<div className="list-card">
								<h3>Secrets & Env</h3>
								<div className="settings-inline-filters">
									<input
										onChange={(event) => setEnvQuery(event.target.value)}
										placeholder="Buscar por key o value..."
										type="text"
										value={envQuery}
									/>
									<button
										className={showOnlySecrets ? "icon-btn active" : "icon-btn"}
										onClick={() => setShowOnlySecrets((prev) => !prev)}
										type="button"
									>
										Solo secrets
									</button>
								</div>
								{filteredEnvItems.map(({ env, index }) => (
									<div
										className="settings-grid-row"
										key={`${env.key}-${index}`}
									>
										<input
											disabled={!canEdit}
											onChange={(event) =>
												updateEnv(index, { key: event.target.value })
											}
											placeholder="KEY"
											type="text"
											value={env.key}
										/>
										<input
											disabled={!canEdit}
											onChange={(event) =>
												updateEnv(index, { value: event.target.value })
											}
											placeholder="VALUE"
											type={env.is_secret ? "password" : "text"}
											value={env.value}
										/>
										<button
											className="icon-btn"
											disabled={!canEdit}
											onClick={() =>
												updateEnv(index, { is_secret: !env.is_secret })
											}
											type="button"
										>
											{env.is_secret ? "Secret" : "Public"}
										</button>
										<button
											className="delete-btn"
											disabled={!canEdit}
											onClick={() =>
												updateConfig({
													...config,
													env_vars: config.env_vars.filter(
														(_, itemIndex) => itemIndex !== index,
													),
												})
											}
											type="button"
										>
											Delete
										</button>
									</div>
								))}
								{filteredEnvItems.length === 0 ? (
									<p className="settings-muted">
										No hay variables que coincidan con el filtro.
									</p>
								) : null}
								<button
									disabled={!canEdit}
									onClick={() =>
										updateConfig({
											...config,
											env_vars: [
												...config.env_vars,
												{ key: "", value: "", is_secret: true },
											],
										})
									}
									type="button"
								>
									Add Env
								</button>
							</div>
						) : null}

						{tab === "mcp" ? (
							<div className="list-card">
								<h3>MCP Servers</h3>
								<div className="settings-inline-filters">
									<input
										onChange={(event) => setMcpQuery(event.target.value)}
										placeholder="Buscar por nombre/comando..."
										type="text"
										value={mcpQuery}
									/>
								</div>
								{filteredMcpItems.map(({ server, index }) => (
									<div
										className="settings-mcp-card"
										key={`${server.name}-${index}`}
									>
										<input
											disabled={!canEdit}
											onChange={(event) =>
												updateMcp(index, { name: event.target.value })
											}
											placeholder="Name"
											type="text"
											value={server.name}
										/>
										<input
											disabled={!canEdit}
											onChange={(event) =>
												updateMcp(index, {
													command: event.target.value,
												})
											}
											placeholder="Command"
											type="text"
											value={server.command}
										/>
										<input
											disabled={!canEdit}
											onChange={(event) =>
												updateMcp(index, {
													args: event.target.value
														.split(" ")
														.map((value) => value.trim())
														.filter(Boolean),
												})
											}
											placeholder="Args (space-separated)"
											type="text"
											value={server.args.join(" ")}
										/>
										<div className="settings-actions-row">
											<button
												className="icon-btn"
												disabled={!canEdit}
												onClick={() =>
													updateMcp(index, {
														enabled: !server.enabled,
													})
												}
												type="button"
											>
												{server.enabled ? "Enabled" : "Disabled"}
											</button>
											<button
												className="delete-btn"
												disabled={!canEdit}
												onClick={() =>
													updateConfig({
														...config,
														mcp_servers: config.mcp_servers.filter(
															(_, itemIndex) => itemIndex !== index,
														),
													})
												}
												type="button"
											>
												Delete
											</button>
										</div>
									</div>
								))}
								{filteredMcpItems.length === 0 ? (
									<p className="settings-muted">
										No hay MCP servers que coincidan con el filtro.
									</p>
								) : null}
								<button
									disabled={!canEdit}
									onClick={() =>
										updateConfig({
											...config,
											mcp_servers: [
												...config.mcp_servers,
												{
													name: "",
													command: "",
													args: [],
													env: {},
													enabled: true,
												},
											],
										})
									}
									type="button"
								>
									Add MCP
								</button>
							</div>
						) : null}

						{tab === "skills" ? (
							<div className="form-card">
								<h3>Skills</h3>
								<p className="settings-muted">Una skill por línea.</p>
								<textarea
									disabled={!canEdit}
									onChange={(event) =>
										updateConfig({
											...config,
											skills: event.target.value
												.split("\n")
												.map((value) => value.trim())
												.filter(Boolean),
										})
									}
									rows={8}
									value={config.skills.join("\n")}
								/>
							</div>
						) : null}

						{tab === "agents" ? (
							<div className="form-card">
								<h3>Agents & Plugins</h3>
								<label htmlFor="settings-agents">Agents (uno por línea)</label>
								<textarea
									disabled={!canEdit}
									id="settings-agents"
									onChange={(event) =>
										updateConfig({
											...config,
											agents: event.target.value
												.split("\n")
												.map((value) => value.trim())
												.filter(Boolean),
										})
									}
									rows={6}
									value={config.agents.join("\n")}
								/>
								<label htmlFor="settings-plugins">
									Plugins (uno por línea)
								</label>
								<textarea
									disabled={!canEdit}
									id="settings-plugins"
									onChange={(event) =>
										updateConfig({
											...config,
											plugins: event.target.value
												.split("\n")
												.map((value) => value.trim())
												.filter(Boolean),
										})
									}
									rows={6}
									value={config.plugins.join("\n")}
								/>
							</div>
						) : null}

						<div className="diff-viewer">
							<h3>Patch Preview</h3>
							<div className="settings-preview-toolbar">
								<span className="settings-muted">
									{patch
										? `${diffLineCount} líneas de diff`
										: "Sin preview generado"}
								</span>
								<button
									className="icon-btn"
									disabled={!patch}
									onClick={async () => {
										if (!patch) {
											return;
										}
										await navigator.clipboard.writeText(patch.unified_diff);
										setDiffCopied(true);
										setTimeout(() => setDiffCopied(false), 1200);
									}}
									type="button"
								>
									{diffCopied ? "Copiado" : "Copiar diff"}
								</button>
							</div>
							{!patch ? (
								<p className="settings-muted">
									Todavía no hay patch. Tocá "Preview Patch" para ver el diff.
								</p>
							) : (
								<>
									<p className="settings-muted">
										Target: {patch.target_path} · backup: {patch.backup_id}
									</p>
									<pre>{patch.unified_diff}</pre>
								</>
							)}
						</div>
						{!canEdit ? (
							<div className="settings-blocker">
								Primero ejecutá <strong>Import</strong> para habilitar edición y
								preview.
							</div>
						) : null}
						<div className="settings-sticky-actions">
							<button
								className="btn-secondary"
								onClick={vm.detectAgentConfigs}
								type="button"
							>
								Detect
							</button>
							<button
								className="btn-secondary"
								onClick={() => vm.importAgentConfigs(profile)}
								type="button"
							>
								Import
							</button>
							<button
								className="btn-secondary"
								disabled={!canPreview}
								onClick={() => vm.buildConfigPatchPreview(profile)}
								type="button"
							>
								Preview Patch
							</button>
							<button
								className="btn-primary"
								disabled={!canApply}
								onClick={() => vm.applyConfigPatch(profile)}
								type="button"
							>
								Apply
							</button>
						</div>
					</section>
				</div>

				{vm.settingsLoading ? (
					<p className="settings-muted">Procesando cambios...</p>
				) : null}
			</div>
		</PageShell>
	);
}

import type { AppViewModel } from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface WorkspacesScreenProps {
	vm: AppViewModel;
}

export function WorkspacesScreen({ vm }: WorkspacesScreenProps) {
	const filteredWorkspaces = vm.workspaces.filter((workspace) => {
		const repoPath = workspace.repoPath || "";
		const repoMatches = repoPath
			.toLowerCase()
			.includes(vm.workspaceRepoFilter.toLowerCase());
		const statusMatches =
			vm.workspaceStatusFilter === "all" ||
			workspace.status === vm.workspaceStatusFilter;
		return repoMatches && statusMatches;
	});

	const canCreateWorkspace =
		vm.newWorkspaceName.trim() && vm.newWorkspaceRepoPath.trim();

	return (
		<PageShell
			onBack={() => vm.setView("dashboard")}
			title="Espacios de Trabajo"
		>
			<div className="form-card">
				<h3>Crear Espacio</h3>
				<p className="list-item-subtitle">
					Un espacio es la carpeta donde el asistente va a trabajar.
				</p>
				<div className="field-row">
					<input
						onChange={(event) => vm.setNewWorkspaceName(event.target.value)}
						placeholder="Nombre (ej: Tienda Web)"
						type="text"
						value={vm.newWorkspaceName}
					/>
					<input
						onChange={(event) => vm.setNewWorkspaceRepoPath(event.target.value)}
						placeholder="Ruta de la carpeta del proyecto"
						type="text"
						value={vm.newWorkspaceRepoPath}
					/>
				</div>
				<div className="field-row">
					<input
						onChange={(event) =>
							vm.setNewWorkspaceBranchName(event.target.value)
						}
						placeholder="Rama (opcional, por defecto: main)"
						type="text"
						value={vm.newWorkspaceBranchName}
					/>
					<button
						disabled={!canCreateWorkspace}
						onClick={vm.addWorkspace}
						type="button"
					>
						Crear Espacio
					</button>
				</div>
			</div>
			<div className="list-card">
				<h3>Espacios Guardados</h3>
				<input
					onChange={(event) => vm.setWorkspaceRepoFilter(event.target.value)}
					placeholder="Buscar por ruta"
					type="text"
					value={vm.workspaceRepoFilter}
				/>
				<select
					onChange={(event) =>
						vm.setWorkspaceStatusFilter(
							event.target.value as "all" | "active" | "archived",
						)
					}
					value={vm.workspaceStatusFilter}
				>
					<option value="all">Todos</option>
					<option value="active">Activos</option>
					<option value="archived">Archivados</option>
				</select>
				{vm.workspaces.length === 0 ? (
					<p className="empty">Todavía no creaste espacios.</p>
				) : filteredWorkspaces.length === 0 ? (
					<p className="empty">No hay resultados con ese filtro.</p>
				) : (
					filteredWorkspaces.map((workspace) => (
						<div className="list-item" key={workspace.id}>
							<div className="list-item-content">
								<span className="list-item-title">
									{workspace.name} ({workspace.status})
								</span>
								<span className="list-item-subtitle">
									{workspace.repoPath || "(no repo path)"} ·{" "}
									{workspace.branchName || "main"} ·{" "}
									{workspace.sourceType || "branch"}
									{workspace.sourceRef ? `:${workspace.sourceRef}` : ""}
								</span>
								<span className="list-item-subtitle">
									Modo de ejecución:{" "}
									{vm.workspaceScripts[workspace.id]?.run_mode || "concurrent"}
								</span>
								<span className="list-item-subtitle">
									Tareas pendientes:{" "}
									{
										(vm.workspaceTodos[workspace.id] || []).filter(
											(todo) => !todo.completed,
										).length
									}
								</span>
								<span className="list-item-subtitle">
									Spotlight:{" "}
									{workspace.spotlightEnabled ? "activo" : "inactivo"}
									{workspace.spotlightSyncedAt
										? ` · último sync ${new Date(workspace.spotlightSyncedAt).toLocaleString()}`
										: ""}
								</span>
								<input
									onChange={(event) =>
										vm.setNewWorkspaceTodo((prev) => ({
											...prev,
											[workspace.id]: event.target.value,
										}))
									}
									placeholder="Nueva tarea corta (opcional)"
									type="text"
									value={vm.newWorkspaceTodo[workspace.id] || ""}
								/>
								<button
									className="icon-btn"
									onClick={() => vm.addWorkspaceTodo(workspace.id)}
									type="button"
								>
									Agregar Tarea
								</button>
								{(vm.workspaceTodos[workspace.id] || []).map((todo) => (
									<div className="todo-item" key={todo.id}>
										<input
											checked={todo.completed}
											onChange={(event) =>
												vm.toggleWorkspaceTodo(
													workspace.id,
													todo.id,
													event.target.checked,
												)
											}
											type="checkbox"
										/>
										<span>{todo.title}</span>
										<button
											className="icon-btn"
											onClick={() =>
												vm.deleteWorkspaceTodo(workspace.id, todo.id)
											}
											type="button"
										>
											Eliminar Tarea
										</button>
									</div>
								))}
								<input
									onBlur={(event) =>
										vm.setWorkspaceScriptConfig(workspace.id, {
											setup_script: event.target.value || undefined,
										})
									}
									onChange={(event) =>
										vm.setWorkspaceScripts((prev) => ({
											...prev,
											[workspace.id]: {
												...prev[workspace.id],
												workspace_id: workspace.id,
												run_mode: prev[workspace.id]?.run_mode || "concurrent",
												updated_at: prev[workspace.id]?.updated_at || "",
												setup_script: event.target.value,
											},
										}))
									}
									placeholder="comando de preparación (opcional)"
									type="text"
									value={vm.workspaceScripts[workspace.id]?.setup_script || ""}
								/>
								<input
									onBlur={(event) =>
										vm.setWorkspaceScriptConfig(workspace.id, {
											run_script: event.target.value || undefined,
										})
									}
									onChange={(event) =>
										vm.setWorkspaceScripts((prev) => ({
											...prev,
											[workspace.id]: {
												...prev[workspace.id],
												workspace_id: workspace.id,
												run_mode: prev[workspace.id]?.run_mode || "concurrent",
												updated_at: prev[workspace.id]?.updated_at || "",
												run_script: event.target.value,
											},
										}))
									}
									placeholder="comando principal (opcional)"
									type="text"
									value={vm.workspaceScripts[workspace.id]?.run_script || ""}
								/>
								<input
									onBlur={(event) =>
										vm.setWorkspaceScriptConfig(workspace.id, {
											archive_script: event.target.value || undefined,
										})
									}
									onChange={(event) =>
										vm.setWorkspaceScripts((prev) => ({
											...prev,
											[workspace.id]: {
												...prev[workspace.id],
												workspace_id: workspace.id,
												run_mode: prev[workspace.id]?.run_mode || "concurrent",
												updated_at: prev[workspace.id]?.updated_at || "",
												archive_script: event.target.value,
											},
										}))
									}
									placeholder="comando de cierre (opcional)"
									type="text"
									value={
										vm.workspaceScripts[workspace.id]?.archive_script || ""
									}
								/>
								<select
									onChange={(event) => {
										const nextRunMode =
											event.target.value === "nonconcurrent"
												? "nonconcurrent"
												: "concurrent";
										vm.setWorkspaceScripts((prev) => ({
											...prev,
											[workspace.id]: {
												workspace_id: workspace.id,
												setup_script: prev[workspace.id]?.setup_script,
												run_script: prev[workspace.id]?.run_script,
												archive_script: prev[workspace.id]?.archive_script,
												run_mode: nextRunMode,
												updated_at: prev[workspace.id]?.updated_at || "",
											},
										}));
										vm.setWorkspaceScriptConfig(workspace.id, {
											run_mode: nextRunMode,
										});
									}}
									value={
										vm.workspaceScripts[workspace.id]?.run_mode || "concurrent"
									}
								>
									<option value="concurrent">Paralelo</option>
									<option value="nonconcurrent">De a uno</option>
								</select>
								{vm.workspaceScriptOutput[workspace.id] && (
									<pre>{vm.workspaceScriptOutput[workspace.id]}</pre>
								)}
							</div>
							<div className="list-item-actions">
								<button
									className="icon-btn"
									disabled={workspace.status === "archived"}
									onClick={() => {
										vm.setWorkspaceInput(workspace.repoPath || "");
										vm.setSelectedWorkspaceId(workspace.id);
										vm.setView("spawn");
									}}
									type="button"
								>
									Trabajar Aquí
								</button>
								<button
									className="icon-btn"
									onClick={() => vm.openWorkspaceInIde(workspace.id)}
									type="button"
								>
									Abrir Carpeta
								</button>
								{workspace.spotlightEnabled ? (
									<button
										className="icon-btn"
										onClick={() => vm.disableWorkspaceSpotlight(workspace.id)}
										type="button"
									>
										Apagar Spotlight
									</button>
								) : (
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => vm.enableWorkspaceSpotlight(workspace.id)}
										type="button"
									>
										Encender Spotlight
									</button>
								)}
								<button
									className="icon-btn"
									disabled={workspace.status === "archived"}
									onClick={() => vm.runWorkspaceScript(workspace.id, "setup")}
									type="button"
								>
									Ejecutar Setup
								</button>
								<button
									className="icon-btn"
									disabled={workspace.status === "archived"}
									onClick={() => vm.runWorkspaceScript(workspace.id, "run")}
									type="button"
								>
									Ejecutar
								</button>
								<button
									className="icon-btn"
									disabled={!vm.workspaceScriptRunning[workspace.id]}
									onClick={() => vm.stopWorkspaceScript(workspace.id)}
									type="button"
								>
									Detener
								</button>
								<button
									className="icon-btn"
									onClick={() => vm.runWorkspaceScript(workspace.id, "archive")}
									type="button"
								>
									Ejecutar Cierre
								</button>
								{workspace.status === "archived" ? (
									<button
										className="icon-btn"
										onClick={() => vm.restoreWorkspace(workspace.id)}
										type="button"
									>
										Restaurar
									</button>
								) : (
									<button
										className="icon-btn"
										onClick={() => vm.archiveWorkspace(workspace.id)}
										type="button"
									>
										Archivar
									</button>
								)}
								<button
									className="icon-btn"
									disabled={workspace.status === "archived"}
									onClick={() => vm.createWorkspacePr(workspace.id)}
									type="button"
								>
									Crear PR
								</button>
								{vm.workspacePrs[workspace.id] && (
									<button
										className="icon-btn"
										onClick={() => vm.refreshWorkspacePr(workspace.id)}
										type="button"
									>
										Actualizar PR
									</button>
								)}
								{vm.workspacePrs[workspace.id] &&
									vm.workspacePrs[workspace.id].status === "open" && (
										<button
											className="icon-btn"
											disabled={(vm.workspaceTodos[workspace.id] || []).some(
												(todo) => !todo.completed,
											)}
											onClick={() => vm.mergeWorkspacePr(workspace.id)}
											type="button"
										>
											Fusionar PR
										</button>
									)}
								<button
									className="delete-btn"
									onClick={() => vm.removeWorkspace(workspace.id)}
									type="button"
								>
									Eliminar
								</button>
								{vm.workspacePrs[workspace.id] && (
									<span className="list-item-subtitle">
										PR: {vm.workspacePrs[workspace.id].pr_url} (
										{vm.workspacePrs[workspace.id].status})
									</span>
								)}
								{vm.workspacePrs[workspace.id] &&
									vm.workspacePrs[workspace.id].checks_total > 0 && (
										<span className="list-item-subtitle">
											Checks: {vm.workspacePrs[workspace.id].checks_state} · ✅{" "}
											{vm.workspacePrs[workspace.id].checks_passed} · ❌{" "}
											{vm.workspacePrs[workspace.id].checks_failed} · ⏳{" "}
											{vm.workspacePrs[workspace.id].checks_pending}
										</span>
									)}
							</div>
						</div>
					))
				)}
			</div>
		</PageShell>
	);
}

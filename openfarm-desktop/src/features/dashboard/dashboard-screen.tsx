import type { AppViewModel } from "../../state/use-app-view-model";

interface DashboardScreenProps {
	vm: AppViewModel;
}

export function DashboardScreen({ vm }: DashboardScreenProps) {
	const activeWorkspaces = vm.workspaces.filter(
		(workspace) => workspace.status !== "archived",
	);
	const availableSessions = vm.selectedProject
		? vm.sessions.filter(
				(session) => session.projectId === vm.selectedProject?.id,
			)
		: vm.sessions;
	const selectedWorkspace = vm.workspaces.find(
		(workspace) => workspace.id === vm.selectedWorkspaceId,
	);
	const selectedWorkspaceScript = selectedWorkspace
		? vm.workspaceScripts[selectedWorkspace.id]
		: undefined;
	const recentAgents = vm.agents.slice(0, 6);
	const recentSessions = availableSessions.slice(
		0,
		Math.min(8, availableSessions.length),
	);
	const isFirstRun = vm.projects.length === 0 || vm.workspaces.length === 0;

	return (
		<div className="app">
			<div
				className={`dashboard-shell ${vm.isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
			>
				<aside className="dashboard-sidebar">
					<div className="window-chrome">
						<span className="dot dot-red" />
						<span className="dot dot-yellow" />
						<span className="dot dot-green" />
					</div>
					<div className="sidebar-heading">
						<h1>OpenFarm</h1>
						<p className="list-item-subtitle">Modo simple</p>
					</div>
					<p className="list-item-subtitle">Acciones principales</p>
					<button
						className="icon-btn"
						onClick={() => vm.setView("spawn")}
						type="button"
					>
						Nueva tarea
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("workspaces")}
						type="button"
					>
						Mis espacios
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("runs")}
						type="button"
					>
						Ejecuciones
					</button>
					<p className="list-item-subtitle">Gestión</p>
					<button
						className="icon-btn"
						onClick={() => vm.setView("projects")}
						type="button"
					>
						Proyectos
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("sessions")}
						type="button"
					>
						Tareas guardadas
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("mcp")}
						type="button"
					>
						Conexiones
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("settings")}
						type="button"
					>
						Ajustes
					</button>
				</aside>

				<main className="main dashboard-content">
					{!vm.isSidebarOpen && (
						<div className="toolbar toolbar--floating">
							<button
								className="icon-btn"
								onClick={() => vm.setIsSidebarOpen(true)}
								type="button"
							>
								Menu
							</button>
						</div>
					)}
					<div className="workspace-shell">
						<section className="workspace-center workspaces-dashboard">
							<div className="workspaces-header">
								<div>
									<h1>Inicio</h1>
									<p className="list-item-subtitle">
										{selectedWorkspace
											? `Espacio activo: ${selectedWorkspace.name}`
											: "Elegí un espacio para empezar"}
									</p>
									<div className="list-item-actions">
										<select
											onChange={(event) => {
												const nextProjectId = event.target.value;
												const project = vm.projects.find(
													(item) => item.id === nextProjectId,
												);
												vm.setSelectedProject(project || null);
											}}
											value={vm.selectedProject?.id || ""}
										>
											<option value="">Todos los proyectos</option>
											{vm.projects.map((project) => (
												<option key={project.id} value={project.id}>
													{project.name}
												</option>
											))}
										</select>
										<select
											onChange={(event) => {
												const nextSessionId = event.target.value;
												const session = availableSessions.find(
													(item) => item.id === nextSessionId,
												);
												vm.setSelectedSession(session || null);
												vm.loadAgents();
											}}
											value={vm.selectedSession?.id || ""}
										>
											<option value="">Todas las tareas guardadas</option>
											{availableSessions.map((session) => (
												<option key={session.id} value={session.id}>
													{session.name}
												</option>
											))}
										</select>
									</div>
								</div>
								<div className="list-item-actions">
									<button
										className="btn-primary"
										onClick={() => vm.setView("spawn")}
										type="button"
									>
										Nueva tarea
									</button>
									<button
										className="btn-secondary"
										onClick={() => vm.setView("workspaces")}
										type="button"
									>
										Ver espacios
									</button>
								</div>
							</div>
							<div className="stats">
								<div className="stat">
									<span className="stat-value">{vm.stats.total}</span>
									<span className="stat-label">Total de tareas</span>
								</div>
								<div className="stat">
									<span className="stat-value cyan">{vm.stats.running}</span>
									<span className="stat-label">En curso</span>
								</div>
								<div className="stat">
									<span className="stat-value green">{vm.stats.completed}</span>
									<span className="stat-label">Terminadas</span>
								</div>
								<div className="stat">
									<span className="stat-value red">{vm.stats.failed}</span>
									<span className="stat-label">Con error</span>
								</div>
							</div>
							{isFirstRun && (
								<div className="form-card">
									<h3>Empezar en 2 minutos</h3>
									<p className="list-item-subtitle">
										Primero conectá tu proyecto y después creá un espacio para
										trabajar.
									</p>
									<div className="list-item-actions">
										<button
											className="btn-primary"
											onClick={() => vm.setView("projects")}
											type="button"
										>
											1) Agregar Proyecto
										</button>
										<button
											className="btn-secondary"
											onClick={() => vm.setView("workspaces")}
											type="button"
										>
											2) Crear Espacio
										</button>
									</div>
								</div>
							)}
							<div className="context-grid">
								<div className="context-block">
									<div className="context-block-header">
										<h3>Guía Rápida</h3>
									</div>
									<div className="list-item">
										<div className="list-item-content">
											<span className="list-item-title">
												1) Elegí un espacio de trabajo
											</span>
											<span className="list-item-subtitle">
												Seleccioná una carpeta para que el asistente trabaje
												ahí.
											</span>
										</div>
										<button
											className="btn-secondary"
											onClick={() => vm.setView("workspaces")}
											type="button"
										>
											Abrir
										</button>
									</div>
									<div className="list-item">
										<div className="list-item-content">
											<span className="list-item-title">
												2) Escribí tu objetivo
											</span>
											<span className="list-item-subtitle">
												Contá en lenguaje simple qué querés que resuelva.
											</span>
										</div>
										<button
											className="btn-secondary"
											onClick={() => vm.setView("spawn")}
											type="button"
										>
											Escribir
										</button>
									</div>
									<div className="list-item">
										<div className="list-item-content">
											<span className="list-item-title">
												3) Revisá y confirmá
											</span>
											<span className="list-item-subtitle">
												Antes de aplicar cambios, verificá los archivos
												modificados.
											</span>
										</div>
										<button
											className="btn-secondary"
											onClick={() =>
												vm.setView(vm.selectedAgent ? "review" : "runs")
											}
											type="button"
										>
											Revisar
										</button>
									</div>
								</div>
								<div className="context-block">
									<div className="context-block-header">
										<h3>Espacios activos</h3>
									</div>
									{activeWorkspaces.length === 0 ? (
										<p className="empty">No hay espacios activos.</p>
									) : (
										<div className="workspace-grid">
											{activeWorkspaces.slice(0, 8).map((workspace) => (
												<button
													className={`workspace-card ${
														vm.selectedWorkspaceId === workspace.id
															? "selected"
															: ""
													}`}
													key={workspace.id}
													onClick={() => {
														vm.setSelectedWorkspaceId(workspace.id);
														vm.setWorkspaceInput(workspace.repoPath || "");
													}}
													type="button"
												>
													<div className="workspace-card-header">
														<strong>{workspace.name}</strong>
														<span
															className={`status-badge ${workspace.status}`}
														>
															{workspace.status}
														</span>
													</div>
													<p className="workspace-card-path">
														{workspace.repoPath || "(no repo path)"}
													</p>
													<div className="workspace-card-meta">
														<span>{workspace.branchName || "main"}</span>
														<span>·</span>
														<span>{workspace.sourceType || "branch"}</span>
													</div>
												</button>
											))}
										</div>
									)}
									{selectedWorkspace && (
										<div className="diff-viewer">
											<h3>Acciones del espacio</h3>
											<p className="list-item-subtitle">
												{selectedWorkspace.name} ·{" "}
												{selectedWorkspace.repoPath || "(no repo path)"}
											</p>
											<p className="list-item-subtitle">
												Comando principal:{" "}
												{selectedWorkspaceScript?.run_script ||
													"(sin configurar)"}
											</p>
											<div className="list-item-actions">
												<button
													className="btn-secondary"
													onClick={() =>
														vm.openWorkspaceInIde(selectedWorkspace.id)
													}
													type="button"
												>
													Abrir carpeta
												</button>
												<button
													className="btn-secondary"
													disabled={selectedWorkspace.status === "archived"}
													onClick={() =>
														vm.runWorkspaceScript(selectedWorkspace.id, "setup")
													}
													type="button"
												>
													Ejecutar preparación
												</button>
												<button
													className="btn-primary"
													disabled={selectedWorkspace.status === "archived"}
													onClick={() =>
														vm.runWorkspaceScript(selectedWorkspace.id, "run")
													}
													type="button"
												>
													Ejecutar
												</button>
												<button
													className="btn-secondary"
													disabled={
														!vm.workspaceScriptRunning[selectedWorkspace.id]
													}
													onClick={() =>
														vm.stopWorkspaceScript(selectedWorkspace.id)
													}
													type="button"
												>
													Detener
												</button>
												{selectedWorkspace.spotlightEnabled ? (
													<button
														className="btn-secondary"
														onClick={() =>
															vm.disableWorkspaceSpotlight(selectedWorkspace.id)
														}
														type="button"
													>
														Desactivar Spotlight
													</button>
												) : (
													<button
														className="btn-secondary"
														disabled={selectedWorkspace.status === "archived"}
														onClick={() =>
															vm.enableWorkspaceSpotlight(selectedWorkspace.id)
														}
														type="button"
													>
														Activar Spotlight
													</button>
												)}
											</div>
										</div>
									)}
								</div>
								<div className="context-block">
									<div className="context-block-header">
										<h3>Tareas guardadas</h3>
									</div>
									{!vm.selectedProject ? (
										<>
											<p className="empty">
												Seleccioná un proyecto para crear y filtrar threads.
											</p>
											<button
												className="btn-secondary"
												onClick={() => vm.setView("projects")}
												type="button"
											>
												Ir a Proyectos
											</button>
										</>
									) : (
										<>
											<input
												onChange={(event) =>
													vm.setNewSessionName(event.target.value)
												}
												placeholder="Nombre de la tarea guardada"
												type="text"
												value={vm.newSessionName}
											/>
											<div className="list-item-actions">
												<button
													className="btn-primary"
													disabled={!vm.newSessionName.trim()}
													onClick={vm.createSession}
													type="button"
												>
													Guardar tarea
												</button>
												<button
													className="btn-secondary"
													onClick={() => vm.setView("sessions")}
													type="button"
												>
													Ver tareas guardadas
												</button>
											</div>
											{recentSessions.length === 0 ? (
												<p className="empty">
													No hay tareas guardadas en este proyecto.
												</p>
											) : (
												<div className="thread-list">
													{recentSessions.map((session) => (
														<button
															className={`thread-item ${
																vm.selectedSession?.id === session.id
																	? "active"
																	: ""
															}`}
															key={session.id}
															onClick={() => {
																vm.setSelectedSession(session);
																vm.loadAgents();
															}}
															type="button"
														>
															<span>{session.name}</span>
															<small>
																{session.agents?.length ?? 0} ejecuciones
															</small>
														</button>
													))}
												</div>
											)}
										</>
									)}
								</div>
								<div className="context-block">
									<div className="context-block-header">
										<h3>Crear tarea rápida</h3>
									</div>
									<select
										onChange={(event) => {
											const nextId = event.target.value;
											vm.setSelectedWorkspaceId(nextId);
											const workspace = activeWorkspaces.find(
												(item) => item.id === nextId,
											);
											vm.setWorkspaceInput(workspace?.repoPath || "");
										}}
										value={vm.selectedWorkspaceId}
									>
										<option value="">Elegí un espacio</option>
										{activeWorkspaces.map((workspace) => (
											<option key={workspace.id} value={workspace.id}>
												{workspace.name} · {workspace.branchName || "main"}
											</option>
										))}
									</select>
									<textarea
										onChange={(event) => vm.setTaskInput(event.target.value)}
										placeholder="Escribí con palabras simples lo que necesitás"
										rows={4}
										value={vm.taskInput}
									/>
									<select
										onChange={(event) => vm.setProvider(event.target.value)}
										value={vm.provider}
									>
										<option value="external-agent">
											Automático (recomendado)
										</option>
										<option value="aider">Aider</option>
										<option value="claude">Claude Code</option>
										<option value="opencode">OpenCode</option>
										<option value="codex">Codex</option>
									</select>
									<div className="list-item-actions">
										<button
											className="btn-primary"
											disabled={!vm.taskInput.trim() || vm.loading}
											onClick={vm.spawnAgent}
											type="button"
										>
											{vm.loading ? "Iniciando..." : "Iniciar tarea"}
										</button>
										<button
											className="btn-secondary"
											onClick={() => vm.setView("spawn")}
											type="button"
										>
											Abrir formulario completo
										</button>
									</div>
								</div>
								<div className="context-block">
									<div className="context-block-header">
										<h3>Últimos agentes</h3>
									</div>
									{recentAgents.length === 0 ? (
										<p className="empty">Todavía no corriste agentes.</p>
									) : (
										<div className="thread-list">
											{recentAgents.map((agent) => (
												<button
													className="thread-item"
													key={agent.id}
													onClick={() => {
														vm.setSelectedAgent(agent);
														vm.setView("review");
													}}
													type="button"
												>
													<span>{agent.task || "(sin task)"}</span>
													<small>{agent.status}</small>
												</button>
											))}
										</div>
									)}
								</div>
							</div>
						</section>
					</div>
				</main>
			</div>
		</div>
	);
}

import type { AppViewModel } from "../../state/use-app-view-model";

interface DashboardScreenProps {
	vm: AppViewModel;
}

export function DashboardScreen({ vm }: DashboardScreenProps) {
	const activeWorkspaces = vm.workspaces.filter(
		(workspace) => workspace.status !== "archived",
	);
	const selectedWorkspace = vm.workspaces.find(
		(workspace) => workspace.id === vm.selectedWorkspaceId,
	);
	const recentAgents = vm.agents.slice(0, 6);

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
						<h1>OpenFarm Desktop</h1>
					</div>
					<button
						className="icon-btn"
						onClick={() => vm.setView("spawn")}
						type="button"
					>
						Spawn Agent
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("workspaces")}
						type="button"
					>
						Workspaces
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("runs")}
						type="button"
					>
						Runs
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("projects")}
						type="button"
					>
						Projects
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("sessions")}
						type="button"
					>
						Sessions
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("mcp")}
						type="button"
					>
						MCP
					</button>
					<button
						className="icon-btn"
						onClick={() => vm.setView("settings")}
						type="button"
					>
						Settings
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
									<h1>Control Room</h1>
									<p className="list-item-subtitle">
										{selectedWorkspace
											? `Workspace activo: ${selectedWorkspace.name}`
											: "Seleccioná un workspace para arrancar"}
									</p>
								</div>
								<div className="list-item-actions">
									<button
										className="btn-primary"
										onClick={() => vm.setView("spawn")}
										type="button"
									>
										Nuevo run
									</button>
									<button
										className="btn-secondary"
										onClick={() => vm.setView("workspaces")}
										type="button"
									>
										Gestionar workspaces
									</button>
								</div>
							</div>
							<div className="stats">
								<div className="stat">
									<span className="stat-value">{vm.stats.total}</span>
									<span className="stat-label">Total agents</span>
								</div>
								<div className="stat">
									<span className="stat-value cyan">{vm.stats.running}</span>
									<span className="stat-label">Running</span>
								</div>
								<div className="stat">
									<span className="stat-value green">{vm.stats.completed}</span>
									<span className="stat-label">Completed</span>
								</div>
								<div className="stat">
									<span className="stat-value red">{vm.stats.failed}</span>
									<span className="stat-label">Failed</span>
								</div>
							</div>
							<div className="context-grid">
								<div className="context-block">
									<div className="context-block-header">
										<h3>Workspaces activos</h3>
									</div>
									{activeWorkspaces.length === 0 ? (
										<p className="empty">No hay workspaces activos.</p>
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

import type { AppViewModel, Workspace } from "../../state/use-app-view-model";

interface ContextManagerPanelProps {
	vm: AppViewModel;
}

function getStatusIcon(status: Workspace["status"]): string {
	switch (status) {
		case "running":
			return "●";
		case "done":
			return "✓";
		case "error":
			return "✕";
		default:
			return "○";
	}
}

export function ContextManagerPanel({ vm }: ContextManagerPanelProps) {
	const displayWorkspaces = vm.workspaces.slice(0, 4);
	const hasWorkspaces = vm.workspaces.length > 0;

	return (
		<section className="context-manager simplified-manager">
			<div className="context-manager-header">
				<h2>Workspaces</h2>
				<div className="header-actions">
					<button
						className="btn-primary"
						onClick={() => vm.setView("spawn")}
						type="button"
					>
						+ New Workspace
					</button>
				</div>
			</div>

			{!hasWorkspaces ? (
				<div className="empty-state">
					<h3>No workspaces yet</h3>
					<p>Create your first workspace to start working</p>
					<button
						className="btn-primary"
						onClick={() => vm.setView("spawn")}
						type="button"
					>
						Create First Workspace
					</button>
				</div>
			) : (
				<>
					<div className="workspaces-label">
						<span>Active Workspaces</span>
						<span className="workspace-count">
							{vm.workspaces.length} total
						</span>
					</div>

					<div className="workspace-grid">
						{displayWorkspaces.map((workspace) => (
							<button
								className={`workspace-card ${
									vm.selectedWorkspaceId === workspace.id ? "selected" : ""
								}`}
								key={workspace.id}
								onClick={() => {
									vm.setSelectedWorkspaceId(workspace.id);
									vm.setWorkspaceInput(workspace.repoPath || "");
								}}
								type="button"
							>
								<div className="workspace-card-header">
									<span className="workspace-name">{workspace.name}</span>
									<span
										className={`workspace-status status-${workspace.status}`}
									>
										{getStatusIcon(workspace.status)} {workspace.status}
									</span>
								</div>
								<div className="workspace-card-body">
									<span className="workspace-branch">
										{workspace.branchName}
									</span>
								</div>
							</button>
						))}
					</div>

					{vm.workspaces.length > 4 && (
						<button
							className="view-all-btn"
							onClick={() => vm.setView("workspaces")}
							type="button"
						>
							View all {vm.workspaces.length} workspaces →
						</button>
					)}
				</>
			)}

			<div className="action-bar">
				<button
					className="btn-action-large"
					onClick={() => vm.setView("spawn")}
					type="button"
				>
					Open Composer →
				</button>
			</div>
		</section>
	);
}

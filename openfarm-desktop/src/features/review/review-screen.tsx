import type { AppViewModel } from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface ReviewScreenProps {
	vm: AppViewModel;
}

export function ReviewScreen({ vm }: ReviewScreenProps) {
	if (!vm.selectedAgent) {
		return null;
	}

	const filteredDiffFiles = vm.diffFiles.filter((file) =>
		file.path.toLowerCase().includes(vm.diffFilter.toLowerCase()),
	);
	const selectedPatch =
		vm.diffFiles.find((file) => file.path === vm.selectedDiffFile)?.patch ||
		"No patch available";

	return (
		<PageShell onBack={() => vm.setView("dashboard")} title="Revisar Resultado">
			<div className="review-panel">
				<div className="review-header">
					<h2>Tarea: {vm.selectedAgent.id.slice(0, 8)}</h2>
					<span className={`status-badge ${vm.selectedAgent.status}`}>
						{vm.selectedAgent.status}
					</span>
				</div>
				<div className="review-task">
					<h3>Resumen</h3>
					<p>{vm.selectedAgent.task}</p>
				</div>
				<div className="review-info">
					<div>
						<strong>Motor:</strong> {vm.selectedAgent.provider}
					</div>
					<div>
						<strong>Creado:</strong>{" "}
						{new Date(vm.selectedAgent.createdAt).toLocaleString()}
					</div>
					{vm.selectedAgent.branchName && (
						<div>
							<strong>Rama:</strong> {vm.selectedAgent.branchName}
						</div>
					)}
					{vm.selectedAgent.worktreePath && (
						<div>
							<strong>Carpeta:</strong> {vm.selectedAgent.worktreePath}
						</div>
					)}
				</div>
				<p className="list-item-subtitle">
					Si está bien, confirmá cambios. Si no, rechazá y explicá qué corregir.
				</p>
				<div className="review-actions">
					<button
						className="btn-primary"
						disabled={vm.selectedAgent.status !== "completed"}
						onClick={() => vm.approveAgent(vm.selectedAgent?.id || "")}
						type="button"
					>
						Confirmar Cambios
					</button>
					<button
						className="btn-secondary"
						disabled={vm.selectedAgent.status !== "completed"}
						onClick={() =>
							vm.rejectAgent(
								vm.selectedAgent?.id || "",
								vm.reviewRejectReason.trim() || "Rejected from review",
							)
						}
						type="button"
					>
						Pedir Ajustes
					</button>
					<button
						className="btn-secondary"
						onClick={() => vm.getAgentDiff(vm.selectedAgent?.id || "")}
						type="button"
					>
						Ver Cambios
					</button>
				</div>
				<div className="review-task">
					<h3>Motivo (si pedís ajustes)</h3>
					<input
						onChange={(event) => vm.setReviewRejectReason(event.target.value)}
						placeholder="Ejemplo: faltan tests y falla en móvil"
						type="text"
						value={vm.reviewRejectReason}
					/>
				</div>
				{vm.reviewError && (
					<div className="diff-viewer">
						<h3>Error al confirmar</h3>
						<pre>{vm.reviewError}</pre>
					</div>
				)}
				{vm.diff && (
					<div className="diff-viewer">
						<h3>Resumen de Cambios</h3>
						<pre>{vm.diff}</pre>
					</div>
				)}
				{vm.diffFiles.length > 0 && (
					<div className="diff-viewer">
						<h3>Archivos Modificados</h3>
						<input
							onChange={(event) => vm.setDiffFilter(event.target.value)}
							placeholder="Filtrar archivos..."
							type="text"
							value={vm.diffFilter}
						/>
						<div className="review-actions">
							<button
								className="btn-secondary"
								onClick={() => vm.setDiffViewMode("unified")}
								type="button"
							>
								Vista simple
							</button>
							<button
								className="btn-secondary"
								onClick={() => vm.setDiffViewMode("split")}
								type="button"
							>
								Vista comparada
							</button>
						</div>
						<div className="diff-file-list">
							{filteredDiffFiles.map((file) => (
								<button
									className="icon-btn"
									key={file.path}
									onClick={() => vm.setSelectedDiffFile(file.path)}
									type="button"
								>
									{file.path}
								</button>
							))}
						</div>
						{vm.diffViewMode === "unified" ? (
							<pre>{selectedPatch}</pre>
						) : (
							<div className="split-diff">
								{vm.renderSplitPatch(selectedPatch)}
							</div>
						)}
					</div>
				)}
				<div className="diff-viewer">
					<h3>Detalle de Ejecución</h3>
					<pre>
						{vm.agentOutput[vm.selectedAgent.id] ||
							vm.selectedAgent.output ||
							"Sin salida todavía"}
					</pre>
				</div>
			</div>
		</PageShell>
	);
}

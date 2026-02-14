import { useState } from "react";
import type { AppViewModel } from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface ReviewScreenProps {
	vm: AppViewModel;
}

type RiskLevel = "safe" | "review" | "risky";

function resolveRiskLevel(
	diffFilesCount: number,
	hasMergeError: boolean,
	agentStatus: string,
): RiskLevel {
	if (hasMergeError || agentStatus === "failed") {
		return "risky";
	}
	if (
		diffFilesCount > 8 ||
		agentStatus === "running" ||
		agentStatus === "pending"
	) {
		return "review";
	}
	return "safe";
}

function riskLabel(level: RiskLevel): string {
	if (level === "risky") {
		return "Riesgo: Riesgoso";
	}
	if (level === "review") {
		return "Riesgo: Revisar";
	}
	return "Riesgo: Seguro";
}

function riskBadgeClass(level: RiskLevel): string {
	if (level === "risky") {
		return "failed";
	}
	if (level === "review") {
		return "approved";
	}
	return "completed";
}

function statusLabel(status: string): string {
	if (status === "completed") {
		return "Listo para revisar";
	}
	if (status === "running") {
		return "Trabajando";
	}
	if (status === "failed") {
		return "Falló";
	}
	if (status === "pending") {
		return "En cola";
	}
	if (status === "approved") {
		return "Aprobado";
	}
	if (status === "rejected") {
		return "Con ajustes pedidos";
	}
	return status;
}

export function ReviewScreen({ vm }: ReviewScreenProps) {
	const [showTechnical, setShowTechnical] = useState(false);

	if (!vm.selectedAgent) {
		return (
			<PageShell
				onBack={() => vm.setView("dashboard")}
				title="Revisar Resultado"
			>
				<div className="review-panel">
					<h3>No hay una tarea seleccionada</h3>
					<p className="list-item-subtitle">
						Primero ejecutá una tarea y luego abrí su revisión desde el
						dashboard.
					</p>
					<div className="review-actions">
						<button
							className="btn-primary"
							onClick={() => vm.setView("runs")}
							type="button"
						>
							Ir a Ejecuciones
						</button>
						<button
							className="btn-secondary"
							onClick={() => vm.setView("dashboard")}
							type="button"
						>
							Volver al Inicio
						</button>
					</div>
				</div>
			</PageShell>
		);
	}

	const filteredDiffFiles = vm.diffFiles.filter((file) =>
		file.path.toLowerCase().includes(vm.diffFilter.toLowerCase()),
	);
	const selectedPatch =
		vm.diffFiles.find((file) => file.path === vm.selectedDiffFile)?.patch ||
		"No patch available";
	const riskLevel = resolveRiskLevel(
		vm.diffFiles.length,
		Boolean(vm.reviewError),
		vm.selectedAgent.status,
	);

	return (
		<PageShell onBack={() => vm.setView("dashboard")} title="Revisar Resultado">
			<div className="review-panel">
				<div className="review-header">
					<h2>Tarea: {vm.selectedAgent.id.slice(0, 8)}</h2>
					<span className={`status-badge ${vm.selectedAgent.status}`}>
						{statusLabel(vm.selectedAgent.status)}
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
				<span className={`status-badge ${riskBadgeClass(riskLevel)}`}>
					{riskLabel(riskLevel)}
				</span>
				<div className="review-decision-grid">
					<div className="review-decision-card">
						<h3>Aprobar</h3>
						<p className="list-item-subtitle">
							Usalo cuando el resultado está correcto.
						</p>
						<button
							className="btn-primary"
							disabled={vm.selectedAgent.status !== "completed"}
							onClick={() => vm.approveAgent(vm.selectedAgent?.id || "")}
							type="button"
						>
							Confirmar Cambios
						</button>
					</div>
					<div className="review-decision-card">
						<h3>Pedir ajustes</h3>
						<p className="list-item-subtitle">
							Usalo si hay algo que mejorar o corregir.
						</p>
						<button
							className="btn-secondary"
							disabled={vm.selectedAgent.status !== "completed"}
							onClick={() =>
								vm.rejectAgent(
									vm.selectedAgent?.id || "",
									vm.reviewRejectReason.trim() || "Necesita ajustes",
								)
							}
							type="button"
						>
							Pedir Ajustes
						</button>
					</div>
					<div className="review-decision-card">
						<h3>Ver evidencia</h3>
						<p className="list-item-subtitle">
							Revisá archivos cambiados antes de decidir.
						</p>
						<button
							className="btn-secondary"
							onClick={() => vm.getAgentDiff(vm.selectedAgent?.id || "")}
							type="button"
						>
							Ver Cambios
						</button>
					</div>
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
				<button
					className="btn-secondary"
					onClick={() => setShowTechnical((prev) => !prev)}
					type="button"
				>
					{showTechnical
						? "Ocultar detalles técnicos"
						: "Mostrar detalles técnicos"}
				</button>
				{vm.reviewError && (
					<div className="diff-viewer">
						<h3>Error al confirmar</h3>
						<pre>{vm.reviewError}</pre>
					</div>
				)}
				{showTechnical && vm.diff && (
					<div className="diff-viewer">
						<h3>Resumen de Cambios</h3>
						<pre>{vm.diff}</pre>
					</div>
				)}
				{showTechnical && vm.diffFiles.length > 0 && (
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
				{showTechnical && (
					<div className="diff-viewer">
						<h3>Detalle de Ejecución</h3>
						<pre>
							{vm.agentOutput[vm.selectedAgent.id] ||
								vm.selectedAgent.output ||
								"Sin salida todavía"}
						</pre>
					</div>
				)}
			</div>
		</PageShell>
	);
}

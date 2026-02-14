import type { AppViewModel } from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface RunsScreenProps {
	vm: AppViewModel;
}

export function RunsScreen({ vm }: RunsScreenProps) {
	return (
		<PageShell onBack={() => vm.setView("dashboard")} title="Ejecuciones">
			<div className="list-card">
				<h3>Estado de cada espacio de trabajo</h3>
				{vm.workspaces.length === 0 ? (
					<p className="empty">Todavía no hay espacios de trabajo.</p>
				) : (
					vm.workspaces.map((workspace) => (
						<div className="list-item" key={workspace.id}>
							<div className="list-item-content">
								<span className="list-item-title">
									{workspace.name} (
									{vm.workspaceScriptRunning[workspace.id]
										? "ejecutando"
										: "en espera"}
									)
								</span>
								<span className="list-item-subtitle">
									{vm.workspaceScripts[workspace.id]?.run_script ||
										"Sin comando de ejecución configurado"}
								</span>
								<input
									onChange={(event) =>
										vm.setNewCheckpointName((prev) => ({
											...prev,
											[workspace.id]: event.target.value,
										}))
									}
									placeholder="Nombre del punto de guardado"
									type="text"
									value={vm.newCheckpointName[workspace.id] || ""}
								/>
								<select
									onChange={(event) => {
										const checkpointId = event.target.value;
										if (checkpointId) {
											vm.revertWorkspaceCheckpoint(workspace.id, checkpointId);
										}
									}}
									value=""
								>
									<option value="">Volver a un punto guardado...</option>
									{(vm.workspaceCheckpoints[workspace.id] || []).map(
										(checkpoint) => (
											<option key={checkpoint.id} value={checkpoint.id}>
												{checkpoint.name} ·{" "}
												{new Date(checkpoint.created_at).toLocaleString()}
											</option>
										),
									)}
								</select>
								<pre>
									{vm.workspaceScriptOutput[workspace.id] ||
										"Todavía no hay salida de ejecución"}
								</pre>
							</div>
							<div className="list-item-actions">
								<button
									className="icon-btn"
									disabled={workspace.status === "archived"}
									onClick={() => vm.createWorkspaceCheckpoint(workspace.id)}
									type="button"
								>
									Guardar Punto
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
									disabled={workspace.status === "archived"}
									onClick={() => vm.restartWorkspaceScript(workspace.id)}
									type="button"
								>
									Reiniciar
								</button>
							</div>
						</div>
					))
				)}
			</div>
		</PageShell>
	);
}

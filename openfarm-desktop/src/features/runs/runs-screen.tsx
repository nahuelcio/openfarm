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
					vm.workspaces.map((workspace) => {
						const isRunning = Boolean(vm.workspaceScriptRunning[workspace.id]);
						const output = vm.workspaceScriptOutput[workspace.id] || "";
						const hasError =
							/\berror\b/i.test(output) || /\bfailed\b/i.test(output);
						const runCommand =
							vm.workspaceScripts[workspace.id]?.run_script ||
							"Sin comando de ejecución configurado";
						const statusLabel = isRunning
							? "Ejecutando"
							: hasError
								? "Con problemas"
								: output
									? "Última ejecución completada"
									: "Sin ejecutar";
						const nextStep = isRunning
							? "Esperar o detener si querés frenar el proceso."
							: hasError
								? "Revisar la salida y volver a ejecutar."
								: output
									? "Si está todo bien, guardá un punto."
									: "Primero ejecutá este espacio de trabajo.";

						return (
							<div className="list-item" key={workspace.id}>
								<div className="list-item-content">
									<span className="list-item-title">{workspace.name}</span>
									<span className="list-item-subtitle">
										Estado: {statusLabel}
									</span>
									<span className="list-item-subtitle">
										Comando: {runCommand}
									</span>
									<span className="list-item-subtitle">
										Siguiente paso: {nextStep}
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
												vm.revertWorkspaceCheckpoint(
													workspace.id,
													checkpointId,
												);
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
									<pre>{output || "Todavía no hay salida de ejecución"}</pre>
								</div>
								<div className="list-item-actions">
									<button
										className={isRunning ? "icon-btn" : "btn-primary"}
										disabled={workspace.status === "archived"}
										onClick={() => vm.runWorkspaceScript(workspace.id, "run")}
										type="button"
									>
										Ejecutar
									</button>
									<button
										className="icon-btn"
										disabled={!isRunning}
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
									<button
										className="icon-btn"
										disabled={workspace.status === "archived"}
										onClick={() => vm.createWorkspaceCheckpoint(workspace.id)}
										type="button"
									>
										Guardar Punto
									</button>
								</div>
							</div>
						);
					})
				)}
			</div>
		</PageShell>
	);
}

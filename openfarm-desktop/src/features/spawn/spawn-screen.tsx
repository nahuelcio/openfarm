import { useState } from "react";
import type { AppViewModel } from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface SpawnScreenProps {
	vm: AppViewModel;
}

export function SpawnScreen({ vm }: SpawnScreenProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const showManualPath = vm.selectedWorkspaceId === "";

	return (
		<PageShell title="Crear Nueva Tarea">
			<div className="spawn-form">
				<p className="list-item-subtitle">
					Describí lo que querés lograr y OpenFarm se encarga del resto.
				</p>
				<label htmlFor="task-description">
					¿Qué querés que haga el asistente?
				</label>
				<textarea
					disabled={vm.loading}
					id="task-description"
					onChange={(event) => vm.setTaskInput(event.target.value)}
					placeholder="Ejemplo: arreglar el login y dejar todo funcionando"
					rows={4}
					value={vm.taskInput}
				/>
				{showAdvanced && vm.selectedWorkspaceId && (
					<>
						<label htmlFor="slash-commands">Atajos (opcional)</label>
						<select
							disabled={vm.loading}
							id="slash-commands"
							onChange={(event) => {
								const commandName = event.target.value;
								if (!commandName) {
									return;
								}
								vm.setTaskInput(`/${commandName} `);
							}}
							value=""
						>
							<option value="">Insertar atajo...</option>
							{(vm.workspaceSlashCommands[vm.selectedWorkspaceId] || []).map(
								(command) => (
									<option key={command.name} value={command.name}>
										/{command.name}
									</option>
								),
							)}
						</select>
					</>
				)}

				<label htmlFor="workspace-select">¿Dónde querés trabajar?</label>
				<select
					disabled={vm.loading}
					id="workspace-select"
					onChange={(event) => {
						const nextId = event.target.value;
						vm.setSelectedWorkspaceId(nextId);
						const selected = vm.workspaces.find(
							(workspace) => workspace.id === nextId,
						);
						if (selected) {
							vm.setWorkspaceInput(selected.repoPath);
							vm.loadWorkspaceSlashCommands(selected.id);
						}
					}}
					value={vm.selectedWorkspaceId}
				>
					<option value="">Elegir carpeta manualmente</option>
					{vm.workspaces
						.filter((workspace) => workspace.status !== "archived")
						.map((workspace) => (
							<option key={workspace.id} value={workspace.id}>
								{workspace.name} · {workspace.branchName}
							</option>
						))}
				</select>
				<button
					className="btn-secondary"
					onClick={() => setShowAdvanced((prev) => !prev)}
					type="button"
				>
					{showAdvanced
						? "Ocultar opciones técnicas"
						: "Mostrar opciones técnicas"}
				</button>
				{showAdvanced && (
					<>
						{showManualPath && (
							<>
								<label htmlFor="manual-path">Ruta manual del proyecto</label>
								<input
									disabled={vm.loading}
									id="manual-path"
									onChange={(event) => vm.setWorkspaceInput(event.target.value)}
									placeholder="Ruta de la carpeta del proyecto"
									type="text"
									value={vm.workspaceInput}
								/>
							</>
						)}
						<label htmlFor="provider-select">Motor de IA</label>
						<select
							disabled={vm.loading}
							id="provider-select"
							onChange={(event) => vm.setProvider(event.target.value)}
							value={vm.provider}
						>
							<option value="external-agent">Automático (recomendado)</option>
							<option value="aider">Aider</option>
							<option value="claude">Claude Code</option>
							<option value="opencode">OpenCode</option>
							<option value="codex">Codex</option>
						</select>
					</>
				)}

				<div className="buttons">
					<button
						disabled={vm.loading || !vm.taskInput.trim()}
						onClick={vm.spawnAgent}
						type="button"
					>
						{vm.loading ? "Iniciando..." : "Iniciar Tarea"}
					</button>
					<button
						className="secondary"
						disabled={vm.loading}
						onClick={() => vm.setView("dashboard")}
						type="button"
					>
						Volver
					</button>
				</div>
			</div>
		</PageShell>
	);
}

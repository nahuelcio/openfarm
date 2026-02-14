import type { AppViewModel } from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface ProjectsScreenProps {
	vm: AppViewModel;
}

export function ProjectsScreen({ vm }: ProjectsScreenProps) {
	return (
		<PageShell onBack={() => vm.setView("dashboard")} title="Proyectos">
			<div className="form-card">
				<h3>Agregar Proyecto</h3>
				<input
					onChange={(event) => {
						vm.setNewProjectName(event.target.value);
						if (vm.projectFormError) {
							vm.setProjectFormError("");
						}
					}}
					placeholder="Nombre del proyecto"
					type="text"
					value={vm.newProjectName}
				/>
				<div className="field-row">
					<input
						onChange={(event) => {
							vm.setNewProjectPath(event.target.value);
							if (vm.projectFormError) {
								vm.setProjectFormError("");
							}
						}}
						placeholder="Ruta de la carpeta del proyecto"
						type="text"
						value={vm.newProjectPath}
					/>
					<button
						className="btn-secondary"
						disabled={vm.isPickingProjectPath}
						onClick={vm.browseProjectFolder}
						type="button"
					>
						{vm.isPickingProjectPath ? "Abriendo..." : "Buscar Carpeta"}
					</button>
				</div>
				{vm.projectFormError && (
					<p className="form-error">{vm.projectFormError}</p>
				)}
				<button onClick={vm.addProject} type="button">
					Guardar Proyecto
				</button>
			</div>
			<div className="list-card">
				<h3>Proyectos Guardados</h3>
				{vm.projects.length === 0 ? (
					<p className="empty">Todavía no hay proyectos.</p>
				) : (
					vm.projects.map((project) => (
						<div className="list-item" key={project.id}>
							<div
								className="list-item-content clickable"
								onClick={() => {
									vm.setSelectedProject(project);
									vm.setView("sessions");
								}}
							>
								<span className="list-item-title">{project.name}</span>
								<span className="list-item-subtitle">{project.path}</span>
							</div>
							<button
								className="delete-btn"
								onClick={() => vm.removeProject(project.id)}
								type="button"
							>
								Eliminar
							</button>
						</div>
					))
				)}
			</div>
		</PageShell>
	);
}

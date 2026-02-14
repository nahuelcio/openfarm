import type { AppViewModel } from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface SessionsScreenProps {
	vm: AppViewModel;
}

export function SessionsScreen({ vm }: SessionsScreenProps) {
	return (
		<PageShell
			onBack={() => vm.setView("dashboard")}
			title={`Tareas Guardadas - ${vm.selectedProject?.name || "Sin proyecto"}`}
		>
			<div className="form-card">
				<h3>Crear Nueva Tarea Guardada</h3>
				<input
					onChange={(event) => vm.setNewSessionName(event.target.value)}
					placeholder="Nombre (ej: Corrección de checkout)"
					type="text"
					value={vm.newSessionName}
				/>
				<button onClick={vm.createSession} type="button">
					Crear
				</button>
			</div>
			<div className="list-card">
				<h3>Tareas Guardadas</h3>
				{vm.sessions.length === 0 ? (
					<p className="empty">Todavía no hay tareas guardadas.</p>
				) : (
					vm.sessions.map((session) => (
						<div className="list-item" key={session.id}>
							<div
								className="list-item-content clickable"
								onClick={() => {
									vm.setSelectedSession(session);
									vm.setView("dashboard");
								}}
							>
								<span className="list-item-title">{session.name}</span>
								<span className="list-item-subtitle">
									{new Date(session.createdAt).toLocaleString()} ·{" "}
									{session.agents?.length ?? 0} ejecuciones
								</span>
							</div>
							<button
								className="delete-btn"
								onClick={() => vm.deleteSession(session.id)}
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

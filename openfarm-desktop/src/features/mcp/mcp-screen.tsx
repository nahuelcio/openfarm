import type { AppViewModel } from "../../state/use-app-view-model";
import { PageShell } from "../../ui/layout/page-shell";

interface McpScreenProps {
	vm: AppViewModel;
}

export function McpScreen({ vm }: McpScreenProps) {
	return (
		<PageShell
			onBack={() => vm.setView("dashboard")}
			title="Conexiones Externas (MCP)"
		>
			<div className="form-card">
				<h3>Agregar Conexión</h3>
				<input
					onChange={(event) => vm.setNewMcpName(event.target.value)}
					placeholder="Nombre"
					type="text"
					value={vm.newMcpName}
				/>
				<input
					onChange={(event) => vm.setNewMcpCommand(event.target.value)}
					placeholder="Comando (ej: npx)"
					type="text"
					value={vm.newMcpCommand}
				/>
				<input
					onChange={(event) => vm.setNewMcpArgs(event.target.value)}
					placeholder="Argumentos (separados por espacios)"
					type="text"
					value={vm.newMcpArgs}
				/>
				<button onClick={vm.addMcpServer} type="button">
					Guardar Conexión
				</button>
			</div>
			<div className="list-card">
				<h3>Conexiones Configuradas</h3>
				{vm.mcpServers.length === 0 ? (
					<p className="empty">Todavía no configuraste conexiones.</p>
				) : (
					vm.mcpServers.map((server) => (
						<div className="list-item" key={server.id}>
							<div className="list-item-content">
								<span className="list-item-title">
									{server.name} ({server.enabled ? "activa" : "inactiva"})
								</span>
								<span className="list-item-subtitle">
									{server.command} {(server.args || []).join(" ")}
								</span>
								<span className="list-item-subtitle">
									Estado: {server.health_status || "desconocido"}
								</span>
							</div>
							<div className="list-item-actions">
								<button
									className="icon-btn"
									onClick={() => vm.checkMcpServerHealth(server.id)}
									type="button"
								>
									Verificar
								</button>
								<button
									className="icon-btn"
									onClick={() => vm.toggleMcpServer(server)}
									type="button"
								>
									{server.enabled ? "Desactivar" : "Activar"}
								</button>
								<button
									className="delete-btn"
									onClick={() => vm.deleteMcpServer(server.id)}
									type="button"
								>
									Eliminar
								</button>
							</div>
						</div>
					))
				)}
			</div>
		</PageShell>
	);
}

import { useEffect, useMemo, useState } from "react";
import { DashboardScreen } from "./features/dashboard/dashboard-screen";
import { McpScreen } from "./features/mcp/mcp-screen";
import { ProjectsScreen } from "./features/projects/projects-screen";
import { ReviewScreen } from "./features/review/review-screen";
import { RunsScreen } from "./features/runs/runs-screen";
import { SessionsScreen } from "./features/sessions/sessions-screen";
import { SettingsScreen } from "./features/settings/settings-screen";
import { SpawnScreen } from "./features/spawn/spawn-screen";
import { WorkspacesScreen } from "./features/workspaces/workspaces-screen";
import { useAppViewModel } from "./state/use-app-view-model";
import { type CommandItem, CommandPalette } from "./ui/layout/command-palette";

function App() {
	const vm = useAppViewModel();
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [paletteQuery, setPaletteQuery] = useState("");
	const [paletteCursor, setPaletteCursor] = useState(0);

	const commands = useMemo<CommandItem[]>(() => {
		const selectedWorkspace = vm.workspaces.find(
			(workspace) => workspace.id === vm.selectedWorkspaceId,
		);
		return [
			{
				id: "goto-dashboard",
				label: "Ir a Inicio",
				hint: "Pantalla principal",
				action: () => vm.setView("dashboard"),
			},
			{
				id: "open-composer",
				label: "Nueva tarea",
				hint: "Formulario rápido",
				action: () => vm.setView("spawn"),
			},
			{
				id: "new-thread",
				label: "Tareas guardadas",
				hint: "Ver sesiones",
				action: () => vm.setView("sessions"),
			},
			{
				id: "open-projects",
				label: "Abrir Proyectos",
				hint: "Gestión de proyectos",
				action: () => vm.setView("projects"),
			},
			{
				id: "open-workspaces",
				label: "Abrir Espacios",
				hint: "Gestión de espacios",
				action: () => vm.setView("workspaces"),
			},
			{
				id: "open-runs",
				label: "Abrir Ejecuciones",
				hint: "Estado de tareas",
				action: () => vm.setView("runs"),
			},
			{
				id: "open-mcp",
				label: "Abrir Conexiones",
				hint: "MCP y estado",
				action: () => vm.setView("mcp"),
			},
			{
				id: "open-settings",
				label: "Abrir Ajustes",
				hint: "Centro de control",
				action: () => vm.setView("settings"),
			},
			{
				id: "open-review",
				label: "Abrir Revisión",
				hint: vm.selectedAgent
					? `Agent ${vm.selectedAgent.id.slice(0, 8)}`
					: "Primero elegí una tarea",
				action: () => {
					if (vm.selectedAgent) {
						vm.setView("review");
					}
				},
			},
			{
				id: "open-selected-workspace",
				label: "Abrir Espacio en IDE",
				hint: selectedWorkspace?.name || "No hay espacio seleccionado",
				action: () => {
					if (vm.selectedWorkspaceId) {
						vm.openWorkspaceInIde(vm.selectedWorkspaceId);
					}
				},
			},
		];
	}, [
		vm.selectedWorkspaceId,
		vm.selectedAgent,
		vm.workspaces,
		vm.setView,
		vm.openWorkspaceInIde,
	]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setPaletteOpen((prev) => !prev);
				return;
			}
			if (event.key === "Escape" && paletteOpen) {
				event.preventDefault();
				setPaletteOpen(false);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [paletteOpen]);

	const screen =
		vm.view === "review" && vm.selectedAgent ? (
			<ReviewScreen vm={vm} />
		) : vm.view === "projects" ? (
			<ProjectsScreen vm={vm} />
		) : vm.view === "sessions" ? (
			<SessionsScreen vm={vm} />
		) : vm.view === "workspaces" ? (
			<WorkspacesScreen vm={vm} />
		) : vm.view === "runs" ? (
			<RunsScreen vm={vm} />
		) : vm.view === "spawn" ? (
			<SpawnScreen vm={vm} />
		) : vm.view === "mcp" ? (
			<McpScreen vm={vm} />
		) : vm.view === "settings" ? (
			<SettingsScreen vm={vm} />
		) : (
			<DashboardScreen vm={vm} />
		);

	return (
		<>
			{screen}
			<CommandPalette
				commands={commands}
				cursor={paletteCursor}
				onChangeCursor={setPaletteCursor}
				onChangeQuery={setPaletteQuery}
				onClose={() => setPaletteOpen(false)}
				onExecute={(command) => {
					command.action();
					setPaletteOpen(false);
					setPaletteQuery("");
					setPaletteCursor(0);
				}}
				open={paletteOpen}
				query={paletteQuery}
			/>
		</>
	);
}

export default App;

import { useEffect, useMemo, useRef } from "react";

export interface CommandItem {
	id: string;
	label: string;
	hint?: string;
	action: () => void;
}

interface CommandPaletteProps {
	open: boolean;
	query: string;
	cursor: number;
	commands: CommandItem[];
	onChangeQuery: (value: string) => void;
	onChangeCursor: (value: number) => void;
	onClose: () => void;
	onExecute: (command: CommandItem) => void;
}

export function CommandPalette({
	open,
	query,
	cursor,
	commands,
	onChangeQuery,
	onChangeCursor,
	onClose,
	onExecute,
}: CommandPaletteProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	const filtered = useMemo(() => {
		const term = query.trim().toLowerCase();
		if (!term) {
			return commands;
		}
		return commands.filter((command) =>
			`${command.label} ${command.hint || ""}`.toLowerCase().includes(term),
		);
	}, [commands, query]);

	useEffect(() => {
		if (!open) {
			return;
		}
		inputRef.current?.focus();
	}, [open]);

	if (!open) {
		return null;
	}

	const selectedIndex = Math.min(cursor, Math.max(0, filtered.length - 1));

	return (
		<div
			aria-label="Command Palette"
			className="command-palette-overlay"
			onClick={onClose}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					onClose();
				}
			}}
			role="dialog"
		>
			<div
				className="command-palette"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="command-palette-header">
					<input
						ref={inputRef}
						onChange={(event) => {
							onChangeQuery(event.target.value);
							onChangeCursor(0);
						}}
						onKeyDown={(event) => {
							if (event.key === "ArrowDown") {
								event.preventDefault();
								onChangeCursor(
									Math.min(selectedIndex + 1, Math.max(0, filtered.length - 1)),
								);
								return;
							}
							if (event.key === "ArrowUp") {
								event.preventDefault();
								onChangeCursor(Math.max(0, selectedIndex - 1));
								return;
							}
							if (event.key === "Enter") {
								event.preventDefault();
								const selected = filtered[selectedIndex];
								if (selected) {
									onExecute(selected);
								}
							}
						}}
						placeholder="Type a command..."
						type="text"
						value={query}
					/>
				</div>
				<div className="command-palette-list">
					{filtered.length === 0 && (
						<p className="command-empty">No matching commands.</p>
					)}
					{filtered.map((command, index) => (
						<button
							className={`command-item ${index === selectedIndex ? "active" : ""}`}
							key={command.id}
							onClick={() => onExecute(command)}
							type="button"
						>
							<span>{command.label}</span>
							{command.hint && <small>{command.hint}</small>}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

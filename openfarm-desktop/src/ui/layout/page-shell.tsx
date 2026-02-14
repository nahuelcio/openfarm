import type { ReactNode } from "react";

interface PageShellProps {
	title: string;
	onBack?: () => void;
	headerActions?: ReactNode;
	children: ReactNode;
}

export function PageShell({
	title,
	onBack,
	headerActions,
	children,
}: PageShellProps) {
	return (
		<div className="app">
			<header className="header">
				<h1>{title}</h1>
				<div className="header-actions">
					{headerActions}
					{onBack && (
						<button className="back-btn" onClick={onBack} type="button">
							Volver
						</button>
					)}
				</div>
			</header>
			<main className="main">{children}</main>
		</div>
	);
}

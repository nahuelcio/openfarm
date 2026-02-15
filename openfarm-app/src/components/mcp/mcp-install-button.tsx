import { Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface McpInstallButtonProps {
	installed: boolean;
	loading?: boolean;
	onInstall: () => void;
	onUninstall: () => void;
}

export function McpInstallButton({
	installed,
	loading = false,
	onInstall,
	onUninstall,
}: McpInstallButtonProps) {
	if (loading) {
		return (
			<Button disabled size="sm">
				<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				Installing
			</Button>
		);
	}

	if (installed) {
		return (
			<Button variant="outline" size="sm" onClick={onUninstall}>
				<Check className="mr-2 h-4 w-4" />
				Installed
			</Button>
		);
	}

	return (
		<Button size="sm" onClick={() => {
			console.log("Install button clicked");
			onInstall();
		}}>
			<Plus className="mr-2 h-4 w-4" />
			Add
		</Button>
	);
}

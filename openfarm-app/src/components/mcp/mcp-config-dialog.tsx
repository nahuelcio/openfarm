"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ProviderConfig, AgentProvider } from "@/lib/store";
import { cn } from "@/lib/utils";

interface McpConfigDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (config: {
		mcpId: string;
		provider: AgentProvider;
		config: Record<string, any>;
	}) => void;
	mcpId: string;
	mcpName: string;
	mcpConfigSchema: Record<string, any>;
	providers: ProviderConfig[];
}

const PROVIDER_COLORS: Record<string, string> = {
	"claude-code": "#d97756",
	codex: "#10a37f",
	opencode: "#06b6d4",
};

export function McpConfigDialog({
	open,
	onClose,
	onSubmit,
	mcpId,
	mcpName,
	mcpConfigSchema,
	providers,
}: McpConfigDialogProps) {
	const [selectedProvider, setSelectedProvider] = useState<AgentProvider>(
		(providers[0]?.id as AgentProvider) || "claude-code",
	);
	const [configValues, setConfigValues] = useState<Record<string, string>>({});

	// Initialize config values with empty strings
	const handleProviderChange = (providerId: AgentProvider) => {
		setSelectedProvider(providerId);
		// Reset config values when provider changes
		const newConfigValues: Record<string, string> = {};
		Object.keys(mcpConfigSchema).forEach((key) => {
			newConfigValues[key] = "";
		});
		setConfigValues(newConfigValues);
	};

	const handleSubmit = () => {
		// Validate required fields
		const missingFields = Object.entries(mcpConfigSchema)
			.filter(([key, schema]) => schema.required && !configValues[key]?.trim())
			.map(([key]) => key);

		if (missingFields.length > 0) {
			alert(`Please fill in required fields: ${missingFields.join(", ")}`);
			return;
		}

		onSubmit({
			mcpId,
			provider: selectedProvider,
			config: configValues,
		});
		onClose();
	};

	const handleConfigChange = (key: string, value: string) => {
		setConfigValues((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Install {mcpName}</DialogTitle>
					<DialogDescription>
						Select a provider and configure the MCP settings
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Provider selector */}
					<div>
						<label className="text-sm font-medium text-foreground mb-3 block">
							Select Provider
						</label>
						<div className="flex items-center gap-2 flex-wrap">
							{providers.map((provider) => {
								const color = PROVIDER_COLORS[provider.id];
								const isSelected = selectedProvider === provider.id;
								return (
									<button
										key={provider.id}
										className={cn(
											"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
											isSelected
												? "border-transparent"
												: "bg-secondary text-muted-foreground border-border hover:bg-accent",
										)}
										style={
											isSelected
												? {
														backgroundColor: `${color}15`,
														color,
														borderColor: `${color}33`,
													}
												: undefined
										}
										onClick={() => handleProviderChange(provider.id)}
									>
										<span
											className="h-2 w-2 rounded-full"
											style={{
												backgroundColor: isSelected
													? color
													: "hsl(var(--muted-foreground))",
											}}
										/>
										{provider.name}
									</button>
								);
							})}
						</div>
					</div>

					{/* Configuration fields */}
					{Object.keys(mcpConfigSchema).length > 0 && (
						<div>
							<label className="text-sm font-medium text-foreground mb-3 block">
								Configuration
							</label>
							<div className="space-y-3">
								{Object.entries(mcpConfigSchema).map(([key, schema]) => {
									// Validar que schema exista y tenga las propiedades necesarias
									if (!schema || typeof schema !== 'object') {
										console.warn(`Invalid schema for key: ${key}`, schema);
										return null;
									}
									
									return (
										<div key={key}>
											<label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
												{schema?.description || key}
												{schema?.required && <span className="text-red-500 ml-1">*</span>}
											</label>
											<input
												type={schema?.type === "string" ? "text" : "password"}
												value={configValues[key] || ""}
												onChange={(e) => handleConfigChange(key, e.target.value)}
												placeholder={`Enter ${schema?.description?.toLowerCase?.() || 'value'}`}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
											/>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center justify-end gap-2 pt-4">
						<Button
							variant="ghost"
							onClick={onClose}
							className="text-muted-foreground hover:text-foreground"
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							className="bg-primary text-primary-foreground hover:bg-primary/90"
						>
							Install MCP
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

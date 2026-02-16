"use client";

import { Globe, Key, Save, Settings, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/backend";
import type { AppSettings } from "@/lib/store";

interface UserSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: AppSettings;
	onSettingsChange: (settings: AppSettings) => void;
}

export function UserSettingsDialog({
	open,
	onOpenChange,
	settings,
	onSettingsChange,
}: UserSettingsDialogProps) {
	const [currentUser, setCurrentUser] = useState<string>("Unknown User");
	const [azureOrgUrl, setAzureOrgUrl] = useState(settings.azureDevOps?.orgUrl || "");
	const [azurePat, setAzurePat] = useState(settings.azureDevOps?.pat || "");
	const [azureProject, setAzureProject] = useState(settings.azureDevOps?.project || "");

	const formatUsername = (username: string) => {
		return username
			.toLowerCase()
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const getInitials = (username: string) => {
		return username
			.split(' ')
			.map(word => word.charAt(0).toUpperCase())
			.slice(0, 2)
			.join('');
	};

	useEffect(() => {
		void getCurrentUser().then(setCurrentUser);
	}, []);

	const handleSave = () => {
		const updatedSettings = {
			...settings,
			azureDevOps: {
				orgUrl: azureOrgUrl,
				pat: azurePat,
				project: azureProject,
				repoId: settings.azureDevOps?.repoId || "",
				connected: Boolean(azureOrgUrl && azurePat && azureProject),
			},
		};
		onSettingsChange(updatedSettings);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						Configuración de Usuario
					</DialogTitle>
					<DialogDescription>
						Configura tu perfil y parámetros de integración
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* User Info Section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 pb-2 border-b">
							<User className="h-4 w-4 text-muted-foreground" />
							<h3 className="text-sm font-medium">Información de Usuario</h3>
						</div>
						<div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
							<div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
								<span className="text-sm font-semibold text-primary">
									{getInitials(currentUser)}
								</span>
							</div>
							<div className="flex-1">
								<p className="font-medium">{formatUsername(currentUser)}</p>
								<p className="text-sm text-muted-foreground">
									Usuario actual del sistema
								</p>
							</div>
							<Badge variant="secondary">Activo</Badge>
						</div>
					</div>

					<Separator />

					{/* Azure DevOps Section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 pb-2">
							<Globe className="h-4 w-4 text-muted-foreground" />
							<h3 className="text-sm font-medium">Azure DevOps Integration</h3>
						</div>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="azure-org-url">Organization URL</Label>
								<Input
									id="azure-org-url"
									placeholder="https://dev.azure.com/your-org"
									value={azureOrgUrl}
									onChange={(e) => setAzureOrgUrl(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="azure-pat" className="flex items-center gap-2">
									<Key className="h-4 w-4" />
									Personal Access Token (PAT)
								</Label>
								<Input
									id="azure-pat"
									type="password"
									placeholder="Tu PAT de Azure DevOps"
									value={azurePat}
									onChange={(e) => setAzurePat(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground">
									El PAT se almacena de forma segura y se usa para integración
									con Azure DevOps
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="azure-project">Project Name</Label>
								<Input
									id="azure-project"
									placeholder="nombre-del-proyecto"
									value={azureProject}
									onChange={(e) => setAzureProject(e.target.value)}
								/>
							</div>
						</div>
					</div>

					<Separator />

					{/* Status Summary */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 pb-2">
							<Globe className="h-4 w-4 text-muted-foreground" />
							<h3 className="text-sm font-medium">Estado de Conexión</h3>
						</div>
						
						{azureOrgUrl && azurePat && azureProject && (
							<div className="rounded-lg border border-border bg-secondary/30 p-3">
								<h4 className="text-xs font-medium text-foreground mb-2">
									Configuración Azure DevOps
								</h4>
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
										<span className="text-[10px] text-muted-foreground">
											Organization configurada
										</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
										<span className="text-[10px] text-muted-foreground">
											Autenticación lista
										</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
										<span className="text-[10px] text-muted-foreground">
											Proyecto: {azureProject}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button onClick={handleSave} className="flex items-center gap-2">
						<Save className="h-4 w-4" />
						Guardar Cambios
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

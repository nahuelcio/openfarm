import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { McpInstallButton } from "./mcp-install-button";
import { 
	Github, 
	Palette, 
	Database, 
	Layout, 
	FileText, 
	TestTube, 
	Box, 
	ChevronDown, 
	ChevronUp,
	HelpCircle,
	ExternalLink
} from "lucide-react";
import { useState } from "react";

interface McpCardProps {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: string;
	installed: boolean;
	loading?: boolean;
	onInstall: () => void;
	onUninstall: () => void;
	configSchema?: Record<string, any>;
	docsUrl?: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
	github: Github,
	figma: Palette,
	database: Database,
	linear: Layout,
	notion: FileText,
	playwright: TestTube,
	default: Box,
};

const configHelp: Record<string, string> = {
	context7ApiKey: "Get your API key from context7.com after signing up for a free account",
	figmaToken: "Create a personal access token in Figma → Account → Personal access tokens",
	token: "Generate a personal access token in GitHub → Settings → Developer settings → Personal access tokens",
	apiKey: "Obtain API key from the service's developer portal or account settings",
	linearApiKey: "Create API key in Linear → Settings → API → Create new API key",
	notionApiKey: "Generate integration token in Notion → Settings & Members → Integrations",
	browserType: "Choose which browser to use: chromium, firefox, or webkit",
	organizationId: "Find your organization ID in Linear → Settings → General",
};

export function McpCard({
	id,
	name,
	description,
	icon,
	category,
	installed,
	loading,
	onInstall,
	onUninstall,
	configSchema,
	docsUrl,
}: McpCardProps) {
	const [configOpen, setConfigOpen] = useState(false);
	const IconComponent = iconMap[icon] || iconMap.default;

	return (
		<Card className="flex flex-col">
			<CardHeader className="flex flex-row items-center gap-3 pb-3">
				<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
					<IconComponent className="h-6 w-6 text-primary" />
				</div>
				<div className="flex-1">
					<CardTitle className="text-lg">{name}</CardTitle>
					<div className="flex items-center gap-2 mt-1">
						<Badge variant="secondary" className="text-xs">
							{category}
						</Badge>
						{docsUrl && (
							<Button
								variant="ghost"
								size="sm"
								className="h-6 px-2 text-xs"
								asChild
							>
								<a
									href={docsUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1"
								>
									<ExternalLink className="h-3 w-3" />
									Docs
								</a>
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex-1">
				<p className="text-sm text-muted-foreground mb-4">{description}</p>
				
				{/* Configuration Help Section */}
				{configSchema && Object.keys(configSchema).length > 0 && (
					<Collapsible open={configOpen} onOpenChange={setConfigOpen}>
						<CollapsibleTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="w-full justify-start h-8 px-2 text-xs"
							>
								<HelpCircle className="h-3.5 w-3.5 mr-2" />
								Configuration Required
								{configOpen ? (
									<ChevronUp className="h-3.5 w-3.5 ml-auto" />
								) : (
									<ChevronDown className="h-3.5 w-3.5 ml-auto" />
								)}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="space-y-2 mt-2">
							<div className="rounded-md bg-secondary/50 p-3">
								<div className="text-xs font-medium text-foreground mb-2">
									Required Configuration:
								</div>
								{Object.entries(configSchema).map(([key, schema]) => (
									<div key={key} className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="text-xs font-medium text-primary">
												{key}
											</span>
											{schema.required && (
												<span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
													Required
												</span>
											)}
										</div>
										<div className="text-xs text-muted-foreground">
											{schema.description}
										</div>
										{configHelp[key] && (
											<div className="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded border border-blue-200">
												💡 {configHelp[key]}
											</div>
										)}
									</div>
								))}
							</div>
						</CollapsibleContent>
					</Collapsible>
				)}
			</CardContent>
			<CardFooter>
				<McpInstallButton
					installed={installed}
					loading={loading}
					onInstall={onInstall}
					onUninstall={onUninstall}
				/>
			</CardFooter>
		</Card>
	);
}

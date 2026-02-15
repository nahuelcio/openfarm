import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { McpInstallButton } from "./mcp-install-button";

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
}

const iconMap: Record<string, string> = {
	github: "🐙",
	figma: "🎨",
	database: "💾",
	linear: "📋",
	notion: "📝",
	playwright: "🧪",
	default: "📦",
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
}: McpCardProps) {
	const iconEmoji = iconMap[icon] || iconMap.default;

	return (
		<Card className="flex flex-col">
			<CardHeader className="flex flex-row items-center gap-3 pb-2">
				<span className="text-3xl">{iconEmoji}</span>
				<div className="flex-1">
					<CardTitle className="text-lg">{name}</CardTitle>
					<Badge variant="secondary" className="mt-1 text-xs">
						{category}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="flex-1">
				<p className="text-sm text-muted-foreground">{description}</p>
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

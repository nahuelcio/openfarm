"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AgentProvider, HookConfig } from "@/lib/store";

interface HookConfigDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (config: HookConfig) => void;
	hook?: HookConfig;
	provider: AgentProvider;
	providerName: string;
}

const COMMON_HOOK_EVENTS = [
	"agent.started",
	"agent.completed",
	"agent.failed",
	"message.received",
	"message.sent",
	"tool.executed",
	"file.created",
	"file.modified",
	"file.deleted",
	"error.occurred",
];

const HOOK_TEMPLATES = [
	{
		name: "Slack Notification",
		type: "after" as const,
		script: `// Send notification to Slack when agent completes
fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: \`Agent \${context.agentName} completed task: \${context.task}\`
  })
});`,
		triggerEvents: ["agent.completed"],
	},
	{
		name: "Email Notification",
		type: "after" as const,
		script: `// Send email notification
// This would integrate with your email service
console.log('Sending email notification for agent:', context.agentName);`,
		triggerEvents: ["agent.completed", "agent.failed"],
	},
	{
		name: "Error Logger",
		type: "error" as const,
		script: `// Log errors to external service
fetch('/api/log-error', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    error: context.error,
    agent: context.agentName,
    timestamp: new Date().toISOString()
  })
});`,
		triggerEvents: ["agent.failed", "error.occurred"],
	},
	{
		name: "Task Logger",
		type: "before" as const,
		script: `// Log task start
console.log('Starting task:', context.task);
console.log('Agent:', context.agentName);
console.log('Provider:', context.provider);`,
		triggerEvents: ["agent.started"],
	},
];

export function HookConfigDialog({
	open,
	onClose,
	onSubmit,
	hook,
	provider,
	providerName,
}: HookConfigDialogProps) {
	const [config, setConfig] = useState<Partial<HookConfig>>(
		hook || {
			id: "",
			name: "",
			type: "after",
			script: "",
			enabled: true,
			triggerEvents: [],
			customSettings: {},
		},
	);

	const isEdit = !!hook;

	const handleSubmit = () => {
		if (!config.id?.trim() || !config.name?.trim() || !config.script?.trim()) {
			alert("Please fill in all required fields");
			return;
		}

		if (!config.triggerEvents || config.triggerEvents.length === 0) {
			alert("Please select at least one trigger event");
			return;
		}

		const finalConfig: HookConfig = {
			id: config.id!,
			name: config.name!,
			type: config.type!,
			script: config.script!,
			enabled: config.enabled ?? true,
			triggerEvents: config.triggerEvents!,
			customSettings: config.customSettings || {},
		};

		onSubmit(finalConfig);
		onClose();
	};

	const updateTriggerEvents = (event: string, checked: boolean) => {
		const currentEvents = config.triggerEvents || [];
		let updatedEvents: string[];

		if (checked) {
			updatedEvents = [...currentEvents, event];
		} else {
			updatedEvents = currentEvents.filter((e) => e !== event);
		}

		setConfig({ ...config, triggerEvents: updatedEvents });
	};

	const applyTemplate = (template: (typeof HOOK_TEMPLATES)[0]) => {
		setConfig({
			...config,
			name: template.name,
			type: template.type,
			script: template.script,
			triggerEvents: template.triggerEvents,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Hook" : "Add Hook"} - {providerName}
					</DialogTitle>
					<DialogDescription>
						Create hooks that trigger on specific events to extend agent
						functionality.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Templates */}
					{!isEdit && (
						<div>
							<Label className="text-sm font-medium">Hook Templates</Label>
							<div className="grid grid-cols-2 gap-2 mt-2">
								{HOOK_TEMPLATES.map((template) => (
									<Button
										key={template.name}
										variant="outline"
										size="sm"
										onClick={() => applyTemplate(template)}
										className="justify-start"
									>
										{template.name}
									</Button>
								))}
							</div>
						</div>
					)}

					{/* Basic Configuration */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="hook-id">Hook ID *</Label>
								<Input
									id="hook-id"
									value={config.id || ""}
									onChange={(e) => setConfig({ ...config, id: e.target.value })}
									placeholder="slack-notifier"
									disabled={isEdit}
								/>
							</div>
							<div>
								<Label htmlFor="hook-name">Display Name *</Label>
								<Input
									id="hook-name"
									value={config.name || ""}
									onChange={(e) =>
										setConfig({ ...config, name: e.target.value })
									}
									placeholder="Slack Notifier"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="hook-type">Hook Type *</Label>
								<Select
									value={config.type || "after"}
									onValueChange={(value: "before" | "after" | "error") =>
										setConfig({ ...config, type: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="before">
											Before - Runs before event
										</SelectItem>
										<SelectItem value="after">
											After - Runs after event
										</SelectItem>
										<SelectItem value="error">Error - Runs on error</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center space-x-2">
								<Switch
									id="hook-enabled"
									checked={config.enabled ?? true}
									onCheckedChange={(checked) =>
										setConfig({ ...config, enabled: checked })
									}
								/>
								<Label htmlFor="hook-enabled">Enable this hook</Label>
							</div>
						</div>
					</div>

					{/* Trigger Events */}
					<div>
						<Label className="text-sm font-medium">Trigger Events *</Label>
						<div className="grid grid-cols-2 gap-2 mt-2">
							{COMMON_HOOK_EVENTS.map((event) => (
								<div key={event} className="flex items-center space-x-2">
									<input
										type="checkbox"
										id={`event-${event}`}
										checked={config.triggerEvents?.includes(event) || false}
										onChange={(e) =>
											updateTriggerEvents(event, e.target.checked)
										}
										className="rounded"
									/>
									<Label htmlFor={`event-${event}`} className="text-sm">
										{event}
									</Label>
								</div>
							))}
						</div>
					</div>

					{/* Hook Script */}
					<div>
						<Label htmlFor="hook-script">Hook Script *</Label>
						<Textarea
							id="hook-script"
							value={config.script || ""}
							onChange={(e) => setConfig({ ...config, script: e.target.value })}
							placeholder="// JavaScript code that will be executed
// Available context variables:
// - context.agentName: string
// - context.task: string  
// - context.provider: string
// - context.error?: string (for error hooks)
// - context.timestamp: string

console.log('Hook executed:', context);"
							rows={12}
							className="font-mono text-sm"
						/>
						<p className="text-xs text-muted-foreground mt-1">
							JavaScript code that will be executed when the hook triggers.
							Context variables are available in the script.
						</p>
					</div>

					{/* Context Variables Reference */}
					<div className="p-3 bg-secondary/30 rounded-lg">
						<p className="text-xs font-medium text-foreground mb-2">
							Available Context Variables:
						</p>
						<div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
							<div>
								<code>context.agentName</code> - Name of the agent
							</div>
							<div>
								<code>context.task</code> - Current task description
							</div>
							<div>
								<code>context.provider</code> - Provider name
							</div>
							<div>
								<code>context.timestamp</code> - Event timestamp
							</div>
							<div>
								<code>context.error</code> - Error message (error hooks only)
							</div>
							<div>
								<code>context.message</code> - Message content (message hooks
								only)
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-end gap-2 pt-4">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button onClick={handleSubmit}>
							{isEdit ? "Update Hook" : "Add Hook"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

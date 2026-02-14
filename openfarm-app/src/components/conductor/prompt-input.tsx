"use client";

import {
	ArrowUp,
	AtSign,
	FileCode2,
	File as FileIcon,
	FileImage,
	FileText,
	Paperclip,
	Slash,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AgentProvider, Attachment } from "@/lib/store";
import { cn } from "@/lib/utils";

function fileTypeFromName(name: string): Attachment["type"] {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext))
		return "image";
	if (
		[
			"ts",
			"tsx",
			"js",
			"jsx",
			"py",
			"rs",
			"go",
			"css",
			"html",
			"json",
			"sql",
		].includes(ext)
	)
		return "code";
	if (["md", "txt", "pdf", "doc", "docx"].includes(ext)) return "document";
	return "other";
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function AttachmentTypeIcon({ type }: { type: Attachment["type"] }) {
	switch (type) {
		case "image":
			return <FileImage className="h-3 w-3 text-primary" />;
		case "code":
			return <FileCode2 className="h-3 w-3 text-agent-active" />;
		case "document":
			return <FileText className="h-3 w-3 text-warning" />;
		default:
			return <FileIcon className="h-3 w-3 text-muted-foreground" />;
	}
}

const PROVIDER_LABELS: Record<AgentProvider, { label: string; color: string }> =
	{
		"claude-code": { label: "claude-code", color: "text-[#d97756]" },
		codex: { label: "codex", color: "text-[#10a37f]" },
		opencode: { label: "opencode", color: "text-[#06b6d4]" },
	};

interface PromptInputProps {
	onSend: (message: string, attachments?: Attachment[]) => void;
	disabled?: boolean;
	placeholder?: string;
	provider?: AgentProvider;
	model?: string;
}

export function PromptInput({
	onSend,
	disabled,
	placeholder = "Ask the agent anything...",
	provider = "claude-code",
	model,
}: PromptInputProps) {
	const [value, setValue] = useState("");
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = () => {
		if ((value.trim() || attachments.length > 0) && !disabled) {
			onSend(value.trim(), attachments.length > 0 ? attachments : undefined);
			setValue("");
			setAttachments([]);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		const newAttachments: Attachment[] = Array.from(files).map((file) => ({
			id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			name: file.name,
			type: fileTypeFromName(file.name),
			size: formatSize(file.size),
		}));
		setAttachments((prev) => [...prev, ...newAttachments]);
		// Reset file input
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const removeAttachment = (id: string) => {
		setAttachments((prev) => prev.filter((a) => a.id !== id));
	};

	const providerInfo = PROVIDER_LABELS[provider];

	return (
		<div className="border-t border-border bg-card px-4 py-3">
			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				onChange={handleFileSelect}
			/>

			{/* Attachment chips */}
			{attachments.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mb-2 px-1">
					{attachments.map((att) => (
						<div
							key={att.id}
							className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-secondary border border-border text-xs group"
						>
							<AttachmentTypeIcon type={att.type} />
							<span className="text-foreground font-medium truncate max-w-[120px]">
								{att.name}
							</span>
							<span className="text-muted-foreground">{att.size}</span>
							<button
								className="h-4 w-4 rounded flex items-center justify-center hover:bg-accent transition-colors ml-0.5"
								onClick={() => removeAttachment(att.id)}
								type="button"
							>
								<X className="h-2.5 w-2.5 text-muted-foreground" />
								<span className="sr-only">Remove attachment</span>
							</button>
						</div>
					))}
				</div>
			)}

			<div
				className={cn(
					"flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 transition-colors",
					"focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20",
				)}
			>
				{/* Action buttons */}
				<div className="flex items-center gap-0.5 pb-0.5">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
						onClick={() => fileInputRef.current?.click()}
						type="button"
					>
						<Paperclip className="h-4 w-4" />
						<span className="sr-only">Attach file</span>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
						type="button"
					>
						<AtSign className="h-4 w-4" />
						<span className="sr-only">Mention</span>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
						type="button"
					>
						<Slash className="h-4 w-4" />
						<span className="sr-only">Commands</span>
					</Button>
				</div>

				{/* Text area */}
				<textarea
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					rows={1}
					className={cn(
						"flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
						"focus:outline-none min-h-[32px] max-h-[120px] py-1.5 leading-relaxed",
					)}
					style={{
						height: "auto",
						overflow: "hidden",
					}}
					onInput={(e) => {
						const target = e.target as HTMLTextAreaElement;
						target.style.height = "auto";
						target.style.height = Math.min(target.scrollHeight, 120) + "px";
					}}
				/>

				{/* Send button */}
				<Button
					size="icon"
					className={cn(
						"h-7 w-7 rounded-lg shrink-0 mb-0.5 transition-all",
						value.trim() || attachments.length > 0
							? "bg-primary text-primary-foreground hover:bg-primary/90"
							: "bg-secondary text-muted-foreground cursor-not-allowed",
					)}
					disabled={(!value.trim() && attachments.length === 0) || disabled}
					onClick={handleSubmit}
					type="button"
				>
					<ArrowUp className="h-4 w-4" />
					<span className="sr-only">Send message</span>
				</Button>
			</div>

			{/* Hint */}
			<div className="flex items-center justify-between mt-2 px-1">
				<div className="flex items-center gap-3 text-[10px] text-muted-foreground">
					<span className="flex items-center gap-1">
						<kbd className="px-1 py-0.5 rounded bg-secondary text-[9px] font-mono border border-border">
							Enter
						</kbd>
						to send
					</span>
					<span className="flex items-center gap-1">
						<kbd className="px-1 py-0.5 rounded bg-secondary text-[9px] font-mono border border-border">
							Shift+Enter
						</kbd>
						for new line
					</span>
				</div>
				<span className={cn("text-[10px] font-mono", providerInfo.color)}>
					{providerInfo.label}
					{model && (
						<span className="text-muted-foreground ml-1">
							/ {model.split("-").slice(0, 2).join("-")}
						</span>
					)}
				</span>
			</div>
		</div>
	);
}

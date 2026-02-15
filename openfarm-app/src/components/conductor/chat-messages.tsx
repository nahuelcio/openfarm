"use client";

import {
	BotMessageSquare,
	FileCode2,
	File as FileIcon,
	FileImage,
	FileText,
	Terminal,
	User,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentMessage, Attachment } from "@/lib/store";
import { cn } from "@/lib/utils";

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function renderInlineMarkdown(value: string): string {
	return escapeHtml(value)
		.replace(
			/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
			(_match, label: string, url: string) =>
				`<a href="${url}" target="_blank" rel="noreferrer" class="text-primary underline underline-offset-2">${label}</a>`,
		)
		.replace(
			/`([^`]+)`/g,
			'<code class="rounded bg-secondary px-1 py-0.5 font-mono text-[12px]">$1</code>',
		)
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(?!\*)([^*]+)\*(?!\*)/g, "<em>$1</em>");
}

function renderMarkdownToHtml(content: string): string {
	const lines = content.replaceAll("\r\n", "\n").split("\n");
	const html: string[] = [];
	let codeFenceOpen = false;
	let codeLines: string[] = [];
	let listMode: null | "ul" | "ol" = null;

	const closeList = () => {
		if (listMode) {
			html.push(`</${listMode}>`);
			listMode = null;
		}
	};

	const flushCodeFence = () => {
		if (!codeFenceOpen) {
			return;
		}
		const code = escapeHtml(codeLines.join("\n"));
		html.push(
			`<pre class="my-2 overflow-x-auto rounded-md border border-border bg-secondary/40 px-3 py-2"><code class="font-mono text-[12px] leading-relaxed">${code}</code></pre>`,
		);
		codeFenceOpen = false;
		codeLines = [];
	};

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("```")) {
			closeList();
			if (codeFenceOpen) {
				flushCodeFence();
			} else {
				codeFenceOpen = true;
				codeLines = [];
			}
			continue;
		}
		if (codeFenceOpen) {
			codeLines.push(line);
			continue;
		}
		if (!trimmed) {
			closeList();
			continue;
		}

		const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			closeList();
			const level = heading[1]?.length || 1;
			const text = renderInlineMarkdown(heading[2] || "");
			html.push(
				`<h${level} class="mt-3 mb-1 font-semibold text-foreground">${text}</h${level}>`,
			);
			continue;
		}

		if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
			closeList();
			html.push('<hr class="my-3 border-border/60" />');
			continue;
		}

		const unordered = trimmed.match(/^[-*+]\s+(.*)$/);
		if (unordered) {
			if (listMode !== "ul") {
				closeList();
				html.push('<ul class="my-1 ml-5 list-disc space-y-1">');
				listMode = "ul";
			}
			html.push(`<li>${renderInlineMarkdown(unordered[1] || "")}</li>`);
			continue;
		}

		const ordered = trimmed.match(/^\d+\.\s+(.*)$/);
		if (ordered) {
			if (listMode !== "ol") {
				closeList();
				html.push('<ol class="my-1 ml-5 list-decimal space-y-1">');
				listMode = "ol";
			}
			html.push(`<li>${renderInlineMarkdown(ordered[1] || "")}</li>`);
			continue;
		}

		closeList();
		html.push(`<p class="mb-2">${renderInlineMarkdown(trimmed)}</p>`);
	}

	flushCodeFence();
	closeList();
	return html.join("");
}

function FileChip({ name, onClick }: { name: string; onClick?: () => void }) {
	return (
		<button
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary text-[11px] font-mono text-muted-foreground border border-border transition-colors",
				onClick
					? "hover:bg-primary/10 hover:text-primary hover:border-primary/30 cursor-pointer"
					: "cursor-default hover:bg-accent",
			)}
			onClick={onClick}
			type="button"
		>
			<FileCode2 className="h-3 w-3 text-primary" />
			{name.split("/").pop()}
		</button>
	);
}

function AttachmentIcon({ type }: { type: Attachment["type"] }) {
	switch (type) {
		case "image":
			return <FileImage className="h-3.5 w-3.5 text-primary" />;
		case "code":
			return <FileCode2 className="h-3.5 w-3.5 text-agent-active" />;
		case "document":
			return <FileText className="h-3.5 w-3.5 text-warning" />;
		default:
			return <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />;
	}
}

function AttachmentCard({ attachment }: { attachment: Attachment }) {
	return (
		<div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs">
			<AttachmentIcon type={attachment.type} />
			<span className="text-foreground font-medium truncate max-w-[140px]">
				{attachment.name}
			</span>
			<span className="text-muted-foreground">{attachment.size}</span>
		</div>
	);
}

function MessageBubble({
	message,
	onFileClick,
}: {
	message: AgentMessage;
	onFileClick?: (filename: string) => void;
}) {
	if (message.role === "system") {
		return (
			<div className="flex items-start gap-3 px-5 py-2">
				<div className="h-6 w-6 rounded bg-secondary flex items-center justify-center shrink-0 mt-0.5">
					<Terminal className="h-3.5 w-3.5 text-muted-foreground" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="text-[12px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
						{message.content}
					</div>
					{message.files && message.files.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mt-2">
							{message.files.map((file) => (
								<FileChip
									key={file}
									name={file}
									onClick={onFileClick ? () => onFileClick(file) : undefined}
								/>
							))}
						</div>
					)}
				</div>
				<span className="mt-1 hidden shrink-0 text-[10px] text-muted-foreground lg:block">
					{message.timestamp}
				</span>
			</div>
		);
	}

	if (message.role === "user") {
		return (
			<div className="flex items-start gap-3 px-5 py-3">
				<div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
					<User className="h-3.5 w-3.5 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-[13px] text-foreground leading-relaxed">
						{message.content}
					</p>
					{message.attachments && message.attachments.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mt-2">
							{message.attachments.map((att) => (
								<AttachmentCard key={att.id} attachment={att} />
							))}
						</div>
					)}
				</div>
				<span className="mt-1 hidden shrink-0 text-[10px] text-muted-foreground lg:block">
					{message.timestamp}
				</span>
			</div>
		);
	}

	// Agent message
	return (
		<div className="flex items-start gap-3 px-5 py-3">
			<div className="h-6 w-6 rounded bg-accent flex items-center justify-center shrink-0 mt-0.5">
				<BotMessageSquare className="h-3.5 w-3.5 text-foreground" />
			</div>
			<div className="flex-1 min-w-0">
				{message.thinking && (
					<div className="flex items-center gap-2 mb-2">
						<div className="flex items-center gap-1">
							<span className="h-1 w-1 rounded-full bg-primary animate-pulse-dot" />
							<span
								className="h-1 w-1 rounded-full bg-primary animate-pulse-dot"
								style={{ animationDelay: "0.2s" }}
							/>
							<span
								className="h-1 w-1 rounded-full bg-primary animate-pulse-dot"
								style={{ animationDelay: "0.4s" }}
							/>
						</div>
						<span className="text-[11px] text-muted-foreground">
							Thinking...
						</span>
					</div>
				)}
				<div
					className="text-[13px] text-foreground leading-relaxed"
					dangerouslySetInnerHTML={{
						__html: renderMarkdownToHtml(message.content),
					}}
				/>
				{message.files && message.files.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mt-2">
						{message.files.map((file) => (
							<FileChip
								key={file}
								name={file}
								onClick={onFileClick ? () => onFileClick(file) : undefined}
							/>
						))}
					</div>
				)}
			</div>
			<span className="mt-1 hidden shrink-0 text-[10px] text-muted-foreground lg:block">
				{message.timestamp}
			</span>
		</div>
	);
}

interface ChatMessagesProps {
	messages: AgentMessage[];
	isRunning?: boolean;
	onFileClick?: (filename: string) => void;
}

export function ChatMessages({
	messages,
	isRunning,
	onFileClick,
}: ChatMessagesProps) {
	const hasThinkingMessage = messages.some(
		(message) => message.role === "agent" && message.thinking,
	);

	return (
		<ScrollArea className="flex-1">
			<div className="divide-y divide-border/50">
				{messages.map((message) => (
					<MessageBubble
						key={message.id}
						message={message}
						onFileClick={onFileClick}
					/>
				))}
			</div>

			{/* Live activity indicator */}
			{isRunning && !hasThinkingMessage && (
				<div className="px-5 py-3 border-t border-border/50">
					<div className="flex items-center gap-3">
						<div className="h-6 w-6 rounded bg-accent flex items-center justify-center">
							<BotMessageSquare className="h-3.5 w-3.5 text-foreground" />
						</div>
						<div className="flex items-center gap-2">
							<div className="flex items-center gap-1">
								<span className="h-1.5 w-1.5 rounded-full bg-agent-active animate-pulse-dot" />
								<span
									className="h-1.5 w-1.5 rounded-full bg-agent-active animate-pulse-dot"
									style={{ animationDelay: "0.3s" }}
								/>
								<span
									className="h-1.5 w-1.5 rounded-full bg-agent-active animate-pulse-dot"
									style={{ animationDelay: "0.6s" }}
								/>
							</div>
							<span className="text-xs text-muted-foreground">
								Agent is working...
							</span>
						</div>
					</div>
				</div>
			)}
		</ScrollArea>
	);
}

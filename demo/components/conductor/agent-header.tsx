"use client"

import {
  GitBranch,
  ExternalLink,
  MoreHorizontal,
  FileCode2,
  GitPullRequest,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Circle,
  FileDiff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Agent, AgentStatus, AgentProvider } from "@/lib/store"

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    running: "bg-agent-active",
    idle: "bg-agent-idle",
    completed: "bg-agent-active",
    error: "bg-agent-error",
    reviewing: "bg-primary",
  }
  return (
    <span className={cn("h-2 w-2 rounded-full shrink-0", colors[status], status === "running" && "animate-pulse")} />
  )
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const labels: Record<AgentStatus, string> = {
    running: "Running",
    idle: "Idle",
    completed: "Completed",
    error: "Error",
    reviewing: "Needs Review",
  }
  const icons: Record<AgentStatus, React.ReactNode> = {
    running: <Loader2 className="h-3 w-3 animate-spin" />,
    idle: <Circle className="h-3 w-3" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
    error: <AlertCircle className="h-3 w-3" />,
    reviewing: <Eye className="h-3 w-3" />,
  }
  const colors: Record<AgentStatus, string> = {
    running: "bg-agent-active/10 text-agent-active border-agent-active/20",
    idle: "bg-agent-idle/10 text-agent-idle border-agent-idle/20",
    completed: "bg-agent-active/10 text-agent-active border-agent-active/20",
    error: "bg-agent-error/10 text-agent-error border-agent-error/20",
    reviewing: "bg-primary/10 text-primary border-primary/20",
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border", colors[status])}>
      {icons[status]}
      {labels[status]}
    </span>
  )
}

const PROVIDER_COLORS: Record<AgentProvider, { bg: string; text: string; label: string }> = {
  "claude-code": { bg: "bg-[#d97756]/10", text: "text-[#d97756]", label: "Claude Code" },
  codex: { bg: "bg-[#10a37f]/10", text: "text-[#10a37f]", label: "Codex" },
  opencode: { bg: "bg-[#06b6d4]/10", text: "text-[#06b6d4]", label: "OpenCode" },
}

function ProviderTag({ provider, model }: { provider: AgentProvider; model?: string }) {
  const p = PROVIDER_COLORS[provider]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded", p.bg, p.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", p.text.replace("text-", "bg-"))} />
      {p.label}
      {model && (
        <span className="opacity-60">/ {model.split("-").slice(0, 2).join("-")}</span>
      )}
    </span>
  )
}

interface AgentHeaderProps {
  agent: Agent
  onViewChanges?: () => void
}

export function AgentHeader({ agent, onViewChanges }: AgentHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <StatusDot status={agent.status} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground truncate">{agent.name}</h1>
            <ProviderTag provider={agent.provider} model={agent.model} />
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              <span className="font-mono">{agent.branch}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{agent.startedAt}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={agent.status} />

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileCode2 className="h-3 w-3" />
            {agent.filesChanged} files
          </span>
          <span className="text-agent-active">+{agent.linesAdded}</span>
          <span className="text-agent-error">-{agent.linesRemoved}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {agent.diffs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-foreground hover:text-foreground hover:bg-accent"
              onClick={onViewChanges}
            >
              <FileDiff className="h-3.5 w-3.5" />
              View Changes
            </Button>
          )}

          {(agent.status === "completed" || agent.status === "reviewing") && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10">
              <GitPullRequest className="h-3.5 w-3.5" />
              Create PR
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <FolderOpen className="h-4 w-4 mr-2" />
                Open in Editor
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                View on GitHub
              </DropdownMenuItem>
              <DropdownMenuItem>
                <GitPullRequest className="h-4 w-4 mr-2" />
                Create Pull Request
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-agent-error">
                Stop Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

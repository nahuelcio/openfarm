"use client"

import { useState } from "react"
import { FolderGit2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AgentProvider, AppSettings } from "@/lib/store"

interface NewAgentDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { prompt: string; repo: string; provider: string; model: string }) => void
  settings: AppSettings
}

const REPOS = [
  { name: "conductor-labs/conductor", label: "conductor-app" },
  { name: "conductor-labs/api", label: "api-server" },
]

const PROVIDER_COLORS: Record<AgentProvider, string> = {
  "claude-code": "#d97756",
  codex: "#10a37f",
  opencode: "#06b6d4",
}

export function NewAgentDialog({ open, onClose, onSubmit, settings }: NewAgentDialogProps) {
  const [prompt, setPrompt] = useState("")
  const [selectedRepo, setSelectedRepo] = useState(REPOS[0])
  const defaultProviderConfig = settings.providers.find((p) => p.id === settings.defaultProvider)!
  const [selectedProvider, setSelectedProvider] = useState<AgentProvider>(settings.defaultProvider)
  const [selectedModel, setSelectedModel] = useState(defaultProviderConfig.defaultModel)

  const connectedProviders = settings.providers.filter((p) => p.connected)
  const currentProvider = connectedProviders.find((p) => p.id === selectedProvider)!

  if (!open) return null

  const handleProviderChange = (id: AgentProvider) => {
    setSelectedProvider(id)
    const p = settings.providers.find((pr) => pr.id === id)!
    setSelectedModel(p.defaultModel)
  }

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit({
        prompt: prompt.trim(),
        repo: selectedRepo.name,
        provider: selectedProvider,
        model: selectedModel,
      })
      setPrompt("")
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl mx-4">
        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Deploy New Agent</h2>

          {/* Provider selector */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {connectedProviders.map((provider) => {
              const color = PROVIDER_COLORS[provider.id]
              const isSelected = selectedProvider === provider.id
              return (
                <button
                  key={provider.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                    isSelected
                      ? "border-transparent"
                      : "bg-secondary text-muted-foreground border-border hover:bg-accent"
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: `${color}15`, color, borderColor: `${color}33` }
                      : undefined
                  }
                  onClick={() => handleProviderChange(provider.id)}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: isSelected ? color : "hsl(var(--muted-foreground))",
                    }}
                  />
                  {provider.name}
                </button>
              )
            })}
          </div>

          {/* Model selector */}
          <div className="mb-4">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
              Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-background text-sm text-foreground px-3 py-2 pr-8 focus:outline-none focus:border-primary/40"
              >
                {currentProvider?.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} - {m.description}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Repo selector */}
          <div className="mb-4">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
              Repository
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-9 text-sm bg-background border-border text-foreground">
                  <span className="flex items-center gap-2">
                    <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedRepo.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                {REPOS.map((repo) => (
                  <DropdownMenuItem key={repo.name} onClick={() => setSelectedRepo(repo)}>
                    <FolderGit2 className="h-3.5 w-3.5 mr-2" />
                    {repo.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Prompt */}
          <div className="mb-4">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
              Task
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what the agent should do..."
              rows={4}
              className={cn(
                "w-full resize-none rounded-lg border border-border bg-background px-3 py-2",
                "text-sm text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
                "leading-relaxed"
              )}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button
              disabled={!prompt.trim()}
              onClick={handleSubmit}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Deploy Agent
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

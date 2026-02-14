"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Titlebar } from "@/components/conductor/titlebar"
import { AppSidebar } from "@/components/conductor/app-sidebar"
import { AgentPanel } from "@/components/conductor/agent-panel"
import { EmptyState } from "@/components/conductor/empty-state"
import { NewAgentDialog } from "@/components/conductor/new-agent-dialog"
import { SettingsPanel } from "@/components/conductor/settings-panel"
import {
  SAMPLE_WORKSPACES,
  DEFAULT_SETTINGS,
  type Agent,
  type Workspace,
  type AppSettings,
  type Attachment,
} from "@/lib/store"

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [workspaces, setWorkspaces] = useState<Workspace[]>(SAMPLE_WORKSPACES)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(
    SAMPLE_WORKSPACES[0].agents[0]
  )
  const [newAgentOpen, setNewAgentOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
  }, [])

  const handleSendMessage = useCallback(
    (message: string, attachments?: Attachment[]) => {
      if (!selectedAgent) return

      const newMessage = {
        id: `m-${Date.now()}`,
        role: "user" as const,
        content: message,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        attachments,
      }

      setWorkspaces((prev) =>
        prev.map((ws) => ({
          ...ws,
          agents: ws.agents.map((a) => {
            if (a.id !== selectedAgent.id) return a
            return { ...a, messages: [...a.messages, newMessage] }
          }),
        }))
      )

      setSelectedAgent((prev) => {
        if (!prev) return prev
        return { ...prev, messages: [...prev.messages, newMessage] }
      })

      // Simulate agent response
      setTimeout(() => {
        const agentReply = {
          id: `m-${Date.now()}-reply`,
          role: "agent" as const,
          content:
            "Got it. I'm analyzing the codebase and working on this now. I'll update you as I make progress.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          thinking: true,
        }

        setWorkspaces((prev) =>
          prev.map((ws) => ({
            ...ws,
            agents: ws.agents.map((a) => {
              if (a.id !== selectedAgent.id) return a
              return { ...a, messages: [...a.messages, agentReply] }
            }),
          }))
        )

        setSelectedAgent((prev) => {
          if (!prev) return prev
          return { ...prev, messages: [...prev.messages, agentReply] }
        })
      }, 1500)
    },
    [selectedAgent]
  )

  const handleNewAgent = useCallback(
    (data: { prompt: string; repo: string; provider: string; model: string }) => {
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: data.prompt.slice(0, 40) + (data.prompt.length > 40 ? "..." : ""),
        repo: data.repo,
        branch: `feat/${data.prompt
          .slice(0, 20)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`,
        status: "running",
        provider: data.provider as Agent["provider"],
        model: data.model,
        prompt: data.prompt,
        filesChanged: 0,
        linesAdded: 0,
        linesRemoved: 0,
        startedAt: "just now",
        diffs: [],
        messages: [
          {
            id: `m-${Date.now()}-prompt`,
            role: "user",
            content: data.prompt,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          {
            id: `m-${Date.now()}-ack`,
            role: "agent",
            content:
              "Starting work on this task. Let me analyze the repository structure first...",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            thinking: true,
          },
        ],
      }

      setWorkspaces((prev) =>
        prev.map((ws) => {
          if (ws.repo === data.repo) {
            return { ...ws, agents: [...ws.agents, newAgent] }
          }
          return ws
        })
      )
      setSelectedAgent(newAgent)
    },
    []
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Titlebar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNewAgent={() => setNewAgentOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            "shrink-0 border-r border-border transition-all duration-200 overflow-hidden",
            sidebarOpen ? "w-72" : "w-0"
          )}
        >
          <AppSidebar
            workspaces={workspaces}
            selectedAgentId={selectedAgent?.id ?? null}
            onSelectAgent={handleSelectAgent}
            onNewAgent={() => setNewAgentOpen(true)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {selectedAgent ? (
            <AgentPanel agent={selectedAgent} onSendMessage={handleSendMessage} />
          ) : (
            <EmptyState onNewAgent={() => setNewAgentOpen(true)} />
          )}
        </main>
      </div>

      {/* New agent dialog */}
      <NewAgentDialog
        open={newAgentOpen}
        onClose={() => setNewAgentOpen(false)}
        onSubmit={handleNewAgent}
        settings={settings}
      />

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  )
}

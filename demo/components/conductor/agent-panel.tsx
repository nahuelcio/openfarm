"use client"

import { useState } from "react"
import type { Agent, Attachment } from "@/lib/store"
import { AgentHeader } from "./agent-header"
import { ChatMessages } from "./chat-messages"
import { PromptInput } from "./prompt-input"
import { DiffViewer } from "./diff-viewer"

interface AgentPanelProps {
  agent: Agent
  onSendMessage: (message: string, attachments?: Attachment[]) => void
}

export function AgentPanel({ agent, onSendMessage }: AgentPanelProps) {
  const [diffOpen, setDiffOpen] = useState(false)
  const [diffInitialFile, setDiffInitialFile] = useState<string | undefined>()

  const handleFileClick = (filename: string) => {
    if (agent.diffs.length > 0) {
      setDiffInitialFile(filename)
      setDiffOpen(true)
    }
  }

  const handleViewChanges = () => {
    setDiffInitialFile(undefined)
    setDiffOpen(true)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <AgentHeader agent={agent} onViewChanges={handleViewChanges} />
      <ChatMessages
        messages={agent.messages}
        isRunning={agent.status === "running"}
        onFileClick={handleFileClick}
      />
      <PromptInput
        onSend={onSendMessage}
        disabled={agent.status === "error"}
        provider={agent.provider}
        model={agent.model}
        placeholder={
          agent.status === "error"
            ? "Agent encountered an error. Fix the issue and retry."
            : "Ask the agent anything..."
        }
      />

      {/* Diff viewer overlay */}
      <DiffViewer
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        diffs={agent.diffs}
        agentName={agent.name}
        initialFile={diffInitialFile}
      />
    </div>
  )
}

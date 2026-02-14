"use client"

import { X, FileCode2, FilePlus2, FileX2, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import type { FileDiff } from "@/lib/store"

function DiffStatusIcon({ status }: { status: FileDiff["status"] }) {
  switch (status) {
    case "added":
      return <FilePlus2 className="h-3.5 w-3.5 text-agent-active shrink-0" />
    case "deleted":
      return <FileX2 className="h-3.5 w-3.5 text-agent-error shrink-0" />
    default:
      return <FileCode2 className="h-3.5 w-3.5 text-primary shrink-0" />
  }
}

function DiffStatusLabel({ status }: { status: FileDiff["status"] }) {
  const map = {
    added: { text: "Added", color: "text-agent-active bg-agent-active/10" },
    modified: { text: "Modified", color: "text-primary bg-primary/10" },
    deleted: { text: "Deleted", color: "text-agent-error bg-agent-error/10" },
  }
  const s = map[status]
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", s.color)}>
      {s.text}
    </span>
  )
}

function FileEntry({
  diff,
  isSelected,
  onClick,
}: {
  diff: FileDiff
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors",
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <DiffStatusIcon status={diff.status} />
      <div className="flex-1 min-w-0">
        <span className="text-[13px] text-foreground font-mono truncate block">
          {diff.filename}
        </span>
        <span className="text-[11px] text-muted-foreground truncate block">
          {diff.path}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-mono text-agent-active">+{diff.linesAdded}</span>
        <span className="text-[11px] font-mono text-agent-error">-{diff.linesRemoved}</span>
        <DiffStatusLabel status={diff.status} />
      </div>
    </button>
  )
}

function HunkView({ hunk, fileIndex }: { hunk: FileDiff["hunks"][number]; fileIndex: number }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground font-mono bg-secondary/50 w-full hover:bg-secondary transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0" />
        )}
        <span>
          @@ -{hunk.oldStart} +{hunk.newStart} @@
        </span>
      </button>
      {!collapsed && (
        <div className="font-mono text-[12px] leading-5">
          {hunk.lines.map((line, i) => {
            const lineKey = `${fileIndex}-${hunk.oldStart}-${i}`
            return (
              <div
                key={lineKey}
                className={cn(
                  "flex",
                  line.type === "add" && "bg-agent-active/8",
                  line.type === "remove" && "bg-agent-error/8"
                )}
              >
                {/* Old line number */}
                <span className="w-10 shrink-0 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/30">
                  {line.type !== "add" ? line.oldLine : ""}
                </span>
                {/* New line number */}
                <span className="w-10 shrink-0 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/30">
                  {line.type !== "remove" ? line.newLine : ""}
                </span>
                {/* Symbol */}
                <span
                  className={cn(
                    "w-5 shrink-0 text-center select-none",
                    line.type === "add" && "text-agent-active",
                    line.type === "remove" && "text-agent-error",
                    line.type === "context" && "text-muted-foreground/30"
                  )}
                >
                  {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                </span>
                {/* Content */}
                <span
                  className={cn(
                    "flex-1 px-2 whitespace-pre",
                    line.type === "add" && "text-agent-active",
                    line.type === "remove" && "text-agent-error",
                    line.type === "context" && "text-muted-foreground"
                  )}
                >
                  {line.content}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface DiffViewerProps {
  open: boolean
  onClose: () => void
  diffs: FileDiff[]
  agentName: string
  initialFile?: string
}

export function DiffViewer({ open, onClose, diffs, agentName, initialFile }: DiffViewerProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(() => {
    if (initialFile) {
      const idx = diffs.findIndex(
        (d) => d.path === initialFile || d.filename === initialFile || initialFile.endsWith(d.filename)
      )
      return idx >= 0 ? idx : 0
    }
    return 0
  })

  if (!open) return null

  const totalAdded = diffs.reduce((s, d) => s + d.linesAdded, 0)
  const totalRemoved = diffs.reduce((s, d) => s + d.linesRemoved, 0)
  const selectedDiff = diffs[selectedFileIndex]

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-4xl animate-in slide-in-from-right duration-300">
        <div className="flex h-full w-full flex-col border-l border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">
                Changes: {agentName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{diffs.length} files</span>
                <span className="text-agent-active">+{totalAdded}</span>
                <span className="text-agent-error">-{totalRemoved}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close diff viewer</span>
            </Button>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* File list sidebar */}
            <div className="w-64 shrink-0 border-r border-border overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-border/50">
                <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  Files Changed
                </span>
              </div>
              <ScrollArea className="flex-1">
                {diffs.map((diff, i) => (
                  <FileEntry
                    key={diff.path}
                    diff={diff}
                    isSelected={i === selectedFileIndex}
                    onClick={() => setSelectedFileIndex(i)}
                  />
                ))}
              </ScrollArea>
            </div>

            {/* Diff content */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {selectedDiff ? (
                <>
                  {/* File header */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-secondary/30">
                    <DiffStatusIcon status={selectedDiff.status} />
                    <span className="text-[13px] font-mono text-foreground">
                      {selectedDiff.path}
                    </span>
                    <div className="ml-auto flex items-center gap-2 text-xs">
                      <span className="text-agent-active font-mono">+{selectedDiff.linesAdded}</span>
                      <span className="text-agent-error font-mono">-{selectedDiff.linesRemoved}</span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div>
                      {selectedDiff.hunks.map((hunk, i) => (
                        <HunkView key={`hunk-${i}`} hunk={hunk} fileIndex={selectedFileIndex} />
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Select a file to view changes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { Search, Plus, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TitlebarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onNewAgent: () => void
  onOpenSettings: () => void
}

export function Titlebar({ sidebarOpen, onToggleSidebar, onNewAgent, onOpenSettings }: TitlebarProps) {
  return (
    <header className="flex h-12 items-center border-b border-border bg-sidebar px-3 select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Traffic lights area */}
      <div className="flex items-center gap-1.5 mr-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <span className="traffic-light bg-[#ff5f57]" />
        <span className="traffic-light bg-[#febc2e]" />
        <span className="traffic-light bg-[#28c840]" />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
        onClick={onToggleSidebar}
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onNewAgent}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">New agent</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
    </header>
  )
}

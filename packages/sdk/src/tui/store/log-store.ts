/**
 * Log Store
 *
 * Maneja logs enriquecidos con filtros, búsqueda y export.
 */

import { create } from "zustand";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface LogFilter {
  levels: LogLevel[];
  components: string[];
  searchQuery: string;
}

interface LogViewConfig {
  showTimestamps: boolean;
  showComponent: boolean;
  colorize: boolean;
  wordWrap: boolean;
  followTail: boolean;
  maxEntries: number;
}

interface LogState {
  // Logs
  entries: LogEntry[];
  addEntry: (
    entry: Omit<LogEntry, "id" | "timestamp"> & { timestamp?: Date }
  ) => void;
  setEntries: (entries: Omit<LogEntry, "id">[]) => void;
  clearEntries: () => void;

  // Filters
  filter: LogFilter;
  setFilterLevels: (levels: LogLevel[]) => void;
  toggleLevel: (level: LogLevel) => void;
  setSearchQuery: (query: string) => void;
  addComponent: (component: string) => void;

  // Config
  config: LogViewConfig;
  toggleTimestamps: () => void;
  toggleComponent: () => void;
  toggleColorize: () => void;
  toggleFollowTail: () => void;

  // Computed
  getFilteredEntries: () => LogEntry[];
  getComponents: () => string[];
  exportToString: () => string;
}

const generateId = () =>
  `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useLogStore = create<LogState>((set, get) => ({
  // Initial state
  entries: [],
  filter: {
    levels: ["info", "warn", "error"],
    components: [],
    searchQuery: "",
  },
  config: {
    showTimestamps: true,
    showComponent: true,
    colorize: true,
    wordWrap: false,
    followTail: true,
    maxEntries: 1000,
  },

  // Actions
  addEntry: (entry) => {
    set((state) => ({
      entries: [
        ...state.entries.slice(-state.config.maxEntries + 1),
        {
          ...entry,
          id: generateId(),
          timestamp: entry.timestamp || new Date(),
        },
      ],
    }));
  },

  setEntries: (entries) =>
    set((state) => ({
      entries: entries
        .slice(-state.config.maxEntries)
        .map((entry) => ({ ...entry, id: generateId() })),
    })),

  clearEntries: () => set({ entries: [] }),

  // Filter actions
  setFilterLevels: (levels) =>
    set((state) => ({ filter: { ...state.filter, levels } })),

  toggleLevel: (level) =>
    set((state) => ({
      filter: {
        ...state.filter,
        levels: state.filter.levels.includes(level)
          ? state.filter.levels.filter((l) => l !== level)
          : [...state.filter.levels, level],
      },
    })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({ filter: { ...state.filter, searchQuery } })),

  addComponent: (component) =>
    set((state) => ({
      filter: {
        ...state.filter,
        components: state.filter.components.includes(component)
          ? state.filter.components
          : [...state.filter.components, component],
      },
    })),

  // Config actions
  toggleTimestamps: () =>
    set((state) => ({
      config: { ...state.config, showTimestamps: !state.config.showTimestamps },
    })),

  toggleComponent: () =>
    set((state) => ({
      config: { ...state.config, showComponent: !state.config.showComponent },
    })),

  toggleColorize: () =>
    set((state) => ({
      config: { ...state.config, colorize: !state.config.colorize },
    })),

  toggleFollowTail: () =>
    set((state) => ({
      config: { ...state.config, followTail: !state.config.followTail },
    })),

  // Computed
  getFilteredEntries: () => {
    const { entries, filter } = get();
    return entries.filter((entry) => {
      // Filter by level
      if (!filter.levels.includes(entry.level)) {
        return false;
      }

      // Filter by component
      if (
        filter.components.length > 0 &&
        !filter.components.includes(entry.component)
      ) {
        return false;
      }

      // Filter by search
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesMessage = entry.message.toLowerCase().includes(query);
        const matchesComponent = entry.component.toLowerCase().includes(query);
        if (!(matchesMessage || matchesComponent)) {
          return false;
        }
      }

      return true;
    });
  },

  getComponents: () => {
    const { entries } = get();
    const components = new Set(entries.map((e) => e.component));
    return Array.from(components).sort();
  },

  exportToString: () => {
    const { entries, config } = get();
    return entries
      .map((entry) => {
        const parts: string[] = [];
        if (config.showTimestamps) {
          parts.push(entry.timestamp.toISOString());
        }
        parts.push(`[${entry.level.toUpperCase()}]`);
        if (config.showComponent) {
          parts.push(`[${entry.component}]`);
        }
        parts.push(entry.message);
        return parts.join(" ");
      })
      .join("\n");
  },
}));

// Helper para colores por nivel
export const getLevelColor = (level: LogLevel): string => {
  switch (level) {
    case "debug":
      return "gray";
    case "info":
      return "blue";
    case "warn":
      return "yellow";
    case "error":
      return "red";
    default:
      return "white";
  }
};

// Helper para iconos por nivel
export const getLevelIcon = (level: LogLevel): string => {
  switch (level) {
    case "debug":
      return "◆";
    case "info":
      return "ℹ";
    case "warn":
      return "⚠";
    case "error":
      return "✖";
    default:
      return "•";
  }
};

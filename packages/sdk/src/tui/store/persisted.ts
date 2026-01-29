import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveExecutions, loadExecutions } from "./storage";
import type { Execution } from "./index";

// Separate store just for persisted executions
interface PersistedState {
  executions: Execution[];
  setExecutions: (executions: Execution[]) => void;
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;
  clearExecutions: () => void;
}

export const usePersistedStore = create<PersistedState>()(
  persist(
    (set) => ({
      executions: [],
      
      setExecutions: (executions) => {
        set({ executions });
        saveExecutions(executions);
      },
      
      addExecution: (execution) =>
        set((state) => {
          const newExecutions = [execution, ...state.executions];
          saveExecutions(newExecutions);
          return { executions: newExecutions };
        }),
      
      updateExecution: (id, updates) =>
        set((state) => {
          const newExecutions = state.executions.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          );
          saveExecutions(newExecutions);
          return { executions: newExecutions };
        }),
      
      clearExecutions: () => {
        set({ executions: [] });
        saveExecutions([]);
      },
    }),
    {
      name: "openfarm-executions",
      // Use a custom storage that works in both Node and browser
      storage: {
        getItem: async (name) => {
          const executions = await loadExecutions();
          return { state: { executions }, version: 0 };
        },
        setItem: async (name, value) => {
          if (value.state?.executions) {
            await saveExecutions(value.state.executions);
          }
        },
        removeItem: async (name) => {
          await saveExecutions([]);
        },
      },
    }
  )
);

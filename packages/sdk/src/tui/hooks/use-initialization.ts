import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getAvailableModels } from "../utils/models";

interface InitializationState {
  isReady: boolean;
  progress: number;
  status: string;
}

const LOADING_STEPS = [
  { weight: 20, message: "Loading database" },
  { weight: 25, message: "Loading execution history" },
  { weight: 25, message: "Loading context data" },
  { weight: 30, message: "Loading AI models" },
];

export function useInitialization(provider: string): InitializationState {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing");

  const { loadExecutionsFromDb, loadContextsFromDb, setAvailableModels } =
    useStore();

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      let accumulatedProgress = 0;

      for (let i = 0; i < LOADING_STEPS.length; i++) {
        if (cancelled) {
          return;
        }

        setStatus(LOADING_STEPS[i].message);

        try {
          switch (i) {
            case 0:
              // Database is lazy-loaded, just wait a bit
              await new Promise((resolve) => setTimeout(resolve, 200));
              break;

            case 1:
              await loadExecutionsFromDb();
              break;

            case 2:
              await loadContextsFromDb();
              break;

            case 3:
              // Load models for the current provider
              try {
                const models = await getAvailableModels(provider);
                setAvailableModels(models);
              } catch (error) {
                console.warn("Failed to load models:", error);
              }
              break;
          }
        } catch (error) {
          console.warn(
            `Failed to load step ${LOADING_STEPS[i].message}:`,
            error
          );
        }

        accumulatedProgress += LOADING_STEPS[i].weight;
        setProgress(accumulatedProgress);
      }

      if (!cancelled) {
        setProgress(100);
        setIsReady(true);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadExecutionsFromDb, loadContextsFromDb, setAvailableModels, provider]);

  return { isReady, progress, status };
}

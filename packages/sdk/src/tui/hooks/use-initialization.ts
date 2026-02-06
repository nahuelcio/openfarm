import { useEffect, useRef, useState } from "react";
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
  const [displayProgress, setDisplayProgress] = useState(0);
  const [status, setStatus] = useState("Initializing");
  const targetProgressRef = useRef(0);

  const { loadExecutionsFromDb, loadContextsFromDb, setAvailableModels } =
    useStore();

  // Smooth progress animation
  useEffect(() => {
    const animate = () => {
      const diff = targetProgressRef.current - displayProgress;
      if (Math.abs(diff) < 0.5) {
        setDisplayProgress(targetProgressRef.current);
        return;
      }

      const step = diff * 0.15; // smooth easing factor
      setDisplayProgress((prev) => {
        const next = prev + step;
        return Math.min(next, targetProgressRef.current);
      });
    };

    const interval = setInterval(animate, 16); // ~60fps
    return () => clearInterval(interval);
  }, [displayProgress]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
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

        // Update target progress (animation will smooth it)
        const newProgress = LOADING_STEPS.slice(0, i + 1).reduce(
          (sum, step) => sum + step.weight,
          0
        );
        targetProgressRef.current = newProgress;
      }

      if (!cancelled) {
        targetProgressRef.current = 100;
        setTimeout(() => setIsReady(true), 600);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadExecutionsFromDb, loadContextsFromDb, setAvailableModels, provider]);

  return { isReady, progress: Math.floor(displayProgress), status };
}

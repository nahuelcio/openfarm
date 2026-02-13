import { useInput } from "@openfarm/tui-opentui";
import { useCallback, useRef } from "react";
import { useTaskLoopStore } from "../store/task-loop-store";

interface UseTaskLoopKeysOptions {
  onStartOrResume: () => void;
  onPause: () => void;
  onRefresh: () => void;
  onDashboard: () => void;
  onConfirmQuit: () => void;
  onConfirmInterrupt: () => void;
  onEnter: () => void;
}

interface InputKey {
  upArrow: boolean;
  downArrow: boolean;
  return: boolean;
  escape: boolean;
}

export function useTaskLoopKeys(options: UseTaskLoopKeysOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handleInput = useCallback((input: string, key: InputKey) => {
    const store = useTaskLoopStore.getState();
    const opts = optionsRef.current;

    if (store.overlay === "resume") {
      return;
    }

    if (store.overlay === "help" || store.overlay === "settings") {
      if (key.escape || input === "q") {
        store.setOverlay("none");
      }
      return;
    }

    if (store.overlay === "quit-confirm") {
      if (input.toLowerCase() === "y") {
        store.setOverlay("none");
        opts.onConfirmQuit();
      }
      if (input.toLowerCase() === "n" || key.escape) {
        store.setOverlay("none");
      }
      return;
    }

    if (store.overlay === "interrupt-confirm") {
      if (input.toLowerCase() === "y") {
        store.setOverlay("none");
        opts.onConfirmInterrupt();
      }
      if (input.toLowerCase() === "n" || key.escape) {
        store.setOverlay("none");
      }
      return;
    }

    if (input === "s") {
      if (store.lifecycle === "ready" || store.lifecycle === "paused") {
        opts.onStartOrResume();
      }
      return;
    }

    if (input === "p") {
      if (store.lifecycle === "executing" || store.lifecycle === "selecting") {
        opts.onPause();
      }
      return;
    }

    if (key.downArrow || input === "j") {
      if (store.viewMode === "tasks") {
        store.selectNextTask();
      } else {
        store.selectNextIteration();
      }
      return;
    }

    if (key.upArrow || input === "k") {
      if (store.viewMode === "tasks") {
        store.selectPreviousTask();
      } else {
        store.selectPreviousIteration();
      }
      return;
    }

    if (input === "o") {
      store.toggleRightPanelMode();
      return;
    }

    if (input === "v") {
      store.toggleViewMode();
      return;
    }

    if (input === "+" && store.lifecycle === "executing") {
      store.incrementMaxIterations();
      return;
    }

    if (input === "-" && store.lifecycle === "executing") {
      store.decrementMaxIterations();
      return;
    }

    if (input === "r") {
      if (store.lifecycle === "ready" || store.lifecycle === "paused") {
        opts.onRefresh();
      }
      return;
    }

    if (input === "?") {
      store.setOverlay("help");
      return;
    }

    if (input === ",") {
      store.setOverlay("settings");
      return;
    }

    if (input === "q" || key.escape) {
      if (store.lifecycle === "executing" || store.lifecycle === "selecting") {
        store.setOverlay("quit-confirm");
      } else {
        opts.onConfirmQuit();
      }
      return;
    }

    if (input === "d") {
      if (store.lifecycle === "executing" || store.lifecycle === "selecting") {
        store.setOverlay("interrupt-confirm");
      } else {
        opts.onDashboard();
      }
      return;
    }

    if (key.return) {
      opts.onEnter();
      return;
    }

    if (input === "g") {
      if (store.viewMode === "tasks") {
        store.selectFirstTask();
      } else {
        store.selectFirstIteration();
      }
      return;
    }

    if (input === "G") {
      if (store.viewMode === "tasks") {
        store.selectLastTask();
      } else {
        store.selectLastIteration();
      }
    }
  }, []);

  useInput(handleInput);
}

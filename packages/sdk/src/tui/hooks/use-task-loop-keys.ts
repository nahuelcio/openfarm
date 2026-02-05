import { useInput } from "@openfarm/tui-opentui";
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

export function useTaskLoopKeys(options: UseTaskLoopKeysOptions): void {
  const {
    onStartOrResume,
    onPause,
    onRefresh,
    onDashboard,
    onConfirmQuit,
    onConfirmInterrupt,
    onEnter,
  } = options;

  useInput((input, key) => {
    const store = useTaskLoopStore.getState();

    if (store.overlay === "help" || store.overlay === "settings") {
      if (key.escape || input === "q") {
        store.setOverlay("none");
      }
      return;
    }

    if (store.overlay === "quit-confirm") {
      if (input.toLowerCase() === "y") {
        store.setOverlay("none");
        onConfirmQuit();
      }
      if (input.toLowerCase() === "n" || key.escape) {
        store.setOverlay("none");
      }
      return;
    }

    if (store.overlay === "interrupt-confirm") {
      if (input.toLowerCase() === "y") {
        store.setOverlay("none");
        onConfirmInterrupt();
      }
      if (input.toLowerCase() === "n" || key.escape) {
        store.setOverlay("none");
      }
      return;
    }

    if (input === "s") {
      if (store.lifecycle === "ready" || store.lifecycle === "paused") {
        onStartOrResume();
      }
      return;
    }

    if (input === "p") {
      if (store.lifecycle === "executing" || store.lifecycle === "selecting") {
        onPause();
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
        onRefresh();
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
        onConfirmQuit();
      }
      return;
    }

    if (input === "d") {
      if (store.lifecycle === "executing" || store.lifecycle === "selecting") {
        store.setOverlay("interrupt-confirm");
      } else {
        onDashboard();
      }
      return;
    }

    if (key.return) {
      onEnter();
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
  });
}

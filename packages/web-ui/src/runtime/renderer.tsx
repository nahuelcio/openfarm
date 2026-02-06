import { createContext, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { createRoot } from "react-dom/client";

interface AppContextValue {
  exit: (error?: Error) => void;
  stdout: { write: (data: string) => void };
}

const AppContext = createContext<AppContextValue | null>(null);

interface RenderResult {
  waitUntilExit: () => Promise<void>;
  clear: () => void;
  unmount: () => void;
}

export function render(node: ReactNode): RenderResult {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("No #root element found in DOM");
  }

  const root = createRoot(container);
  let resolveExit: (() => void) | null = null;
  let exited = false;

  const exitPromise = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });

  const appContext: AppContextValue = {
    exit: (error?: Error) => {
      if (!exited) {
        exited = true;
        if (error) {
          console.error(error);
        }
        resolveExit?.();
      }
    },
    stdout: {
      write: (data: string) => {
        // eslint-disable-next-line no-console
        console.log(data);
      },
    },
  };

  const App = (): ReactElement => (
    <AppContext.Provider value={appContext}>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: "var(--bg-color, #1a1a1a)",
          color: "var(--text-color, #e0e0e0)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {node}
      </div>
    </AppContext.Provider>
  );

  root.render(<App />);

  return {
    waitUntilExit: () => exitPromise,
    clear: () => {
      container.innerHTML = "";
    },
    unmount: () => {
      root.unmount();
      if (!exited) {
        exited = true;
        resolveExit?.();
      }
    },
  };
}

export function useApp(): { exit: (error?: Error) => void } {
  const ctx = useContext(AppContext);
  if (!ctx) {
    // Fallback si se usa fuera del provider
    return {
      exit: (error?: Error) => {
        if (error) console.error(error);
        window.close();
      },
    };
  }
  return { exit: ctx.exit };
}

export function useStdout(): { stdout: NodeJS.WriteStream } {
  return {
    stdout: {
      write: (data: string | Uint8Array) => {
        // eslint-disable-next-line no-console
        console.log(data.toString());
      },
      rows: 24,
      columns: 80,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } as any,
  };
}

export function useStdoutDimensions(): { rows: number; columns: number } {
  const [dims, setDims] = useState({
    rows: Math.floor(window.innerHeight / 20),
    columns: Math.floor(window.innerWidth / 10),
  });

  useEffect(() => {
    const handleResize = () => {
      setDims({
        rows: Math.floor(window.innerHeight / 20),
        columns: Math.floor(window.innerWidth / 10),
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return dims;
}

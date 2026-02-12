/**
 * Simple Agent Screen
 *
 * Interfaz ultra-simple tipo OpenCode/Claude Code:
 * - Chat en la parte inferior
 * - Ver lo que el agente está haciendo AHORA en el centro
 * - Lista de tareas pendientes arriba
 * - Cancelar en cualquier momento
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { useThemeColors } from "../theme/hooks";
import { loadConfig } from "../services/simple-config";

interface Task {
  id: string;
  message: string;
  status: "queued" | "running" | "completed" | "error" | "cancelled";
  output: string[];
  currentAction?: string;
}

interface Config {
  task: string;
  workflow: string;
  workspace: string;
  provider: string;
  model: string;
}

export function SimpleAgent() {
  const colors = useThemeColors();
  const { setScreen } = useStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const scrollRef = useRef(0);
  const [config, setConfig] = useState<Config | null>(null);

  // Cargar configuración
  useEffect(() => {
    const saved = loadConfig();
    if (saved) {
      setConfig(saved);
    }
  }, []);

  // Agregar tarea inicial si viene de config
  useEffect(() => {
    if (config?.task && tasks.length === 0) {
      const initialTask: Task = {
        id: "initial",
        message: config.task,
        status: "queued",
        output: [],
      };
      setTasks([initialTask]);
    }
  }, [config, tasks.length]);

  // Encontrar tarea actual
  const currentTask = tasks.find((t) => t.status === "running");
  const queueCount = tasks.filter((t) => t.status === "queued").length;

  // Simular progreso del agente
  useEffect(() => {
    if (!currentTask) return;

    const actions = [
      "Analizando el código...",
      "Buscando archivos relevantes...",
      "Generando plan de cambios...",
      "Editando archivos...",
      "Verificando cambios...",
      "Ejecutando tests...",
    ];

    let actionIndex = 0;
    const interval = setInterval(() => {
      if (actionIndex < actions.length) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === currentTask.id
              ? {
                  ...t,
                  currentAction: actions[actionIndex],
                  output: [...t.output, actions[actionIndex]],
                }
              : t
          )
        );
        actionIndex++;
        scrollRef.current++;
      } else {
        // Completar tarea
        setTasks((prev) =>
          prev.map((t) =>
            t.id === currentTask.id
              ? { ...t, status: "completed", currentAction: "¡Listo!" }
              : t
          )
        );
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentTask?.id]);

  // Procesar siguiente tarea en cola
  useEffect(() => {
    if (currentTask) return; // Ya hay una corriendo

    const nextTask = tasks.find((t) => t.status === "queued");
    if (nextTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === nextTask.id ? { ...t, status: "running" } : t
        )
      );
    }
  }, [tasks, currentTask]);

  // Input handling
  useInput((char, key) => {
    // Volver a configurar: R
    if ((char === "r" || char === "R") && !currentTask) {
      setScreen("simple-setup");
      return;
    }

    // Cancelar tarea actual: Ctrl+C
    if (key.ctrl && char === "c" && currentTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === currentTask.id
            ? {
                ...t,
                status: "cancelled",
                currentAction: "Cancelado por usuario",
              }
            : t
        )
      );
      return;
    }

    // Enviar mensaje: Enter
    if (key.return && input.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        message: input.trim(),
        status: "queued",
        output: [],
      };
      setTasks((prev) => [...prev, newTask]);
      setInput("");
      setCursorPos(0);
      return;
    }

    // Navegar historial: flechas arriba/abajo (simple)
    if (key.upArrow || key.downArrow) {
      const history = tasks
        .filter((t) => t.status !== "queued")
        .map((t) => t.message);
      if (history.length > 0) {
        setInput(history[history.length - 1] || "");
        setCursorPos((history[history.length - 1] || "").length);
      }
      return;
    }

    // Backspace
    if (key.backspace && cursorPos > 0) {
      const before = input.slice(0, cursorPos - 1);
      const after = input.slice(cursorPos);
      setInput(before + after);
      setCursorPos(cursorPos - 1);
      return;
    }

    // Cursor izquierda/derecha
    if (key.leftArrow) {
      setCursorPos((p) => Math.max(0, p - 1));
      return;
    }
    if (key.rightArrow) {
      setCursorPos((p) => Math.min(input.length, p + 1));
      return;
    }

    // Escribir
    if (char && !key.ctrl && !key.meta) {
      const before = input.slice(0, cursorPos);
      const after = input.slice(cursorPos);
      setInput(before + char + after);
      setCursorPos(cursorPos + char.length);
    }
  });

  // Render input con cursor
  const renderInput = () => {
    const before = input.slice(0, cursorPos);
    const at = input[cursorPos] || " ";
    const after = input.slice(cursorPos + 1);

    return (
      <>
        <Text color={colors.foreground}>{before}</Text>
        <Text backgroundColor={colors.primary} color={colors.background}>
          {at}
        </Text>
        <Text color={colors.foreground}>{after}</Text>
      </>
    );
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header con config */}
      <Box
        backgroundColor={colors.primary}
        flexDirection="row"
        justifyContent="space-between"
        paddingX={1}
        paddingY={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.background}>
            🤖 OpenFarm Agent
          </Text>
          {config && (
            <Text color={colors.background} dimColor>
              📁 {config.workspace.split("/").pop()} • {config.provider}/
              {config.model.split("/").pop()}
            </Text>
          )}
        </Box>
        <Text color={colors.background}>
          {queueCount > 0 ? `${queueCount} en cola` : "Listo"}
          {currentTask && " • Trabajando..."}
        </Text>
      </Box>

      {/* Cola de tareas (compacta) */}
      {queueCount > 0 && (
        <Box flexDirection="column" paddingX={1} paddingY={1}>
          <Text color={colors.muted} dimColor>
            En cola:
          </Text>
          {tasks
            .filter((t) => t.status === "queued")
            .slice(0, 3)
            .map((t) => (
              <Text
                color={colors.muted}
                dimColor
                key={t.id}
                wrap="truncate-end"
              >
                • {t.message}
              </Text>
            ))}
          {queueCount > 3 && (
            <Text color={colors.muted} dimColor>
              ... y {queueCount - 3} más
            </Text>
          )}
        </Box>
      )}

      {/* Área principal: qué está haciendo AHORA */}
      <Box flexDirection="column" flexGrow={1} padding={1}>
        {!currentTask &&
          tasks.filter((t) => t.status === "completed").length === 0 && (
            <Box alignItems="center" flexDirection="column" paddingY={4}>
              <Text bold color={colors.primary}>
                ¡Hola! Soy tu agente de código.
              </Text>
              <Text color={colors.muted} marginTop={1}>
                Escribe qué quieres que haga y presiona Enter.
              </Text>
              <Text color={colors.muted} dimColor marginTop={1}>
                Ejemplos:
              </Text>
              <Text color={colors.info}>
                • "Agrega validación al formulario"
              </Text>
              <Text color={colors.info}>• "Arregla el bug en login"</Text>
              <Text color={colors.info}>• "Crea tests para la API"</Text>
            </Box>
          )}

        {currentTask && (
          <Box flexDirection="column">
            <Text bold color={colors.primary} marginBottom={1}>
              ⏳ Ahora: {currentTask.message}
            </Text>

            {currentTask.currentAction && (
              <Box marginBottom={1}>
                <Text bold color={colors.info}>
                  {currentTask.currentAction}
                </Text>
              </Box>
            )}

            {/* Log de acciones */}
            <Box
              borderColor={colors.border}
              borderStyle="single"
              flexDirection="column"
              flexGrow={1}
              padding={1}
            >
              {currentTask.output.slice(-10).map((line, i) => (
                <Text color={colors.foreground} dimColor key={i}>
                  {line}
                </Text>
              ))}
            </Box>

            <Text color={colors.warning} marginTop={1}>
              Presiona Ctrl+C para cancelar
            </Text>
          </Box>
        )}

        {/* Historial de completadas */}
        {tasks.filter((t) => t.status === "completed").length > 0 &&
          !currentTask && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color={colors.success}>
                ✅ Completado:
              </Text>
              {tasks
                .filter((t) => t.status === "completed")
                .slice(-3)
                .map((t) => (
                  <Text color={colors.success} dimColor key={t.id}>
                    ✓ {t.message}
                  </Text>
                ))}
            </Box>
          )}
      </Box>

      {/* Input al final */}
      <Box
        borderColor={colors.primary}
        borderStyle="bold"
        flexDirection="column"
        padding={1}
      >
        <Text color={colors.muted} dimCode marginBottom={1}>
          {currentTask ? "Agregar a la cola:" : "¿Qué necesitas?"}
        </Text>
        <Box flexDirection="row">
          <Text bold color={colors.primary} marginRight={1}>
            ❯
          </Text>
          {input ? (
            renderInput()
          ) : (
            <Text color={colors.muted} dimCode>
              Escribe tu pedido aquí...
            </Text>
          )}
        </Box>
      </Box>

      {/* Ayuda simple */}
      <Box flexDirection="row" gap={3} padding={1}>
        <Text color={colors.muted} dimCode>
          Enter: Enviar
        </Text>
        <Text color={colors.muted} dimCode>
          ↑↓: Historial
        </Text>
        {currentTask ? (
          <Text color={colors.warning}>Ctrl+C: Cancelar</Text>
        ) : (
          <Text color={colors.info}>R: Reconfigurar</Text>
        )}
      </Box>
    </Box>
  );
}

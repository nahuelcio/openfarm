/**
 * Simple Setup Screen
 *
 * Configuración rápida antes de empezar:
 * 1. Qué hacer (tarea)
 * 2. Qué workflow usar
 * 3. Dónde (ruta)
 * 4. Qué provider usar
 * 5. Qué modelo usar (dinámico según provider)
 * 6. Confirmar
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { useThemeColors } from "../theme/hooks";
import { loadConfig, saveConfig } from "../services/simple-config";
import { getAvailableModels } from "../utils/models";

interface SetupConfig {
  task: string;
  workflow: string;
  workspace: string;
  provider: string;
  model: string;
}

const WORKFLOWS = [
  {
    id: "auto",
    name: "🤖 Auto (decide por mí)",
    desc: "El agente elige qué hacer",
  },
  {
    id: "code",
    name: "💻 Escribir código",
    desc: "Implementa una feature o fix",
  },
  { id: "review", name: "👀 Revisar código", desc: "Revisa y sugiere mejoras" },
  { id: "test", name: "🧪 Crear tests", desc: "Genera tests para tu código" },
  { id: "refactor", name: "🔨 Refactorizar", desc: "Mejora código existente" },
];

const PROVIDERS = [
  {
    id: "opencode",
    name: "🤖 OpenCode",
    desc: "Agente de código con OpenCode",
  },
  {
    id: "claude",
    name: "🧠 Claude Code",
    desc: "Anthropic Claude para código",
  },
  { id: "aider", name: "🤝 Aider", desc: "Pair programming con AI" },
  {
    id: "external-agent",
    name: "⚙️ External Agent",
    desc: "Agente externo configurable",
  },
];

// Default models por provider mientras carga
const DEFAULT_MODELS: Record<string, string[]> = {
  opencode: ["cargando..."],
  claude: ["cargando..."],
  aider: ["cargando..."],
  "external-agent": ["default"],
};

export function SimpleSetup() {
  const colors = useThemeColors();
  const { setScreen } = useStore();

  const [step, setStep] = useState<
    "task" | "workflow" | "path" | "provider" | "model" | "confirm"
  >("task");
  const [config, setConfig] = useState<SetupConfig>({
    task: "",
    workflow: "auto",
    workspace: process.cwd(),
    provider: "opencode",
    model: "",
  });

  // Inputs
  const [taskInput, setTaskInput] = useState("");
  const [pathInput, setPathInput] = useState(process.cwd());
  const [modelFilter, setModelFilter] = useState("");

  // Modelos dinámicos
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Indices
  const [workflowIndex, setWorkflowIndex] = useState(0);
  const [providerIndex, setProviderIndex] = useState(0);
  const [modelIndex, setModelIndex] = useState(0);

  // Cursor
  const [cursorPos, setCursorPos] = useState(0);

  // Cargar config guardada
  useEffect(() => {
    const saved = loadConfig();
    if (saved) {
      setConfig((c) => ({ ...c, ...saved }));
      setPathInput(saved.workspace || process.cwd());
    }
  }, []);

  // Cargar modelos cuando cambia el provider
  useEffect(() => {
    if (step !== "model") return;

    setIsLoadingModels(true);
    setAvailableModels(DEFAULT_MODELS[config.provider] || ["default"]);

    getAvailableModels(config.provider)
      .then((models) => {
        setAvailableModels(models.length > 0 ? models : ["default"]);
      })
      .catch(() => {
        setAvailableModels(["default"]);
      })
      .finally(() => {
        setIsLoadingModels(false);
      });
  }, [step, config.provider]);

  // Modelos filtrados
  const filteredModels = useMemo(() => {
    if (!modelFilter) return availableModels;
    return availableModels.filter((m) =>
      m.toLowerCase().includes(modelFilter.toLowerCase())
    );
  }, [availableModels, modelFilter]);

  useEffect(() => {
    setModelIndex((current) =>
      filteredModels.length === 0 ? 0 : Math.min(current, filteredModels.length - 1)
    );
  }, [filteredModels]);

  useInput((char, key) => {
    // Volver atrás
    if (key.escape) {
      if (step === "workflow") setStep("task");
      else if (step === "path") setStep("workflow");
      else if (step === "provider") setStep("path");
      else if (step === "model") {
        setStep("provider");
        setModelFilter("");
      } else if (step === "confirm") setStep("model");
      return;
    }

    // PASO 1: TAREA
    if (step === "task") {
      if (key.return && taskInput.trim()) {
        setConfig((c) => ({ ...c, task: taskInput.trim() }));
        setStep("workflow");
        return;
      }
      if (key.backspace && cursorPos > 0) {
        const before = taskInput.slice(0, cursorPos - 1);
        const after = taskInput.slice(cursorPos);
        setTaskInput(before + after);
        setCursorPos(cursorPos - 1);
        return;
      }
      if (key.leftArrow) {
        setCursorPos((p) => Math.max(0, p - 1));
        return;
      }
      if (key.rightArrow) {
        setCursorPos((p) => Math.min(taskInput.length, p + 1));
        return;
      }
      if (char && !key.ctrl && !key.meta) {
        const before = taskInput.slice(0, cursorPos);
        const after = taskInput.slice(cursorPos);
        setTaskInput(before + char + after);
        setCursorPos(cursorPos + char.length);
      }
      return;
    }

    // PASO 2: WORKFLOW
    if (step === "workflow") {
      if (key.upArrow) {
        setWorkflowIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setWorkflowIndex((i) => Math.min(WORKFLOWS.length - 1, i + 1));
        return;
      }
      if (key.return) {
        setConfig((c) => ({ ...c, workflow: WORKFLOWS[workflowIndex].id }));
        setStep("path");
        return;
      }
      return;
    }

    // PASO 3: RUTA
    if (step === "path") {
      if (key.return && pathInput.trim()) {
        setConfig((c) => ({ ...c, workspace: pathInput.trim() }));
        setStep("provider");
        return;
      }
      if (key.backspace && cursorPos > 0) {
        const before = pathInput.slice(0, cursorPos - 1);
        const after = pathInput.slice(cursorPos);
        setPathInput(before + after);
        setCursorPos(cursorPos - 1);
        return;
      }
      if (key.leftArrow) {
        setCursorPos((p) => Math.max(0, p - 1));
        return;
      }
      if (key.rightArrow) {
        setCursorPos((p) => Math.min(pathInput.length, p + 1));
        return;
      }
      if (char && !key.ctrl && !key.meta) {
        const before = pathInput.slice(0, cursorPos);
        const after = pathInput.slice(cursorPos);
        setPathInput(before + char + after);
        setCursorPos(cursorPos + char.length);
      }
      return;
    }

    // PASO 4: PROVIDER
    if (step === "provider") {
      if (key.upArrow) {
        setProviderIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setProviderIndex((i) => Math.min(PROVIDERS.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const selected = PROVIDERS[providerIndex];
        setConfig((c) => ({ ...c, provider: selected.id, model: "" }));
        setModelFilter("");
        setStep("model");
        return;
      }
      return;
    }

    // PASO 5: MODELO (con filtro dinámico)
    if (step === "model") {
      // Escribir para filtrar
      if (char && !key.ctrl && !key.meta && char !== " ") {
        setModelFilter((f) => f + char);
        return;
      }
      if (key.backspace) {
        setModelFilter((f) => f.slice(0, -1));
        return;
      }
      // Navegar
      if (key.upArrow) {
        setModelIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setModelIndex((i) => Math.min(filteredModels.length - 1, i + 1));
        return;
      }
      // Seleccionar
      if (key.return && filteredModels.length > 0 && !isLoadingModels) {
        setConfig((c) => ({ ...c, model: filteredModels[modelIndex] }));
        setStep("confirm");
        return;
      }
      return;
    }

    // PASO 6: CONFIRMAR
    if (step === "confirm") {
      if (key.return) {
        saveConfig(config);
        setScreen("agent-chat");
        return;
      }
      if (char === "e" || char === "E") {
        setStep("task");
        setTaskInput(config.task);
        setCursorPos(config.task.length);
        return;
      }
      return;
    }
  });

  const renderInput = (value: string) => {
    const before = value.slice(0, cursorPos);
    const at = value[cursorPos] || " ";
    const after = value.slice(cursorPos + 1);
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
    <Box flexDirection="column" height="100%" padding={2}>
      <Text bold color={colors.primary}>
        🌾 OpenFarm - Configuración
      </Text>
      <Text color={colors.muted} dimColor>
        Paso{" "}
        {step === "task"
          ? 1
          : step === "workflow"
            ? 2
            : step === "path"
              ? 3
              : step === "provider"
                ? 4
                : step === "model"
                  ? 5
                  : 6}{" "}
        de 6
      </Text>
      <Box marginY={1} borderStyle="single" borderColor={colors.border} />

      {/* PASO 1: TAREA */}
      {step === "task" && (
        <Box flexDirection="column">
          <Text bold marginBottom={1}>
            ¿Qué necesitas que haga?
          </Text>
          <Box borderStyle="bold" borderColor={colors.primary} padding={1}>
            <Text color={colors.primary} bold marginRight={1}>
              ❯
            </Text>
            {taskInput ? (
              renderInput(taskInput)
            ) : (
              <Text color={colors.muted} dimCode>
                Ej: Arreglar el bug en login...
              </Text>
            )}
          </Box>
          <Box marginTop={2} flexDirection="column">
            <Text color={colors.muted} dimCode>
              Ejemplos:
            </Text>
            <Text color="cyan">• "Arregla el bug donde el login falla"</Text>
            <Text color="cyan">• "Agrega validación de email al registro"</Text>
            <Text color="cyan">• "Crea tests para la API de usuarios"</Text>
          </Box>
        </Box>
      )}

      {/* PASO 2: WORKFLOW */}
      {step === "workflow" && (
        <Box flexDirection="column">
          <Text bold marginBottom={1}>
            ¿Qué tipo de trabajo?
          </Text>
          {WORKFLOWS.map((wf, i) => (
            <Box key={wf.id} flexDirection="row" marginY={1}>
              <Text color={i === workflowIndex ? colors.primary : colors.muted}>
                {i === workflowIndex ? "▶ " : "  "}
              </Text>
              <Box flexDirection="column">
                <Text
                  bold={i === workflowIndex}
                  color={
                    i === workflowIndex ? colors.primary : colors.foreground
                  }
                >
                  {wf.name}
                </Text>
                <Text color={colors.muted} dimCode>
                  {wf.desc}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* PASO 3: RUTA */}
      {step === "path" && (
        <Box flexDirection="column">
          <Text bold marginBottom={1}>
            ¿Dónde trabajar?
          </Text>
          <Box borderStyle="bold" borderColor={colors.primary} padding={1}>
            <Text color={colors.primary} bold marginRight={1}>
              📁
            </Text>
            {renderInput(pathInput)}
          </Box>
        </Box>
      )}

      {/* PASO 4: PROVIDER */}
      {step === "provider" && (
        <Box flexDirection="column">
          <Text bold marginBottom={1}>
            ¿Qué agente usar?
          </Text>
          {PROVIDERS.map((p, i) => (
            <Box key={p.id} flexDirection="row" marginY={1}>
              <Text color={i === providerIndex ? colors.primary : colors.muted}>
                {i === providerIndex ? "▶ " : "  "}
              </Text>
              <Box flexDirection="column">
                <Text
                  bold={i === providerIndex}
                  color={
                    i === providerIndex ? colors.primary : colors.foreground
                  }
                >
                  {p.name}
                </Text>
                <Text color={colors.muted} dimCode>
                  {p.desc}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* PASO 5: MODELO DINÁMICO */}
      {step === "model" && (
        <Box flexDirection="column">
          <Text bold marginBottom={1}>
            ¿Qué modelo de{" "}
            {PROVIDERS.find((p) => p.id === config.provider)?.name}?
          </Text>

          {/* Filtro */}
          <Box
            borderStyle="single"
            borderColor={isLoadingModels ? colors.muted : colors.info}
            padding={1}
            marginBottom={1}
          >
            <Text
              color={isLoadingModels ? colors.muted : colors.info}
              marginRight={1}
            >
              {isLoadingModels ? "⏳" : "🔍"}
            </Text>
            <Text color={modelFilter ? colors.foreground : colors.muted}>
              {isLoadingModels
                ? "Cargando modelos..."
                : modelFilter || "Escribe para filtrar modelos..."}
            </Text>
          </Box>

          {/* Contador */}
          {!isLoadingModels && (
            <Text color={colors.muted} dimCode marginBottom={1}>
              {filteredModels.length} modelos disponibles
            </Text>
          )}

          {/* Lista */}
          <Box flexDirection="column" maxHeight={10}>
            {filteredModels.slice(0, 8).map((m, i) => (
              <Box key={`${m}-${i}`} flexDirection="row" marginY={1}>
                <Text color={i === modelIndex ? colors.primary : colors.muted}>
                  {i === modelIndex ? "▶ " : "  "}
                </Text>
                <Text
                  bold={i === modelIndex}
                  color={i === modelIndex ? colors.primary : colors.foreground}
                  wrap="truncate-end"
                >
                  {m}
                </Text>
              </Box>
            ))}
            {filteredModels.length > 8 && (
              <Text color={colors.muted} dimCode>
                ... y {filteredModels.length - 8} más
              </Text>
            )}
            {filteredModels.length === 0 && !isLoadingModels && (
              <Text color={colors.warning}>No hay modelos que coincidan</Text>
            )}
          </Box>
        </Box>
      )}

      {/* PASO 6: CONFIRMAR */}
      {step === "confirm" && (
        <Box flexDirection="column">
          <Text bold color={colors.success} marginBottom={1}>
            ✅ Todo listo
          </Text>
          <Box
            borderStyle="single"
            borderColor={colors.border}
            padding={1}
            marginY={1}
          >
            <Box flexDirection="row" marginY={1}>
              <Text color={colors.muted} width={12}>
                Tarea:
              </Text>
              <Text color={colors.foreground} wrap="wrap">
                {config.task}
              </Text>
            </Box>
            <Box flexDirection="row" marginY={1}>
              <Text color={colors.muted} width={12}>
                Workflow:
              </Text>
              <Text color={colors.foreground}>
                {WORKFLOWS.find((w) => w.id === config.workflow)?.name}
              </Text>
            </Box>
            <Box flexDirection="row" marginY={1}>
              <Text color={colors.muted} width={12}>
                Ubicación:
              </Text>
              <Text color={colors.foreground}>{config.workspace}</Text>
            </Box>
            <Box flexDirection="row" marginY={1}>
              <Text color={colors.muted} width={12}>
                Agente:
              </Text>
              <Text color={colors.foreground}>
                {PROVIDERS.find((p) => p.id === config.provider)?.name}
              </Text>
            </Box>
            <Box flexDirection="row" marginY={1}>
              <Text color={colors.muted} width={12}>
                Modelo:
              </Text>
              <Text color={colors.foreground}>{config.model}</Text>
            </Box>
          </Box>
          <Box flexDirection="row" gap={4} marginTop={2}>
            <Text
              backgroundColor={colors.primary}
              bold
              color={colors.background}
              paddingX={2}
            >
              Enter: ¡Empezar!
            </Text>
            <Text color={colors.muted}>E: Editar</Text>
          </Box>
        </Box>
      )}

      {/* Ayuda */}
      <Box marginTop={2}>
        <Text color={colors.muted} dimCode>
          {step !== "task" ? "Esc: Volver • " : ""}
          {step === "model"
            ? "Escribir: Filtrar • ↑↓: Navegar • Enter: Seleccionar"
            : step === "confirm"
              ? "Enter: Empezar • E: Editar"
              : "↑↓: Elegir • Enter: Continuar"}
        </Text>
      </Box>
    </Box>
  );
}

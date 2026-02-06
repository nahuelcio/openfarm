import { Box, Text, useInput } from "@openfarm/tui-opentui";
import TextInput from "@openfarm/tui-opentui/text-input";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { getAvailableModels } from "../utils/models";

type SpecStatus = "draft" | "ready" | "implementing" | "done" | "archived";
type ArtifactKey = "proposal" | "requirements" | "design" | "tasks";
type PlanStep = "provider" | "model" | "folder" | "plan";
const MODELS_PER_PAGE = 6;
const MODEL_LIST_HEIGHT = MODELS_PER_PAGE + 4; // items + border (2) + padding (2)

interface SpecMetadata {
  slug: string;
  name: string;
  status: SpecStatus;
  updatedAt: string;
}

interface LoadedSpec {
  metadata: SpecMetadata;
}

interface SpecArtifacts {
  proposal: string;
  requirements: string;
  design: string;
  tasks: string;
}

interface SpecModule {
  SpecManager: new (
    cwd?: string
  ) => {
    init(): Promise<void>;
    list(options?: { includeArchived?: boolean }): Promise<LoadedSpec[]>;
    load(slug: string, includeArchived?: boolean): Promise<LoadedSpec>;
    loadArtifacts(spec: LoadedSpec): Promise<SpecArtifacts>;
    updateStatus(
      spec: LoadedSpec,
      nextStatus: SpecStatus,
      allowManualOverride?: boolean
    ): Promise<void>;
    archive(spec: LoadedSpec): Promise<LoadedSpec>;
  };
  runSpecCLI: (args: string[]) => Promise<void>;
  createSpecPlan: (options: {
    cwd: string;
    name: string;
    description: string;
    provider?: string;
    model?: string;
  }) => Promise<LoadedSpec>;
}

const PROVIDERS = [
  { id: "opencode", label: "OpenCode" },
  { id: "claude", label: "Claude Code" },
  { id: "aider", label: "Aider" },
  { id: "external-agent", label: "External Agent" },
] as const;

async function loadSpecModule(): Promise<SpecModule> {
  const specModulePath = "@openfarm/spec";
  return (await import(specModulePath)) as SpecModule;
}

function makeSpecNameFromPlan(plan: string): string {
  const base = plan
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .slice(0, 5)
    .join("-");
  const fallback = `spec-${Date.now()}`;
  return base || fallback;
}

export function SpecsScreen() {
  const setScreen = useStore((state) => state.setScreen);
  const setProvider = useStore((state) => state.setProvider);
  const setModel = useStore((state) => state.setModel);
  const setWorkspace = useStore((state) => state.setWorkspace);
  const setIsTyping = useStore((state) => state.setIsTyping);

  const [specs, setSpecs] = useState<LoadedSpec[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<ArtifactKey>("tasks");
  const [preview, setPreview] = useState<string>("No spec selected.");

  const [isPlanning, setIsPlanning] = useState(false);
  const [planStep, setPlanStep] = useState<PlanStep>("provider");
  const [providerIndex, setProviderIndex] = useState(0);
  const [modelInput, setModelInput] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelPage, setModelPage] = useState(0);
  const [modelListIndex, setModelListIndex] = useState(0);
  const [isSelectingFromList, setIsSelectingFromList] = useState(false);
  const [folderInput, setFolderInput] = useState(process.cwd());
  const [planInput, setPlanInput] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  const selectedSpec = specs[selectedIndex];
  const selectedProvider = PROVIDERS[providerIndex]?.id ?? "opencode";
  const selectedProviderLabel =
    PROVIDERS[providerIndex]?.label ?? "Unknown provider";
  const selectedModelLabel = modelInput.trim() || "(default)";
  const allFilteredModels = useMemo(
    () =>
      modelOptions.filter((model) =>
        model.toLowerCase().includes(modelSearch.toLowerCase())
      ),
    [modelOptions, modelSearch]
  );
  const modelPageCount = Math.max(
    1,
    Math.ceil(allFilteredModels.length / MODELS_PER_PAGE)
  );
  const modelPageStart = modelPage * MODELS_PER_PAGE;
  const filteredModels = useMemo(
    () =>
      allFilteredModels.slice(modelPageStart, modelPageStart + MODELS_PER_PAGE),
    [allFilteredModels, modelPageStart]
  );

  useEffect(() => {
    const typing = isPlanning && planStep !== "provider";
    setIsTyping(typing);
    return () => setIsTyping(false);
  }, [isPlanning, planStep, setIsTyping]);

  useEffect(() => {
    if (!isPlanning || planStep !== "model") {
      return;
    }
    let mounted = true;
    setLoadingModels(true);
    getAvailableModels(selectedProvider)
      .then((models) => {
        if (mounted) {
          setModelOptions(models);
        }
      })
      .catch(() => {
        if (mounted) {
          setModelOptions([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingModels(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [isPlanning, planStep, selectedProvider]);

  useEffect(() => {
    if (modelPage <= modelPageCount - 1) {
      return;
    }
    setModelPage(Math.max(0, modelPageCount - 1));
  }, [modelPage, modelPageCount]);

  useEffect(() => {
    if (!isSelectingFromList) {
      return;
    }
    setModelListIndex((current) =>
      Math.min(current, Math.max(filteredModels.length - 1, 0))
    );
  }, [filteredModels.length, isSelectingFromList]);

  const refreshSpecs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { SpecManager } = await loadSpecModule();
      const manager = new SpecManager(process.cwd());
      await manager.init();
      const items = await manager.list({ includeArchived: true });
      setSpecs(items);
      if (items.length === 0) {
        setPreview("No specs found.");
      }
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : String(refreshError)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreview = useCallback(
    async (slug: string, nextArtifact: ArtifactKey) => {
      try {
        const { SpecManager } = await loadSpecModule();
        const manager = new SpecManager(process.cwd());
        await manager.init();
        const spec = await manager.load(slug);
        const artifacts = await manager.loadArtifacts(spec);
        const content = artifacts[nextArtifact] ?? "";
        const lines = content.split("\n").slice(0, 24).join("\n");
        setPreview(lines || "(empty)");
      } catch (previewError) {
        setPreview(
          previewError instanceof Error
            ? previewError.message
            : String(previewError)
        );
      }
    },
    []
  );

  const resetWizard = () => {
    setIsPlanning(false);
    setPlanStep("provider");
    setProviderIndex(0);
    setModelInput("");
    setModelSearch("");
    setModelOptions([]);
    setModelPage(0);
    setModelListIndex(0);
    setIsSelectingFromList(false);
    setFolderInput(process.cwd());
    setPlanInput("");
  };

  const startWizard = () => {
    setError(null);
    setMessage("Plan wizard: pick provider -> model -> folder -> write plan");
    setIsPlanning(true);
    setPlanStep("provider");
    setProviderIndex(0);
    setModelInput("");
    setModelSearch("");
    setModelOptions([]);
    setModelPage(0);
    setModelListIndex(0);
    setIsSelectingFromList(false);
    setFolderInput(process.cwd());
    setPlanInput("");
  };

  const handleModelSearchChange = (value: string) => {
    setModelSearch(value);
    setModelPage(0);
    setModelListIndex(0);
    setIsSelectingFromList(false);
  };

  const createPlanFromWizard = async () => {
    if (!planInput.trim()) {
      setMessage("Write the plan first.");
      return;
    }
    if (!folderInput.trim()) {
      setMessage("Folder is required.");
      return;
    }

    try {
      const specName = makeSpecNameFromPlan(planInput);
      const chosenModel = modelInput.trim();
      const { createSpecPlan } = await loadSpecModule();
      const created = await createSpecPlan({
        cwd: folderInput.trim(),
        name: specName,
        description: planInput.trim(),
        provider: selectedProvider,
        model: chosenModel || undefined,
      });

      setProvider(selectedProvider);
      setModel(chosenModel);
      setWorkspace(folderInput.trim());

      setMessage(
        `Created ${created.metadata.slug} in ${folderInput.trim()} with ${selectedProvider}/${chosenModel || "(default)"}`
      );
      resetWizard();
      await refreshSpecs();
      setSelectedIndex(0);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : String(createError)
      );
    }
  };

  useEffect(() => {
    refreshSpecs().catch(() => undefined);
  }, [refreshSpecs]);

  useEffect(() => {
    if (!selectedSpec || isPlanning) {
      return;
    }
    loadPreview(selectedSpec.metadata.slug, artifact).catch(() => undefined);
  }, [artifact, isPlanning, loadPreview, selectedSpec]);

  const wizardHeader = useMemo(() => {
    if (!isPlanning) {
      return null;
    }
    if (planStep === "provider") {
      return "Step 1/4: Choose provider";
    }
    if (planStep === "model") {
      return "Step 2/4: Choose model";
    }
    if (planStep === "folder") {
      return "Step 3/4: Choose folder";
    }
    return "Step 4/4: Write plan description";
  }, [isPlanning, planStep]);

  const wizardHelp = useMemo(() => {
    if (!isPlanning) {
      return null;
    }
    if (planStep === "provider") {
      return "Up/Down provider | Enter continue | Esc cancel";
    }
    if (planStep === "plan") {
      return "Enter create | Esc back";
    }
    return "Enter continue | Esc back";
  }, [isPlanning, planStep]);

  useInput((input, key) => {
    const command = input.toLowerCase();

    if (isPlanning) {
      if (key.escape) {
        if (planStep === "provider") {
          resetWizard();
          setMessage("Plan wizard canceled.");
        } else if (planStep === "model") {
          if (isSelectingFromList) {
            setIsSelectingFromList(false);
            setModelListIndex(0);
          } else {
            setPlanStep("provider");
          }
        } else if (planStep === "folder") {
          setPlanStep("model");
        } else if (planStep === "plan") {
          setPlanStep("folder");
        }
        return;
      }

      if (planStep === "provider") {
        if (key.upArrow) {
          setProviderIndex((index) => Math.max(0, index - 1));
          return;
        }
        if (key.downArrow) {
          setProviderIndex((index) =>
            Math.min(PROVIDERS.length - 1, index + 1)
          );
          return;
        }
        if (key.return) {
          setModelInput("");
          setModelSearch("");
          setModelOptions([]);
          setModelPage(0);
          setModelListIndex(0);
          setIsSelectingFromList(false);
          setPlanStep("model");
        }
        return;
      }

      if (planStep === "model") {
        if (key.pageDown && modelPage < modelPageCount - 1) {
          setModelPage((page) => page + 1);
          setIsSelectingFromList(true);
          setModelListIndex(0);
          return;
        }
        if (key.pageUp && modelPage > 0) {
          const previousPage = modelPage - 1;
          const previousPageStart = previousPage * MODELS_PER_PAGE;
          const previousPageSize = Math.min(
            MODELS_PER_PAGE,
            Math.max(0, allFilteredModels.length - previousPageStart)
          );
          setModelPage(previousPage);
          setIsSelectingFromList(true);
          setModelListIndex(Math.max(0, previousPageSize - 1));
          return;
        }

        if (key.tab && filteredModels.length > 0) {
          setIsSelectingFromList((current) => !current);
          if (!isSelectingFromList) {
            setModelListIndex(0);
          }
          return;
        }

        if (
          key.downArrow &&
          !isSelectingFromList &&
          filteredModels.length > 0
        ) {
          setIsSelectingFromList(true);
          setModelListIndex(0);
          return;
        }

        if (key.upArrow && isSelectingFromList) {
          if (modelListIndex === 0) {
            if (modelPage > 0) {
              const previousPage = modelPage - 1;
              const previousPageStart = previousPage * MODELS_PER_PAGE;
              const previousPageSize = Math.min(
                MODELS_PER_PAGE,
                Math.max(0, allFilteredModels.length - previousPageStart)
              );
              setModelPage(previousPage);
              setModelListIndex(Math.max(0, previousPageSize - 1));
            } else {
              setIsSelectingFromList(false);
            }
          } else {
            setModelListIndex((index) => index - 1);
          }
          return;
        }

        if (key.downArrow && isSelectingFromList) {
          if (modelListIndex >= filteredModels.length - 1) {
            if (modelPage < modelPageCount - 1) {
              setModelPage((page) => page + 1);
              setModelListIndex(0);
            }
          } else {
            setModelListIndex((index) =>
              Math.min(filteredModels.length - 1, index + 1)
            );
          }
          return;
        }
      }

      if (key.return) {
        if (planStep === "model") {
          if (isSelectingFromList && filteredModels.length > 0) {
            setModelInput(filteredModels[modelListIndex]);
          } else {
            setModelInput(modelSearch.trim());
          }
          setIsSelectingFromList(false);
          setModelListIndex(0);
          setModelSearch("");
          setPlanStep("folder");
          return;
        }
        if (planStep === "folder") {
          setPlanStep("plan");
          return;
        }
        if (planStep === "plan") {
          createPlanFromWizard().catch(() => undefined);
        }
      }
      return;
    }

    if (key.escape) {
      setScreen("dashboard");
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((index) => Math.min(specs.length - 1, index + 1));
      return;
    }

    if (command === "r") {
      refreshSpecs().catch(() => undefined);
      setMessage("Refreshed specs");
      return;
    }

    if (command === "p") {
      startWizard();
      return;
    }

    if (key.return && specs.length === 0) {
      startWizard();
      return;
    }

    if (command === "1") {
      setArtifact("proposal");
      return;
    }
    if (command === "2") {
      setArtifact("requirements");
      return;
    }
    if (command === "3") {
      setArtifact("design");
      return;
    }
    if (command === "4") {
      setArtifact("tasks");
      return;
    }

    if (!selectedSpec) {
      if (command === "i" || command === "a" || command === "t") {
        setMessage("No spec selected. Press 'p' to open plan wizard.");
      }
      return;
    }

    if (command === "i") {
      const runImplement = async () => {
        try {
          const { runSpecCLI } = await loadSpecModule();
          await runSpecCLI(["implement", selectedSpec.metadata.slug]);
          setMessage(`Implemented ${selectedSpec.metadata.slug}`);
          await refreshSpecs();
        } catch (implementError) {
          setError(
            implementError instanceof Error
              ? implementError.message
              : String(implementError)
          );
        }
      };
      runImplement().catch(() => undefined);
      return;
    }

    if (command === "a") {
      const runArchive = async () => {
        try {
          const { SpecManager } = await loadSpecModule();
          const manager = new SpecManager(process.cwd());
          await manager.init();
          const loaded = await manager.load(selectedSpec.metadata.slug, false);
          await manager.archive(loaded);
          setMessage(`Archived ${selectedSpec.metadata.slug}`);
          await refreshSpecs();
        } catch (archiveError) {
          setError(
            archiveError instanceof Error
              ? archiveError.message
              : String(archiveError)
          );
        }
      };
      runArchive().catch(() => undefined);
      return;
    }

    if (command === "t") {
      const cycleStatus = async () => {
        try {
          const { SpecManager } = await loadSpecModule();
          const manager = new SpecManager(process.cwd());
          await manager.init();
          const loaded = await manager.load(selectedSpec.metadata.slug);
          const order: SpecStatus[] = [
            "draft",
            "ready",
            "implementing",
            "done",
          ];
          const currentIndex = order.indexOf(loaded.metadata.status);
          const nextStatus =
            currentIndex < 0 || currentIndex === order.length - 1
              ? order[0]
              : order[currentIndex + 1];
          await manager.updateStatus(loaded, nextStatus, true);
          setMessage(
            `Status updated: ${loaded.metadata.slug} -> ${nextStatus}`
          );
          await refreshSpecs();
        } catch (statusError) {
          setError(
            statusError instanceof Error
              ? statusError.message
              : String(statusError)
          );
        }
      };
      cycleStatus().catch(() => undefined);
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Specs
      </Text>

      {wizardHeader ? <Text color="yellow">{wizardHeader}</Text> : null}
      {message ? (
        <Text color="green" wrap="truncate-end">
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text color="red" wrap="truncate-end">
          Error: {error}
        </Text>
      ) : null}

      {isPlanning ? (
        <Box borderStyle="single" flexDirection="column" gap={1} padding={1}>
          <Box flexDirection="column">
            <Text color="gray" wrap="truncate-end">
              Provider: {selectedProviderLabel}
            </Text>
            <Text color="gray" wrap="truncate-end">
              Model: {selectedModelLabel}
            </Text>
            <Text color="gray" wrap="truncate-end">
              Folder: {folderInput || "-"}
            </Text>
          </Box>

          {planStep === "provider" ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color="cyan">
                Choose provider
              </Text>
              <Box flexDirection="column" paddingLeft={2}>
                {PROVIDERS.map((provider, index) => (
                  <Box flexDirection="row" gap={1} key={provider.id}>
                    <Text color={index === providerIndex ? "yellow" : "gray"}>
                      {index === providerIndex ? ">" : " "}
                    </Text>
                    <Text color={index === providerIndex ? "white" : "gray"}>
                      {provider.label}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}

          {planStep === "model" ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color="cyan">
                Choose model
              </Text>

              <Box borderStyle="single" padding={1}>
                <TextInput
                  focus={!isSelectingFromList}
                  onChange={handleModelSearchChange}
                  placeholder="e.g. claude-sonnet-4, gpt-4.1, etc."
                  value={modelSearch}
                />
              </Box>

              {loadingModels ? (
                <Text color="gray" dimColor>
                  Loading models...
                </Text>
              ) : (
                <>
                  <Text color="gray" dimColor>
                    {`Found: ${modelOptions.length} | Matches: ${allFilteredModels.length}`}
                  </Text>
                  {allFilteredModels.length > MODELS_PER_PAGE && (
                    <Text color="gray" dimColor>
                      {`Page ${modelPage + 1}/${modelPageCount}`}
                    </Text>
                  )}
                </>
              )}

              <Box
                borderStyle="single"
                flexDirection="column"
                height={MODEL_LIST_HEIGHT}
                overflow="hidden"
                padding={1}
              >
                {filteredModels.length === 0 ? (
                  <Text color="gray" dimColor>
                    No matching models.
                  </Text>
                ) : (
                  filteredModels.map((model, index) => (
                    <Box
                      flexDirection="row"
                      gap={1}
                      key={`${model}-${modelPageStart + index}`}
                    >
                      <Text
                        color={
                          isSelectingFromList && index === modelListIndex
                            ? "yellow"
                            : "gray"
                        }
                      >
                        {isSelectingFromList && index === modelListIndex
                          ? ">"
                          : " "}
                      </Text>
                      <Text
                        bold={isSelectingFromList && index === modelListIndex}
                        color={
                          isSelectingFromList && index === modelListIndex
                            ? "white"
                            : "gray"
                        }
                        wrap="truncate-end"
                      >
                        {model}
                      </Text>
                    </Box>
                  ))
                )}
              </Box>

              {isSelectingFromList ? (
                <>
                  <Text color="gray" dimColor>
                    Up/Down: navigate
                  </Text>
                  <Text color="gray" dimColor wrap="truncate-end">
                    PgUp/PgDn: page | Enter: select | Tab: search
                  </Text>
                </>
              ) : modelSearch.trim() ? (
                <>
                  <Text color="gray" dimColor>
                    Down: enter list | Enter: use custom
                  </Text>
                  <Text color="gray" dimColor wrap="truncate-end">
                    PgUp/PgDn: page | Tab: results
                  </Text>
                </>
              ) : (
                <>
                  <Text color="gray" dimColor wrap="truncate-end">
                    Type to search | Enter: skip (default)
                  </Text>
                  <Text color="gray" dimColor wrap="truncate-end">
                    Down: enter list | Tab: results
                  </Text>
                </>
              )}
            </Box>
          ) : null}

          {planStep === "folder" ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color="cyan">
                Choose folder
              </Text>
              <Box borderStyle="single" padding={1}>
                <TextInput
                  focus={true}
                  onChange={setFolderInput}
                  placeholder="/absolute/path/to/workspace"
                  value={folderInput}
                />
              </Box>
            </Box>
          ) : null}

          {planStep === "plan" ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color="cyan">
                Write plan description
              </Text>
              <Box borderStyle="single" padding={1}>
                <TextInput
                  focus={true}
                  onChange={setPlanInput}
                  placeholder="Describe what should be planned and generated"
                  value={planInput}
                />
              </Box>
            </Box>
          ) : null}

          {wizardHelp ? <Text color="gray">{wizardHelp}</Text> : null}
        </Box>
      ) : (
        <Box borderStyle="single" flexDirection="row" height={22}>
          <Box
            borderRight={true}
            borderStyle="single"
            flexDirection="column"
            paddingX={1}
            width={42}
          >
            {specs.length === 0 ? (
              <Box flexDirection="column">
                <Text color="gray">No specs available.</Text>
                <Text color="yellow">Press 'p' to start plan wizard.</Text>
              </Box>
            ) : (
              specs.map((spec, index) => (
                <Box flexDirection="row" gap={1} key={spec.metadata.slug}>
                  <Text color={index === selectedIndex ? "yellow" : "gray"}>
                    {index === selectedIndex ? ">" : " "}
                  </Text>
                  <Box flexDirection="column">
                    <Text
                      bold={index === selectedIndex}
                      color={index === selectedIndex ? "white" : "gray"}
                    >
                      {spec.metadata.slug}
                    </Text>
                    <Text color="gray" dimColor>
                      {spec.metadata.status} •{" "}
                      {new Date(spec.metadata.updatedAt).toLocaleString()}
                    </Text>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          <Box flexDirection="column" flexGrow={1} paddingX={1}>
            <Text color="cyan">Preview ({artifact})</Text>
            <Text color="gray">{"-".repeat(56)}</Text>
            <Text>{preview}</Text>
          </Box>
        </Box>
      )}

      {isPlanning ? (
        <Text color="gray" wrap="truncate-end">
          Flow: provider to model to folder to plan description
        </Text>
      ) : (
        <>
          <Text color="gray" wrap="truncate-end">
            Up/Down navigate | 1 proposal | 2 requirements | 3 design | 4 tasks
          </Text>
          <Text color="gray" wrap="truncate-end">
            r refresh | p plan wizard | i implement | a archive | t next status
            | Esc back
          </Text>
        </>
      )}
    </Box>
  );
}

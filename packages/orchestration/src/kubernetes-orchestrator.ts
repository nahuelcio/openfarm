import * as k8s from "@kubernetes/client-node";
import { DEFAULT_PORTS } from "@openfarm/core";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";

// Constants for Pod configuration
const POD_ACTIVE_DEADLINE_SECONDS = 3600; // 1 hour timeout for Pod execution
const POD_READY_TIMEOUT_MS = 120_000; // 2 minutes timeout for Pod to become ready

/**
 * Validates Kubernetes Pod name against RFC 1123 subdomain rules
 * Kubernetes resource names must match: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$
 * Maximum length: 63 characters for pod names
 */
function validatePodName(podName: string): string {
  if (!podName || typeof podName !== "string") {
    throw new Error("Pod name must be a non-empty string");
  }

  // Kubernetes pod names must be lowercase and follow RFC 1123 subdomain rules
  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(podName)) {
    throw new Error(
      `Invalid pod name: ${podName}. Pod names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  // Kubernetes pod names have a maximum length of 63 characters
  const K8S_POD_NAME_MAX_LENGTH = 63;
  if (podName.length > K8S_POD_NAME_MAX_LENGTH) {
    throw new Error(
      `Pod name exceeds maximum length of ${K8S_POD_NAME_MAX_LENGTH} characters`
    );
  }

  return podName;
}

/**
 * Validates Kubernetes namespace name against RFC 1123 subdomain rules
 * Kubernetes namespace names must match: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$
 * Maximum length: 253 characters
 */
function validateNamespace(namespace: string): string {
  if (!namespace || typeof namespace !== "string") {
    throw new Error("Namespace must be a non-empty string");
  }

  // Kubernetes namespace names must be lowercase and follow RFC 1123 subdomain rules
  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  if (!k8sNameRegex.test(namespace)) {
    throw new Error(
      `Invalid namespace: ${namespace}. Namespace names must be lowercase, start and end with alphanumeric characters, and can only contain lowercase letters, numbers, and hyphens.`
    );
  }

  // Kubernetes namespace names have a maximum length of 253 characters
  const K8S_NAMESPACE_MAX_LENGTH = 253;
  if (namespace.length > K8S_NAMESPACE_MAX_LENGTH) {
    throw new Error(
      `Namespace exceeds maximum length of ${K8S_NAMESPACE_MAX_LENGTH} characters`
    );
  }

  return namespace;
}

/**
 * Configuration for provisioning an ephemeral Pod
 */
export interface PodProvisionConfig {
  jobId: string;
  workItemId: string;
  repositoryUrl: string;
  authenticatedRepoUrl?: string; // URL with credentials for cloning
  image?: string; // Default: minions-farm-claude-code:latest
  cloneDepth?: number; // Default: 1
  npmCache?: boolean; // Default: true
  namespace?: string; // Default: default
  resources?: {
    cpu?: string; // Default: "1000m"
    memory?: string; // Default: "2Gi"
  };
  copilotApiUrl?: string; // Default: http://copilot-api:${DEFAULT_PORTS.COPILOT_API}/v1
  env?: Record<string, string>; // Additional environment variables
}

/**
 * Kubernetes orchestrator for managing ephemeral Pods.
 * Each Pod represents an isolated environment for a single task execution.
 */
export class KubernetesOrchestrator {
  private readonly k8sApi: k8s.CoreV1Api;
  private readonly secretsApi: k8s.CoreV1Api;
  private readonly namespace: string;

  constructor(namespace = "default") {
    try {
      const kc = new k8s.KubeConfig();

      // Priority 1: Use KUBECONFIG environment variable if set
      const kubeconfigPath = process.env.KUBECONFIG;
      if (kubeconfigPath) {
        try {
          kc.loadFromFile(kubeconfigPath);
          logger.info(
            { kubeconfigPath },
            "Loaded kubeconfig from KUBECONFIG environment variable"
          );
        } catch (fileError) {
          const fileErrorMsg =
            fileError instanceof Error ? fileError.message : String(fileError);
          logger.warn(
            { kubeconfigPath, error: fileErrorMsg },
            "Failed to load kubeconfig from KUBECONFIG environment variable, trying default locations"
          );
          // Fall through to try default loading
        }
      }

      // Priority 2: Try in-cluster config (when running as a Pod)
      if (!(kubeconfigPath && kc.getCurrentCluster())) {
        try {
          kc.loadFromCluster();
          logger.info("Loaded in-cluster Kubernetes config");
        } catch (clusterError) {
          // Not running in-cluster (e.g., ENOENT for serviceaccount files)
          // This is expected when not running inside a Pod, so log as debug and continue
          const errorMsg =
            clusterError instanceof Error
              ? clusterError.message
              : String(clusterError);
          if (
            errorMsg.includes("ENOENT") ||
            errorMsg.includes("serviceaccount")
          ) {
            // Expected when not running in-cluster, continue silently
            logger.debug(
              { error: errorMsg },
              "Not running in-cluster (expected when running outside a Pod)"
            );
          } else {
            // Unexpected error, but continue to default loading
            logger.debug(
              { error: errorMsg },
              "Failed to load in-cluster config, trying default location"
            );
          }

          if (kubeconfigPath) {
            // If KUBECONFIG was set but failed, throw error
            throw new Error(
              `Failed to load kubeconfig from ${kubeconfigPath}. ` +
                "Please verify the file exists and is accessible."
            );
          }
        }
      }

      // Priority 3: Try default locations (~/.kube/config or default)
      if (!kc.getCurrentCluster()) {
        kc.loadFromDefault();
        logger.info("Loaded kubeconfig from default location");
      }

      this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      this.secretsApi = kc.makeApiClient(k8s.CoreV1Api);
      this.namespace = namespace;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const kubeconfigPath = process.env.KUBECONFIG;

      // Provide more helpful error messages
      let helpfulMessage = `Failed to initialize Kubernetes client: ${errorMsg}`;

      if (kubeconfigPath) {
        helpfulMessage += `\n  - KUBECONFIG is set to: ${kubeconfigPath}`;
        helpfulMessage +=
          "\n  - Please verify the file exists and is accessible from the container";
        helpfulMessage +=
          "\n  - If running in Docker, ensure the kubeconfig file is mounted as a volume";
      } else {
        helpfulMessage += "\n  - KUBECONFIG environment variable is not set";
        helpfulMessage +=
          "\n  - Trying to load from default location (~/.kube/config)";
        helpfulMessage += "\n  - If running in Docker, you may need to:";
        helpfulMessage +=
          "\n    1. Set KUBECONFIG environment variable pointing to a mounted kubeconfig file";
        helpfulMessage +=
          "\n    2. Mount the kubeconfig file as a volume in docker-compose.yml";
        helpfulMessage += `\n    3. Or ensure the container has access to the host's kubeconfig`;
      }

      helpfulMessage += `\n  - Original error: ${errorMsg}`;

      throw new Error(helpfulMessage);
    }
  }

  /**
   * Creates a Kubernetes Secret for storing authenticated repository URL
   */
  private async createGitRepoSecret(
    secretName: string,
    namespace: string,
    repoUrl: string,
    config: PodProvisionConfig
  ): Promise<void> {
    const secret: k8s.V1Secret = {
      metadata: {
        name: secretName,
        namespace,
        labels: {
          app: "minions-farm",
          "job-id": config.jobId,
          "work-item-id": config.workItemId,
        },
      },
      type: "Opaque",
      stringData: {
        "repo-url": repoUrl,
      },
    };

    try {
      // Try to create the secret, or update if it already exists
      await this.secretsApi.createNamespacedSecret(namespace, secret);
      logger.info(
        { secretName, namespace },
        "Created Kubernetes Secret for authenticated repo URL"
      );
    } catch (secretError) {
      // If secret already exists, update it
      if (
        secretError instanceof k8s.HttpError &&
        secretError.statusCode === 409
      ) {
        await this.secretsApi.replaceNamespacedSecret(
          secretName,
          namespace,
          secret
        );
        logger.info(
          { secretName, namespace },
          "Updated existing Kubernetes Secret for authenticated repo URL"
        );
      } else {
        throw secretError;
      }
    }
  }

  /**
   * Builds Pod volumes and volume mounts
   */
  private buildPodVolumes(npmCache: boolean): {
    volumes: k8s.V1Volume[];
    volumeMounts: k8s.V1VolumeMount[];
  } {
    const volumes: k8s.V1Volume[] = [
      {
        name: "workspace",
        emptyDir: {},
      },
    ];

    const volumeMounts: k8s.V1VolumeMount[] = [
      {
        name: "workspace",
        mountPath: "/workspace",
      },
    ];

    if (npmCache) {
      volumes.push({
        name: "npm-cache",
        persistentVolumeClaim: {
          claimName: "npm-cache-pvc",
        },
      });
      volumeMounts.push({
        name: "npm-cache",
        mountPath: "/root/.npm",
      });
    }

    return { volumes, volumeMounts };
  }

  /**
   * Builds environment variables for the main container
   */
  private buildMainContainerEnv(config: PodProvisionConfig): k8s.V1EnvVar[] {
    return [
      {
        name: "COPILOT_API_URL",
        value:
          config.copilotApiUrl ||
          `http://copilot-api:${DEFAULT_PORTS.COPILOT_API}/v1`,
      },
      {
        name: "WORK_DIR",
        value: "/workspace",
      },
      ...Object.entries(config.env || {}).map(([key, value]) => ({
        name: key,
        value,
      })),
    ];
  }

  /**
   * Builds the init container for cloning the repository
   */
  private buildInitContainer(
    repoName: string,
    cloneDepth: number,
    repoUrl: string,
    hasCredentials: boolean,
    secretName?: string
  ): k8s.V1Container {
    const initContainerEnv: k8s.V1EnvVar[] = [
      {
        name: "GIT_CLONE_DEPTH",
        value: String(cloneDepth),
      },
      {
        name: "GIT_REPO_NAME",
        value: repoName,
      },
    ];

    // Use Secret for authenticated URL, or plain value for public repos
    if (hasCredentials && secretName) {
      initContainerEnv.push({
        name: "GIT_REPO_URL",
        valueFrom: {
          secretKeyRef: {
            name: secretName,
            key: "repo-url",
          },
        },
      });
    } else {
      initContainerEnv.push({
        name: "GIT_REPO_URL",
        value: repoUrl,
      });
    }

    // Add GIT_TERMINAL_PROMPT if using authenticated URL
    if (hasCredentials) {
      initContainerEnv.push({
        name: "GIT_TERMINAL_PROMPT",
        value: "0",
      });
    }

    return {
      name: "git-clone",
      image: "alpine/git:latest",
      command: [
        "sh",
        "-c",
        'git clone --depth "$GIT_CLONE_DEPTH" "$GIT_REPO_URL" "/workspace/$GIT_REPO_NAME" || exit 1',
      ],
      volumeMounts: [
        {
          name: "workspace",
          mountPath: "/workspace",
        },
      ],
      env: initContainerEnv,
    };
  }

  /**
   * Builds the main container for running the coding engine
   */
  private buildMainContainer(
    image: string,
    repoName: string,
    env: k8s.V1EnvVar[],
    volumeMounts: k8s.V1VolumeMount[],
    config: PodProvisionConfig
  ): k8s.V1Container {
    return {
      name: "claude-code",
      image,
      imagePullPolicy: "IfNotPresent",
      command: ["tail", "-f", "/dev/null"], // Keep container running
      workingDir: `/workspace/${repoName}`,
      env,
      volumeMounts,
      resources: {
        limits: {
          cpu: config.resources?.cpu || "1000m",
          memory: config.resources?.memory || "2Gi",
        },
        requests: {
          cpu: "500m",
          memory: "1Gi",
        },
      },
    };
  }

  /**
   * Provisions an ephemeral Pod for task execution.
   * The Pod includes:
   * - EmptyDir volume for the cloned repository
   * - PVC for npm cache (if enabled)
   * - Init container to clone the repository
   *
   * @param config - Pod provision configuration
   * @returns Result with pod name
   */
  async provisionPod(config: PodProvisionConfig): Promise<Result<string>> {
    // Validate inputs
    if (!config.jobId || typeof config.jobId !== "string") {
      return err(new Error("jobId is required and must be a string"));
    }
    if (!config.workItemId || typeof config.workItemId !== "string") {
      return err(new Error("workItemId is required and must be a string"));
    }
    if (!config.repositoryUrl || typeof config.repositoryUrl !== "string") {
      return err(new Error("repositoryUrl is required and must be a string"));
    }
    if (config.image && typeof config.image !== "string") {
      return err(new Error("image must be a string if provided"));
    }

    const podName = `minion-${config.jobId}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    const image = config.image || "minions-farm-claude-code:latest";
    const cloneDepth = config.cloneDepth ?? 1;
    const npmCache = config.npmCache ?? true;
    const namespace = config.namespace || this.namespace;
    const repoUrl = config.authenticatedRepoUrl || config.repositoryUrl;
    const hasCredentials =
      !!config.authenticatedRepoUrl &&
      config.authenticatedRepoUrl !== config.repositoryUrl;

    try {
      // Extract repo name from URL
      const repoName =
        config.repositoryUrl.split("/").pop()?.replace(".git", "") ||
        `repo-${config.workItemId}`;

      // Create Kubernetes Secret for authenticated URL if credentials are present
      let secretName: string | undefined;
      if (hasCredentials) {
        secretName = `git-repo-secret-${config.jobId}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-");
        await this.createGitRepoSecret(secretName, namespace, repoUrl, config);
      }

      // Build volumes and volume mounts
      const { volumes, volumeMounts } = this.buildPodVolumes(npmCache);

      // Build environment variables for main container
      const env = this.buildMainContainerEnv(config);

      // Build init container for cloning repository
      const initContainer = this.buildInitContainer(
        repoName,
        cloneDepth,
        repoUrl,
        hasCredentials,
        secretName
      );

      // Build main container
      const container = this.buildMainContainer(
        image,
        repoName,
        env,
        volumeMounts,
        config
      );

      // Pod spec
      const pod: k8s.V1Pod = {
        metadata: {
          name: podName,
          namespace,
          labels: {
            app: "minions-farm",
            "job-id": config.jobId,
            "work-item-id": config.workItemId,
          },
        },
        spec: {
          restartPolicy: "Never",
          initContainers: [initContainer],
          containers: [container],
          volumes,
          activeDeadlineSeconds: POD_ACTIVE_DEADLINE_SECONDS,
        },
      };

      await this.k8sApi.createNamespacedPod(namespace, pod);

      // Wait for Pod to be ready (init containers complete + container running)
      await this.waitForPodReady(namespace, podName, POD_READY_TIMEOUT_MS);

      logger.info({ podName, namespace }, "Pod provisioned successfully");
      return ok(podName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({ podName, error: errorMsg }, "Failed to provision Pod");

      // Provide more helpful error messages for common connection issues
      if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ENOTFOUND")) {
        return err(
          new Error(
            "Failed to provision Pod: Cannot connect to Kubernetes cluster. " +
              "Please verify that: 1) Kubernetes cluster is running, 2) kubeconfig is properly configured, " +
              "3) KUBECONFIG environment variable points to the correct config file. " +
              `Original error: ${errorMsg}`
          )
        );
      }

      return err(new Error(`Failed to provision Pod: ${errorMsg}`));
    }
  }

  /**
   * Lists Pods by job ID label.
   *
   * @param jobId - Job ID to search for
   * @param namespace - Pod namespace (default: this.namespace)
   * @returns Result with array of pod names
   */
  async listPodsByJobId(
    jobId: string,
    namespace?: string
  ): Promise<Result<string[]>> {
    const ns = validateNamespace(namespace || this.namespace);

    try {
      const response = await this.k8sApi.listNamespacedPod(
        ns,
        undefined,
        undefined,
        undefined,
        undefined,
        `job-id=${jobId}`
      );
      const podNames = response.body.items
        .map((pod) => pod.metadata?.name || "")
        .filter(Boolean);
      return ok(podNames);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // If Kubernetes is not available (e.g., ENOENT for serviceaccount files, ECONNREFUSED, etc.),
      // log as warning instead of error since this is expected when not running in Kubernetes
      if (
        errorMsg.includes("ENOENT") ||
        errorMsg.includes("serviceaccount") ||
        errorMsg.includes("ECONNREFUSED") ||
        errorMsg.includes("ENOTFOUND")
      ) {
        logger.debug(
          { jobId, namespace: ns, error: errorMsg },
          "Kubernetes not available, assuming no active pods"
        );
        // Return empty array instead of error when Kubernetes is not available
        return ok([]);
      }
      logger.error(
        { jobId, namespace: ns, error: errorMsg },
        "Failed to list Pods by job ID"
      );
      return err(new Error(`Failed to list Pods by job ID: ${errorMsg}`));
    }
  }

  /**
   * Checks if a Pod exists and is in a running state.
   *
   * @param podName - Name of the Pod to check
   * @param namespace - Pod namespace (default: this.namespace)
   * @returns Result with boolean indicating if pod exists and is running
   */
  async isPodActive(
    podName: string,
    namespace?: string
  ): Promise<Result<boolean>> {
    const validatedPodName = validatePodName(podName);
    const ns = validateNamespace(namespace || this.namespace);

    try {
      const response = await this.k8sApi.readNamespacedPod(
        validatedPodName,
        ns
      );
      const pod = response.body;
      const phase = pod.status?.phase;

      // Pod is considered active if it's in Running or Pending phase
      const isActive = phase === "Running" || phase === "Pending";
      return ok(isActive);
    } catch (error) {
      // If Pod doesn't exist (404), it's not active
      if (
        error instanceof k8s.HttpError &&
        (error.statusCode === 404 || error.statusCode === 409)
      ) {
        return ok(false);
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        { podName: validatedPodName, namespace: ns, error: errorMsg },
        "Failed to check Pod status"
      );
      return err(new Error(`Failed to check Pod status: ${errorMsg}`));
    }
  }

  /**
   * Checks if any Pod is active for a given job ID.
   * Useful for determining if worktrees should be created on host or inside pod.
   *
   * @param jobId - Job ID to check
   * @param namespace - Pod namespace (default: this.namespace)
   * @returns Result with boolean indicating if any pod is active for this job
   */
  async hasActivePodForJob(
    jobId: string,
    namespace?: string
  ): Promise<Result<boolean>> {
    const podsResult = await this.listPodsByJobId(jobId, namespace);

    if (!podsResult.ok || podsResult.value.length === 0) {
      return ok(false);
    }

    // Check if any of the pods is active
    for (const podName of podsResult.value) {
      const activeResult = await this.isPodActive(podName, namespace);
      if (activeResult.ok && activeResult.value) {
        return ok(true);
      }
    }

    return ok(false);
  }

  /**
   * Executes a command inside the Pod using kubectl exec.
   *
   * @param podName - Name of the Pod
   * @param command - Command to execute (array of strings)
   * @param namespace - Pod namespace (default: this.namespace)
   * @returns Result with command output
   */
  async executeCommand(
    podName: string,
    command: string[],
    namespace?: string
  ): Promise<Result<{ stdout: string; stderr: string }>> {
    return this.executeCommandViaKubectl(podName, command, namespace);
  }

  /**
   * Destroys the ephemeral Pod.
   *
   * @param podName - Name of the Pod to destroy
   * @param namespace - Pod namespace (default: this.namespace)
   * @returns Result indicating success or failure
   */
  async destroyPod(podName: string, namespace?: string): Promise<Result<void>> {
    // Validate input to prevent command injection
    const validatedPodName = validatePodName(podName);
    const ns = validateNamespace(namespace || this.namespace);

    try {
      await this.k8sApi.deleteNamespacedPod(validatedPodName, ns);
      logger.info(
        { podName: validatedPodName, namespace: ns },
        "Pod destroyed successfully"
      );
      return ok(undefined);
    } catch (error) {
      // If Pod doesn't exist, consider it already destroyed
      if (
        error instanceof k8s.HttpError &&
        (error.statusCode === 404 || error.statusCode === 409)
      ) {
        logger.warn(
          { podName: validatedPodName, namespace: ns },
          "Pod not found (may already be destroyed)"
        );
        return ok(undefined);
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        { podName: validatedPodName, namespace: ns, error: errorMsg },
        "Failed to destroy Pod"
      );
      return err(new Error(`Failed to destroy Pod: ${errorMsg}`));
    }
  }

  /**
   * Waits for a Pod to be ready (init containers complete + container running).
   *
   * @param namespace - Pod namespace
   * @param podName - Pod name
   * @param timeoutMs - Timeout in milliseconds (default: 120000)
   * @private
   */
  private async waitForPodReady(
    namespace: string,
    podName: string,
    timeoutMs = POD_READY_TIMEOUT_MS
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.k8sApi.readNamespacedPod(
          podName,
          namespace
        );
        const pod = response.body;

        // Check if init containers completed
        const initStatuses = pod.status?.initContainerStatuses || [];
        const allInitReady =
          initStatuses.length > 0 &&
          initStatuses.every((status) => status.ready);

        // Check if main container is running
        const containerStatuses = pod.status?.containerStatuses || [];
        const containerReady =
          containerStatuses.length > 0 &&
          containerStatuses.some(
            (status) => status.name === "claude-code" && status.ready
          );

        // Check for pod phase
        const phase = pod.status?.phase;
        if (phase === "Failed" || phase === "Unknown") {
          throw new Error(`Pod entered ${phase} phase`);
        }

        if (allInitReady && containerReady && phase === "Running") {
          return;
        }
      } catch (error) {
        // If pod doesn't exist yet, continue waiting
        if (error instanceof k8s.HttpError && error.statusCode === 404) {
          // Continue waiting
        } else {
          throw error;
        }
      }

      // Wait 2 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(
      `Pod ${podName} did not become ready within ${timeoutMs}ms`
    );
  }

  /**
   * Alternative implementation using kubectl exec via spawn for simpler command execution.
   * This method is more straightforward for simple commands but less integrated with K8s API.
   *
   * @param podName - Name of the Pod
   * @param command - Command to execute (array of strings)
   * @param namespace - Pod namespace (default: this.namespace)
   * @returns Result with command output
   */
  async executeCommandViaKubectl(
    podName: string,
    command: string[],
    namespace?: string
  ): Promise<Result<{ stdout: string; stderr: string }>> {
    // Validate input to prevent command injection
    const validatedPodName = validatePodName(podName);
    const ns = validateNamespace(namespace || this.namespace);
    const { spawn } = await import("node:child_process");

    return new Promise((resolve) => {
      const kubectlArgs = [
        "exec",
        validatedPodName,
        "-n",
        ns,
        "-c",
        "claude-code",
        "--",
        ...command,
      ];

      const kubectlProcess = spawn("kubectl", kubectlArgs);

      let stdout = "";
      let stderr = "";

      kubectlProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      kubectlProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      kubectlProcess.on("close", (code) => {
        if (code === 0) {
          resolve(ok({ stdout, stderr }));
        } else {
          resolve(
            err(
              new Error(`kubectl exec failed with exit code ${code}: ${stderr}`)
            )
          );
        }
      });

      kubectlProcess.on("error", (error) => {
        resolve(err(new Error(`Failed to execute kubectl: ${error.message}`)));
      });
    });
  }
}

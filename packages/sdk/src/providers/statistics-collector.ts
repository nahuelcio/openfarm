const createRequestId = (): string =>
	globalThis.crypto?.randomUUID?.() ??
	`req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export interface ExecutionStatistics {
	creditsSpent: number;
	toolCalls: number;
	model: string;
	filesChanged: number;
	processesCreated: number;
	requestId: string;
	tokensInput: number;
	tokensOutput: number;
	duration: number;
}

export class StatisticsCollector {
	private toolCalls: number = 0;
	private filesChanged: number = 0;
	private processesCreated: number = 0;
	private startTime: number = Date.now();
	private requestId: string = createRequestId();

	constructor(private model: string) {}

	recordToolCall(): void {
		this.toolCalls++;
	}

	recordFileChanged(): void {
		this.filesChanged++;
	}

	recordProcessCreated(): void {
		this.processesCreated++;
	}

	getStatistics(
		tokensInput: number,
		tokensOutput: number,
		overrides?: {
			creditsSpent?: number;
			duration?: number;
		},
	): ExecutionStatistics {
		const duration = overrides?.duration ?? Date.now() - this.startTime;
		const creditsSpent =
			typeof overrides?.creditsSpent === "number" &&
			Number.isFinite(overrides.creditsSpent)
				? Number(overrides.creditsSpent.toFixed(6))
				: 0;

		return {
			creditsSpent,
			toolCalls: this.toolCalls,
			model: this.model,
			filesChanged: this.filesChanged,
			processesCreated: this.processesCreated,
			requestId: this.requestId,
			tokensInput,
			tokensOutput,
			duration,
		};
	}
}

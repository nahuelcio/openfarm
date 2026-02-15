import { randomUUID } from "crypto";

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
	private requestId: string = randomUUID();

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

	getStatistics(tokensInput: number, tokensOutput: number): ExecutionStatistics {
		const duration = Date.now() - this.startTime;
		const creditsSpent = this.calculateCredits(tokensInput, tokensOutput);

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

	private calculateCredits(inputTokens: number, outputTokens: number): number {
		// Basic credit calculation - can be enhanced with provider-specific pricing
		const inputCost = inputTokens * 0.000001; // $0.001 per 1M input tokens
		const outputCost = outputTokens * 0.000002; // $0.002 per 1M output tokens
		return Number((inputCost + outputCost).toFixed(6));
	}
}

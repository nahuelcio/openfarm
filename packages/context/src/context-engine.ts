import { createHash } from "node:crypto";
import {
  FileStructureExtractor,
  GitExtractor,
  PackageJsonExtractor,
} from "./extractors/index";
import { AgentsFormatter } from "./formatters/index";
import {
  ArchitectureSynthesizer,
  ConventionsSynthesizer,
} from "./synthesizers/index";
import type {
  PrimingOptions,
  RawRepositoryData,
  RepoPrimingInput,
  RepoPrimingResult,
  SynthesizedData,
} from "./types/index";

export class ContextEngine {
  private readonly extractors = [
    new GitExtractor(),
    new PackageJsonExtractor(),
    new FileStructureExtractor(),
  ];

  private readonly synthesizers = [
    new ArchitectureSynthesizer(),
    new ConventionsSynthesizer(),
  ];

  private readonly formatter = new AgentsFormatter();

  async generate(input: RepoPrimingInput): Promise<RepoPrimingResult> {
    const { analysisResult, projectPath, options } = input;

    const rawData = await this.extractRawData(projectPath);
    const synthesized = await this.synthesize(analysisResult, rawData, options);
    const output = this.formatter.format(synthesized);

    return {
      context: synthesized.context,
      guidelines: synthesized.guidelines,
      conventions: synthesized.conventions,
      output,
      metadata: {
        generatedAt: new Date().toISOString(),
        analysisVersion: "1.0.0",
        inputHash: this.hashInput(analysisResult),
        sectionsGenerated: Object.keys(synthesized),
      },
    };
  }

  private async extractRawData(
    projectPath: string
  ): Promise<RawRepositoryData> {
    const results = await Promise.all(
      this.extractors.map((extractor) => extractor.extract(projectPath))
    );

    const rawData: RawRepositoryData = {};

    for (const result of results) {
      Object.assign(rawData, result);
    }

    return rawData;
  }

  private async synthesize(
    analysisResult: RepoPrimingInput["analysisResult"],
    rawData: RawRepositoryData,
    options: PrimingOptions | undefined
  ): Promise<SynthesizedData> {
    const synthesized: SynthesizedData = {
      context: {} as typeof synthesized.context,
      guidelines: {
        coreRules: [],
        personality: {
          tone: "professional",
          communicationStyle: "",
          values: [],
        },
        expertise: [],
        principles: [],
      },
      conventions: {
        commitStandards: { format: "", allowedTypes: [], examples: [] },
        codeStyle: {
          formatting: "",
          linting: "",
          typescriptLevel: "strict",
          documentation: "",
        },
        testingConventions: { framework: "", pattern: "", coverageTarget: 0 },
        namingConventions: [],
        architectureRules: [],
      },
    };

    for (const synthesizer of this.synthesizers) {
      await synthesizer.synthesize(
        analysisResult,
        rawData,
        options,
        synthesized
      );
    }

    return synthesized;
  }

  private hashInput(data: unknown): string {
    return createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex")
      .slice(0, 16);
  }
}

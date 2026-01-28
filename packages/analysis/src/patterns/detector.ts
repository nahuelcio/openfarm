import type { CodePattern } from "../types";
import { AntiPatternsDetector } from "./anti-patterns";
import { DesignPatternsDetector } from "./design-patterns";

export class PatternDetector {
  private readonly designPatternsDetector: DesignPatternsDetector;
  private readonly antiPatternsDetector: AntiPatternsDetector;

  constructor() {
    this.designPatternsDetector = new DesignPatternsDetector();
    this.antiPatternsDetector = new AntiPatternsDetector();
  }

  async detectPatterns(projectPath: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    try {
      // 1. Design patterns
      const designPatterns =
        await this.designPatternsDetector.detectDesignPatterns(projectPath);
      patterns.push(...designPatterns);

      // 2. Anti-patterns
      const antiPatterns =
        await this.antiPatternsDetector.detectAntiPatterns(projectPath);
      patterns.push(...antiPatterns);
    } catch (error) {
      console.error("Error detecting patterns:", error);
    }

    return patterns;
  }
}

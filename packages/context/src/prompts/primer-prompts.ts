export const PRIMER_SYSTEM_MESSAGE = `You are an expert codebase analyst specialized in generating comprehensive documentation for AI coding assistants.

Your task is to analyze the repository and generate a detailed AGENTS.md file that will serve as the primary context for AI assistants working on this codebase.

Use the available tools (glob, view, grep) extensively to explore the codebase thoroughly. Be detailed and specific - a comprehensive context document is far more valuable than a brief one.

Output ONLY the final markdown content, no explanations or meta-commentary.`;

export const PRIMER_USER_PROMPT = `Analyze this codebase at $repoPath and generate a comprehensive AGENTS.md file.

# Phase 1: Deep Exploration

Use tools systematically to gather information:

1. **Existing Documentation**
   - glob for **/{.github/copilot-instructions.md,AGENTS.md,CLAUDE.md,.cursorrules,.claude.md,CONTRIBUTING.md}
   - view any found files to understand existing conventions

2. **Tech Stack & Dependencies**
   - view package.json, requirements.txt, Cargo.toml, go.mod, build.gradle, pom.xml
   - Check tsconfig.json, eslint, prettier configs for language/tooling setup
   - Identify frameworks (React, Vue, Next.js, Express, Django, etc.)

3. **Architecture & Patterns**
   - List main directories and understand their purposes
   - Identify monorepo structure (lerna.json, pnpm-workspace.yaml, workspaces in package.json)
   - Look for architectural patterns (MVC, clean architecture, microservices, etc.)
   - Check for state management (Redux, Zustand, Pinia, etc.)
   - Identify API style (REST, GraphQL, tRPC, gRPC)

4. **Code Organization**
   - Find entry points (main.ts, index.ts, app.py, main.go)
   - Check for common directories: src/, lib/, components/, routes/, api/, utils/, tests/
   - Understand module structure and import conventions

5. **Development Workflow**
   - Extract scripts from package.json (dev, build, test, lint, format)
   - Look for Makefile, justfile, or task runners
   - Check CI/CD configs (.github/workflows/, .gitlab-ci.yml, .circleci/)

6. **Testing Strategy**
   - Find test files and frameworks (jest, vitest, pytest, go test)
   - Check test configuration and coverage setup
   - Identify testing patterns (unit, integration, e2e)

7. **Database & Data Layer**
   - Look for schema files, migrations, ORMs (Prisma, TypeORM, SQLAlchemy)
   - Check for database clients and connection setup

8. **Code Style & Conventions**
   - Examine actual code files to identify:
     - Naming conventions (camelCase, snake_case, PascalCase)
     - File naming patterns
     - Import/export patterns
     - Error handling style
     - Async patterns (callbacks, promises, async/await)

# Phase 2: Generate Comprehensive AGENTS.md

Create a detailed markdown document with these sections:

## 1. Project Overview
- What the project does (2-3 sentences)
- Primary purpose and use cases
- Target audience or deployment context

## 2. Tech Stack
List all major technologies with versions where relevant:
- Language(s) and version
- Framework(s) and key libraries
- Build tools and package manager
- Testing frameworks
- Linting/formatting tools
- Database(s) and ORM
- State management
- API technologies

## 3. Architecture
- Overall architecture pattern (monolith, microservices, serverless, etc.)
- Directory structure explanation
- Key architectural decisions
- Module boundaries and relationships
- Data flow patterns

## 4. Development Workflow

### Setup
\`\`\`bash
# Commands to get started
npm install
cp .env.example .env
\`\`\`

### Common Commands
\`\`\`bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
\`\`\`

### Environment Variables
List required environment variables and their purposes

## 5. Code Conventions

### File Naming
- Describe the naming convention (kebab-case, PascalCase, etc.)
- Provide examples: \`UserProfile.tsx\`, \`user-service.ts\`

### Code Style
- Naming: functions (camelCase), classes (PascalCase), constants (UPPER_CASE)
- Import order and organization
- Error handling patterns
- Async/await vs promises
- Type usage (TypeScript strict mode, any, unknown)

### Testing Patterns
- Where tests live (\`__tests__/\`, \`.test.ts\`, \`_test.go\`)
- Test naming conventions
- Mocking approach

## 6. Key Files & Directories

Provide a comprehensive map:

\`\`\`
src/
├── components/      # React components, organized by feature
├── lib/             # Shared utilities and helpers
├── api/             # API route handlers
├── types/           # TypeScript type definitions
├── db/              # Database schemas and migrations
└── tests/           # Test files
\`\`\`

Explain the purpose of each major directory and notable files.

## 7. Common Patterns

### Creating a New Feature
Step-by-step guide with file locations and naming

### API Endpoints
Show the pattern for creating new endpoints with example

### Database Queries
Show typical query patterns and ORM usage

### Error Handling
Show the standard error handling approach

## 8. Critical Rules & Gotchas

List project-specific rules that MUST be followed:
- "Always use X pattern for Y"
- "Never import Z from A"
- "Database migrations must be reversible"
- "All API endpoints must include error handling"
- Performance considerations
- Security requirements

## 9. External Integrations

List any external services, APIs, or integrations:
- Authentication providers
- Payment processors
- Cloud services (AWS, GCP, Azure)
- Third-party APIs

## 10. Useful Context

- Git workflow (main/master, feature branches, PR requirements)
- Code review expectations
- Breaking change protocol
- Deployment process overview

---

**Guidelines for Generation:**
- Be SPECIFIC and DETAILED - this is a reference document
- Include EXAMPLES wherever possible
- Use CODE BLOCKS for commands and code snippets
- Organize hierarchically with clear headings
- Focus on ACTIONABLE information
- Prioritize information an AI assistant needs to write code effectively
- If information is not available, omit that section rather than guessing
- Aim for 150-300 lines of comprehensive, well-organized content

Output ONLY the markdown content for AGENTS.md. Do not include markdown code fences around the entire document.`;

export const EVALUATOR_SYSTEM_MESSAGE =
  "You are a strict evaluator. Return JSON with keys: verdict (pass|fail|unknown), score (0-100), rationale. Do not include any other text.";

export const EVALUATOR_JUDGE_PROMPT =
  "Evaluate which response best matches the expectation.\n\nExpectation: $expectation\n\nResponse A (without custom instructions):\n$withoutInstructions\n\nResponse B (with custom instructions):\n$withInstructions\n\nReturn JSON only.";

export function buildUserPrompt(repoPath: string): string {
  return PRIMER_USER_PROMPT.replace("$repoPath", repoPath);
}

export function buildJudgePrompt(
  expectation: string,
  withoutInstructions: string,
  withInstructions: string
): string {
  return EVALUATOR_JUDGE_PROMPT.replace("$expectation", expectation)
    .replace("$withoutInstructions", withoutInstructions)
    .replace("$withInstructions", withInstructions);
}

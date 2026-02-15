# @openfarm/plan-review

Interactive plan review and annotation system for OpenFarm agents. Provides visual UI for reviewing, annotating, and approving/rejecting agent plans.

## Features

- **Visual Plan Review**: Interactive UI for reviewing agent implementation plans
- **Rich Annotations**: Support for comments, deletions, insertions, and replacements
- **Agent Integration**: Seamless hooks for agent-system integration
- **Workflow Management**: Approval/rejection workflows with feedback loops
- **Persistent Storage**: SQLite-based storage for plans and annotations
- **Export/Import**: JSON-based plan and review data exchange

## Installation

```bash
bun add @openfarm/plan-review
```

## Quick Start

```typescript
import { PlanManager, PlanReviewer, PlanReviewWorkflow } from '@openfarm/plan-review';

// Create a plan manager
const planManager = new PlanManager({
  storagePath: './plans.db',
  autoSave: true,
});

// Create a plan from agent output
const plan = planManager.createPlanFromText(agentOutput, 'agent-123');

// Set up a reviewer in the browser
const container = document.getElementById('plan-reviewer');
const reviewer = new PlanReviewer(container, {
  plan,
  annotations: [],
  onAnnotationCreate: (annotation) => {
    planManager.getAnnotationManager().createAnnotation(annotation);
  },
  onPlanApprove: () => {
    planManager.approvePlan(plan.id, 'reviewer-name');
  },
  onPlanReject: (feedback) => {
    planManager.rejectPlan(plan.id, 'reviewer-name', feedback);
  },
});

// Set up workflow automation
const workflow = new PlanReviewWorkflow(planManager, {
  autoApprove: false,
  requireAllResolved: true,
  maxUnresolvedAnnotations: 0,
});
```

## Agent Integration

```typescript
import { createPlanReviewHook, integratePlanReviewHook } from '@openfarm/plan-review';
import { ClaudeCodeAgent } from '@openfarm/agent-system';

// Create plan review hook
const hook = createPlanReviewHook({
  planManager,
  autoExtract: true,
  onPlanCreated: (plan) => {
    console.log('New plan created:', plan.title);
  },
  onPlanReviewed: (planId, status) => {
    console.log(`Plan ${planId} reviewed with status: ${status}`);
  },
});

// Integrate with agent plugin
const agent = integratePlanReviewHook(
  new ClaudeCodeAgent(),
  planManager
);

// Agent execution will now automatically extract plans
await agent.execute('Create a plan for implementing user authentication');
```

## Core Components

### PlanManager

Manages plans, reviews, and annotations with persistent storage.

```typescript
const manager = new PlanManager({ storagePath: './plans.db' });

// Create plans
const plan = manager.createPlanFromMarkdown(markdownText);

// Manage reviews
const review = manager.createReview(plan.id, 'reviewer-name');
manager.approvePlan(plan.id, 'reviewer-name');

// Query plans
const pendingPlans = manager.getPlansByStatus('pending');
const agentPlans = manager.getPlansByAgent('agent-123');
```

### PlanParser

Parses plan content from various formats (markdown, text, agent output).

```typescript
import { PlanParser } from '@openfarm/plan-review';

// Parse from markdown
const plan = PlanParser.parseMarkdown(markdownText);

// Extract from agent output
const plan = PlanParser.extractPlanFromAgentOutput(agentOutput);

// Convert back to markdown
const markdown = PlanParser.planToMarkdown(plan);
```

### AnnotationManager

Manages plan annotations with CRUD operations and filtering.

```typescript
const annotationManager = manager.getAnnotationManager();

// Create annotations
const annotation = annotationManager.createAnnotation({
  type: 'comment',
  planId: plan.id,
  content: 'This step needs more detail',
  author: 'reviewer-name',
});

// Query annotations
const unresolved = annotationManager.getAnnotations({
  planId: plan.id,
  resolved: false,
});

// Update annotations
annotationManager.updateAnnotation(annotation.id, { resolved: true });
```

### PlanReviewWorkflow

Automates review workflows with configurable approval criteria.

```typescript
const workflow = new PlanReviewWorkflow(planManager, {
  autoApprove: false,
  requireAllResolved: true,
  maxUnresolvedAnnotations: 0,
});

// Review a plan
const result = await workflow.reviewPlan(plan.id, 'reviewer-name');

// Check approval criteria
const criteria = workflow.checkApprovalCriteria(plan.id);

// Process agent feedback
await workflow.processAgentFeedback(plan.id, 'agent-123', feedback);
```

## UI Components

### PlanReviewer

Main UI component for plan review with annotation support.

```typescript
const reviewer = new PlanReviewer(container, {
  plan,
  annotations,
  onAnnotationCreate: (annotation) => { /* handle */ },
  onAnnotationUpdate: (id, updates) => { /* handle */ },
  onPlanApprove: () => { /* handle */ },
  onPlanReject: (feedback) => { /* handle */ },
});
```

### PlanDisplay

Read-only display component for plans.

```typescript
const display = new PlanDisplay(container, {
  plan,
  annotations,
  onStepSelect: (stepId) => { /* handle */ },
  onTextSelect: (selection) => { /* handle */ },
});
```

### AnnotationPanel

Sidebar component for managing annotations.

```typescript
const panel = new AnnotationPanel(container, {
  annotations,
  onAnnotationCreate: (type, content) => { /* handle */ },
  onAnnotationResolve: (id) => { /* handle */ },
});
```

## Data Models

### Plan

```typescript
interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  status: 'pending' | 'approved' | 'rejected' | 'in-review';
  createdAt: Date;
  updatedAt: Date;
  agentId?: string;
  metadata?: Record<string, unknown>;
}
```

### Annotation

```typescript
interface Annotation {
  id: string;
  type: 'delete' | 'insert' | 'replace' | 'comment';
  planId: string;
  stepId?: string;
  content: string;
  position?: {
    start: number;
    end: number;
    line?: number;
  };
  author: string;
  createdAt: Date;
  resolved: boolean;
}
```

## Configuration

### PlanManager Options

```typescript
interface PlanManagerOptions {
  storagePath?: string;    // SQLite database path
  autoSave?: boolean;      // Auto-save changes
}
```

### Workflow Options

```typescript
interface WorkflowOptions {
  autoApprove?: boolean;           // Auto-approve when criteria met
  requireAllResolved?: boolean;    // Require all annotations resolved
  maxUnresolvedAnnotations?: number; // Max unresolved annotations
  reviewers?: string[];            // Approved reviewers list
}
```

## License

MIT

# Implementation Plan: Task Loop YAML Refactor

## Overview

This implementation plan breaks down the refactor into incremental steps that build on each other. Each step validates core functionality early through code and tests. The approach is surgical—touching only what's necessary to eliminate hardcoded logic and delegate to YAML-driven workflows.

## Tasks

- [x] 1. Create YAML configuration files and schema definitions
  - Create packages/task-loop/config/ directory structure
  - Create selection.yaml with priority scores and strategies
  - Create prompts.yaml with template definitions
  - Create completion.yaml with detection markers
  - Create workflows.yaml with workflow references
  - Define TypeScript interfaces for each config schema
  - _Requirements: 6.1, 6.2, 2.3, 2.4, 3.3, 4.3, 4.4_

- [x] 1.1 Write unit tests for YAML configuration structure
  - Test that all required configuration files exist
  - Test that each file has required fields
  - Test YAML parsing for each configuration file
  - _Requirements: 6.1, 6.2_

- [ ] 2. Implement ConfigLoader component
  - [ ] 2.1 Create config-loader.ts with ConfigLoader class
    - Implement loadSelectionConfig() method
    - Implement loadPromptConfig() method
    - Implement loadCompletionConfig() method
    - Implement loadWorkflowConfig() method
    - Add YAML parsing with error handling
    - Add schema validation for each config type
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ] 2.2 Write property test for configuration loading
    - **Property 1: Configuration Loading from YAML**
    - **Validates: Requirements 1.1, 1.3, 2.2, 3.2, 4.2**

  - [ ] 2.3 Write unit tests for ConfigLoader error handling
    - Test missing configuration file error
    - Test invalid YAML syntax error
    - Test schema validation errors
    - Test clear error messages
    - _Requirements: 6.5_

- [ ] 3. Refactor TaskSelector to use loaded configuration
  - [ ] 3.1 Modify TaskSelector constructor to accept SelectionConfig
    - Remove hardcoded PRIORITY_SCORES constant
    - Load priority scores from SelectionConfig
    - Update sortByPriority() to use loaded scores
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 3.2 Write property test for configuration-driven selection
    - **Property 5: Configuration-Driven Behavior (selection)**
    - **Validates: Requirements 2.5**

  - [ ] 3.3 Write unit tests for TaskSelector with loaded config
    - Test priority sorting with custom scores
    - Test strategy selection from config
    - Test edge cases (missing priorities, invalid strategies)
    - _Requirements: 2.2, 2.5_

- [ ] 4. Refactor PromptBuilder to use loaded configuration
  - [ ] 4.1 Modify PromptBuilder constructor to accept PromptConfig
    - Remove hardcoded template constants (DEFAULT_TEMPLATE, SIMPLE_TEMPLATE, DETAILED_TEMPLATE)
    - Load templates from PromptConfig
    - Update build() to load template from config
    - Add template validation (check if template exists)
    - _Requirements: 3.1, 3.2, 3.5_

  - [ ] 4.2 Write property test for template variable substitution
    - **Property 3: Template Variable Substitution**
    - **Validates: Requirements 3.4, 3.5**

  - [ ] 4.3 Write unit tests for PromptBuilder with loaded config
    - Test template loading from config
    - Test variable substitution
    - Test template not found error
    - Test fallback to default template
    - _Requirements: 3.2, 3.5_

- [ ] 5. Refactor CompletionDetector to use loaded configuration
  - [ ] 5.1 Modify CompletionDetector constructor to accept CompletionConfig
    - Remove hardcoded DEFAULT_COMPLETION_MARKERS constant
    - Remove hardcoded DEFAULT_FAILURE_MARKERS constant
    - Load markers from CompletionConfig
    - Update detectHeuristic() to use loaded markers
    - Update isFatalError() to use loaded patterns
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ] 5.2 Write property test for configuration-driven completion detection
    - **Property 5: Configuration-Driven Behavior (completion)**
    - **Validates: Requirements 4.5**

  - [ ] 5.3 Write unit tests for CompletionDetector with loaded config
    - Test completion detection with custom markers
    - Test failure detection with custom markers
    - Test fatal error detection with custom patterns
    - _Requirements: 4.2, 4.5_

- [ ] 6. Checkpoint - Ensure all configuration loading tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Refactor workflow-adapter to delegate to workflow engine
  - [ ] 7.1 Remove hardcoded StepExecutor from executeGitSetup()
    - Remove hardcoded git.branch logic
    - Remove hardcoded git.worktree logic
    - Change workflowId from "git-setup" to "oneshot_with_git"
    - Delegate all execution to workflow engine
    - Extract workflow context from result
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 7.2 Write property test for git operation context flow
    - **Property 7: Git Operation Context Flow**
    - **Validates: Requirements 1.5**

  - [ ] 7.3 Write unit tests for workflow delegation
    - Test that executeGitSetup calls workflow engine
    - Test that correct workflow ID is used
    - Test that context is properly extracted
    - Test error handling when workflow fails
    - _Requirements: 1.1, 1.3, 1.5_

- [ ] 8. Refactor orchestrator to use ConfigLoader
  - [ ] 8.1 Add ConfigLoader initialization in constructor
    - Create ConfigLoader instance
    - Load all configurations in run() method
    - Pass loaded configs to TaskSelector, PromptBuilder, CompletionDetector
    - _Requirements: 6.3_

  - [ ] 8.2 Refactor executeTask() to delegate to workflow engine
    - Remove custom execution logic
    - Create WorkflowExecutionRequest
    - Call executeWorkflow() from workflow engine
    - Convert WorkflowExecutionResult to TaskExecutionResult
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ] 8.3 Write property test for workflow engine delegation
    - **Property 2: Workflow Engine Delegation**
    - **Validates: Requirements 5.2, 5.3, 5.5**

  - [ ] 8.4 Write unit tests for orchestrator refactor
    - Test configuration loading on startup
    - Test workflow engine delegation
    - Test task status updates from workflow results
    - _Requirements: 5.2, 5.3, 5.5, 6.3_

- [ ] 9. Implement workflow validation and discovery
  - [ ] 9.1 Add workflow validation to ConfigLoader
    - Validate workflow IDs in workflows.yaml exist
    - Load available workflows from packages/core/workflows/
    - Implement workflow discovery (scan directory)
    - Add validation before workflow execution
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 9.2 Write property test for workflow reference validation
    - **Property 4: Workflow Reference Validation**
    - **Validates: Requirements 1.4, 8.2, 8.3, 8.4**

  - [ ] 9.3 Write property test for workflow discovery
    - **Property 6: Workflow Discovery**
    - **Validates: Requirements 8.1, 8.5**

  - [ ] 9.4 Write unit tests for workflow validation
    - Test validation of existing workflows
    - Test error for non-existent workflows
    - Test workflow discovery
    - Test clear error messages
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [ ] 10. Checkpoint - Ensure all workflow delegation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Verify backward compatibility
  - [ ] 11.1 Run existing task-loop tests
    - Verify all existing tests still pass
    - Verify API signatures unchanged
    - Verify behavior matches pre-refactor version
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 11.2 Write property test for API backward compatibility
    - **Property 10: API Backward Compatibility**
    - **Validates: Requirements 7.4**

  - [ ] 11.3 Write unit tests for API compatibility
    - Test TaskLoopOrchestrator public methods exist
    - Test TaskLoopConfig interface unchanged
    - Test runTaskLoop and resumeTaskLoop signatures
    - Test exported types remain compatible
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 12. Add comprehensive error handling
  - [ ] 12.1 Implement error classes
    - Create ConfigurationError class
    - Create WorkflowNotFoundError class
    - Create TemplateNotFoundError class
    - Add error context and helpful messages
    - _Requirements: 6.5, 8.4_

  - [ ] 12.2 Write unit tests for error handling
    - Test ConfigurationError scenarios
    - Test WorkflowNotFoundError scenarios
    - Test TemplateNotFoundError scenarios
    - Test error message clarity
    - _Requirements: 6.5, 8.4_

- [ ] 13. Integration testing
  - [ ] 13.1 Write integration tests for complete task execution flow
    - Test end-to-end task execution with YAML config
    - Test git operations through workflow delegation
    - Test task selection with loaded configuration
    - Test prompt building with loaded templates
    - Test completion detection with loaded markers
    - _Requirements: 1.1, 2.2, 3.2, 4.2, 5.2_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive refactor with full test coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The refactor maintains backward compatibility throughout
- All hardcoded logic is eliminated by delegating to YAML configuration and workflow engine
